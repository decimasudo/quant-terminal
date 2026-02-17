use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use sha3::{Digest, Sha3_256};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NFTMetadata {
    pub name: String,
    pub description: String,
    pub image: String,
    pub attributes: Vec<NFTAttribute>,
    pub external_url: Option<String>,
    pub animation_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NFTAttribute {
    pub trait_type: String,
    pub value: String,
    pub display_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NFT {
    pub token_id: String,
    pub contract_address: String,
    pub owner: String,
    pub creator: String,
    pub metadata: NFTMetadata,
    pub royalty_percentage: Decimal,
    pub created_at: DateTime<Utc>,
    pub is_listed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ListingType {
    FixedPrice,
    Auction,
    DutchAuction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ListingStatus {
    Active,
    Sold,
    Cancelled,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Listing {
    pub id: String,
    pub token_id: String,
    pub contract_address: String,
    pub seller: String,
    pub listing_type: ListingType,
    pub price: Decimal,
    pub currency: String,
    pub status: ListingStatus,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub highest_bid: Option<Decimal>,
    pub highest_bidder: Option<String>,
    pub min_price: Option<Decimal>,
    pub price_decrement: Option<Decimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bid {
    pub id: String,
    pub listing_id: String,
    pub bidder: String,
    pub amount: Decimal,
    pub currency: String,
    pub timestamp: DateTime<Utc>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub token_id: String,
    pub contract_address: String,
    pub from_address: String,
    pub to_address: String,
    pub price: Option<Decimal>,
    pub currency: String,
    pub transaction_type: String,
    pub timestamp: DateTime<Utc>,
    pub royalty_amount: Option<Decimal>,
    pub platform_fee: Option<Decimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub address: String,
    pub name: String,
    pub symbol: String,
    pub creator: String,
    pub total_supply: u64,
    pub floor_price: Option<Decimal>,
    pub volume_traded: Decimal,
    pub created_at: DateTime<Utc>,
    pub verified: bool,
}

#[derive(Debug, Clone)]
pub struct NFTMarketplace {
    nfts: HashMap<String, NFT>,
    listings: HashMap<String, Listing>,
    bids: HashMap<String, Vec<Bid>>,
    transactions: Vec<Transaction>,
    collections: HashMap<String, Collection>,
    user_balances: HashMap<String, HashMap<String, Decimal>>,
    platform_fee_percentage: Decimal,
    listing_counter: u64,
    bid_counter: u64,
    transaction_counter: u64,
}

impl NFTMarketplace {
    pub fn new() -> Self {
        Self {
            nfts: HashMap::new(),
            listings: HashMap::new(),
            bids: HashMap::new(),
            transactions: Vec::new(),
            collections: HashMap::new(),
            user_balances: HashMap::new(),
            platform_fee_percentage: Decimal::new(25, 3), // 2.5%
            listing_counter: 0,
            bid_counter: 0,
            transaction_counter: 0,
        }
    }

    pub fn mint_nft(&mut self, contract_address: &str, creator: &str, metadata: NFTMetadata,
                    royalty_percentage: Decimal) -> Result<String, String> {
        let token_id = self.generate_token_id(contract_address, creator, &metadata);

        if self.nfts.contains_key(&token_id) {
            return Err("NFT already exists".to_string());
        }

        let nft = NFT {
            token_id: token_id.clone(),
            contract_address: contract_address.to_string(),
            owner: creator.to_string(),
            creator: creator.to_string(),
            metadata,
            royalty_percentage,
            created_at: Utc::now(),
            is_listed: false,
        };

        self.nfts.insert(token_id.clone(), nft);

        // Update collection stats
        if let Some(collection) = self.collections.get_mut(contract_address) {
            collection.total_supply += 1;
        }

        Ok(token_id)
    }

    pub fn create_collection(&mut self, name: String, symbol: String, creator: String) -> Result<String, String> {
        let address = self.generate_contract_address(&creator, &name);

        if self.collections.contains_key(&address) {
            return Err("Collection already exists".to_string());
        }

        let collection = Collection {
            address: address.clone(),
            name,
            symbol,
            creator,
            total_supply: 0,
            floor_price: None,
            volume_traded: Decimal::ZERO,
            created_at: Utc::now(),
            verified: false,
        };

        self.collections.insert(address.clone(), collection);
        Ok(address)
    }

    pub fn create_listing(&mut self, token_id: &str, seller: &str, listing_type: ListingType,
                         price: Decimal, currency: String, duration_days: Option<u32>) -> Result<String, String> {
        let nft = self.nfts.get_mut(token_id)
            .ok_or_else(|| "NFT not found".to_string())?;

        if nft.owner != seller {
            return Err("Not the owner".to_string());
        }

        if nft.is_listed {
            return Err("NFT already listed".to_string());
        }

        self.listing_counter += 1;
        let listing_id = format!("listing_{}", self.listing_counter);

        let expires_at = duration_days.map(|days| Utc::now() + chrono::Duration::days(days as i64));

        let listing = Listing {
            id: listing_id.clone(),
            token_id: token_id.to_string(),
            contract_address: nft.contract_address.clone(),
            seller: seller.to_string(),
            listing_type,
            price,
            currency,
            status: ListingStatus::Active,
            created_at: Utc::now(),
            expires_at,
            highest_bid: None,
            highest_bidder: None,
            min_price: None,
            price_decrement: None,
        };

        self.listings.insert(listing_id.clone(), listing);
        nft.is_listed = true;

        // Initialize bids vector for this listing
        self.bids.insert(listing_id.clone(), Vec::new());

        Ok(listing_id)
    }

    pub fn place_bid(&mut self, listing_id: &str, bidder: &str, amount: Decimal, currency: &str) -> Result<String, String> {
        let listing = self.listings.get_mut(listing_id)
            .ok_or_else(|| "Listing not found".to_string())?;

        if listing.status != ListingStatus::Active {
            return Err("Listing not active".to_string());
        }

        if listing.seller == bidder {
            return Err("Cannot bid on own listing".to_string());
        }

        if currency != &listing.currency {
            return Err("Currency mismatch".to_string());
        }

        match listing.listing_type {
            ListingType::FixedPrice => {
                if amount != listing.price {
                    return Err("Bid must match fixed price".to_string());
                }
            }
            ListingType::Auction => {
                if let Some(highest_bid) = listing.highest_bid {
                    if amount <= highest_bid {
                        return Err("Bid must be higher than current highest bid".to_string());
                    }
                } else if amount < listing.price {
                    return Err("Bid must be at least the starting price".to_string());
                }
            }
            ListingType::DutchAuction => {
                // Dutch auction logic would be implemented here
                return Err("Dutch auction bidding not implemented".to_string());
            }
        }

        // Check bidder balance
        let bidder_balance = self.get_user_balance(bidder, currency);
        if bidder_balance < amount {
            return Err("Insufficient balance".to_string());
        }

        self.bid_counter += 1;
        let bid_id = format!("bid_{}", self.bid_counter);

        let bid = Bid {
            id: bid_id.clone(),
            listing_id: listing_id.to_string(),
            bidder: bidder.to_string(),
            amount,
            currency: currency.to_string(),
            timestamp: Utc::now(),
            is_active: true,
        };

        // Update listing with new highest bid
        if matches!(listing.listing_type, ListingType::Auction) {
            listing.highest_bid = Some(amount);
            listing.highest_bidder = Some(bidder.to_string());
        }

        self.bids.get_mut(listing_id).unwrap().push(bid);

        Ok(bid_id)
    }

    pub fn accept_bid(&mut self, listing_id: &str, bid_id: &str, seller: &str) -> Result<String, String> {
        let listing = self.listings.get_mut(listing_id)
            .ok_or_else(|| "Listing not found".to_string())?;

        if listing.seller != seller {
            return Err("Not the seller".to_string());
        }

        let bids = self.bids.get_mut(listing_id)
            .ok_or_else(|| "Bids not found".to_string())?;

        let bid_index = bids.iter().position(|b| b.id == bid_id && b.is_active)
            .ok_or_else(|| "Bid not found or not active".to_string())?;

        let bid = &bids[bid_index];

        // Transfer NFT ownership
        let nft = self.nfts.get_mut(&listing.token_id)
            .ok_or_else(|| "NFT not found".to_string())?;

        let previous_owner = nft.owner.clone();
        nft.owner = bid.bidder.clone();
        nft.is_listed = false;

        // Calculate fees
        let royalty_amount = bid.amount * nft.royalty_percentage;
        let platform_fee = bid.amount * self.platform_fee_percentage;
        let seller_amount = bid.amount - royalty_amount - platform_fee;

        // Update balances
        self.update_balance(&bid.bidder, &bid.currency, self.get_user_balance(&bid.bidder, &bid.currency) - bid.amount);
        self.update_balance(&nft.creator, &bid.currency, self.get_user_balance(&nft.creator, &bid.currency) + royalty_amount);
        self.update_balance(seller, &bid.currency, self.get_user_balance(seller, &bid.currency) + seller_amount);

        // Record transaction
        self.transaction_counter += 1;
        let transaction = Transaction {
            id: format!("tx_{}", self.transaction_counter),
            token_id: listing.token_id.clone(),
            contract_address: listing.contract_address.clone(),
            from_address: previous_owner,
            to_address: bid.bidder.clone(),
            price: Some(bid.amount),
            currency: bid.currency.clone(),
            transaction_type: "sale".to_string(),
            timestamp: Utc::now(),
            royalty_amount: Some(royalty_amount),
            platform_fee: Some(platform_fee),
        };

        self.transactions.push(transaction);

        // Update listing status
        listing.status = ListingStatus::Sold;

        // Deactivate all other bids
        for b in bids.iter_mut() {
            if b.id != bid_id {
                b.is_active = false;
            }
        }

        // Update collection stats
        if let Some(collection) = self.collections.get_mut(&listing.contract_address) {
            collection.volume_traded += bid.amount;
            if collection.floor_price.is_none() || Some(bid.amount) < collection.floor_price {
                collection.floor_price = Some(bid.amount);
            }
        }

        Ok(format!("tx_{}", self.transaction_counter))
    }

    pub fn buy_now(&mut self, listing_id: &str, buyer: &str) -> Result<String, String> {
        let listing = self.listings.get(listing_id)
            .ok_or_else(|| "Listing not found".to_string())?;

        if listing.status != ListingStatus::Active {
            return Err("Listing not active".to_string());
        }

        if listing.seller == buyer {
            return Err("Cannot buy own listing".to_string());
        }

        if !matches!(listing.listing_type, ListingType::FixedPrice) {
            return Err("Only fixed price listings support buy now".to_string());
        }

        // Check buyer balance
        let buyer_balance = self.get_user_balance(buyer, &listing.currency);
        if buyer_balance < listing.price {
            return Err("Insufficient balance".to_string());
        }

        // Transfer NFT ownership
        let nft = self.nfts.get_mut(&listing.token_id)
            .ok_or_else(|| "NFT not found".to_string())?;

        let previous_owner = nft.owner.clone();
        nft.owner = buyer.to_string();
        nft.is_listed = false;

        // Calculate fees
        let royalty_amount = listing.price * nft.royalty_percentage;
        let platform_fee = listing.price * self.platform_fee_percentage;
        let seller_amount = listing.price - royalty_amount - platform_fee;

        // Update balances
        self.update_balance(buyer, &listing.currency, buyer_balance - listing.price);
        self.update_balance(&nft.creator, &listing.currency, self.get_user_balance(&nft.creator, &listing.currency) + royalty_amount);
        self.update_balance(&listing.seller, &listing.currency, self.get_user_balance(&listing.seller, &listing.currency) + seller_amount);

        // Record transaction
        self.transaction_counter += 1;
        let transaction = Transaction {
            id: format!("tx_{}", self.transaction_counter),
            token_id: listing.token_id.clone(),
            contract_address: listing.contract_address.clone(),
            from_address: previous_owner,
            to_address: buyer.to_string(),
            price: Some(listing.price),
            currency: listing.currency.clone(),
            transaction_type: "sale".to_string(),
            timestamp: Utc::now(),
            royalty_amount: Some(royalty_amount),
            platform_fee: Some(platform_fee),
        };

        self.transactions.push(transaction);

        // Update listing status
        let listing = self.listings.get_mut(listing_id).unwrap();
        listing.status = ListingStatus::Sold;

        // Update collection stats
        if let Some(collection) = self.collections.get_mut(&listing.contract_address) {
            collection.volume_traded += listing.price;
            if collection.floor_price.is_none() || Some(listing.price) < collection.floor_price {
                collection.floor_price = Some(listing.price);
            }
        }

        Ok(format!("tx_{}", self.transaction_counter))
    }

    pub fn cancel_listing(&mut self, listing_id: &str, seller: &str) -> Result<(), String> {
        let listing = self.listings.get_mut(listing_id)
            .ok_or_else(|| "Listing not found".to_string())?;

        if listing.seller != seller {
            return Err("Not the seller".to_string());
        }

        if listing.status != ListingStatus::Active {
            return Err("Listing not active".to_string());
        }

        listing.status = ListingStatus::Cancelled;

        // Mark NFT as not listed
        if let Some(nft) = self.nfts.get_mut(&listing.token_id) {
            nft.is_listed = false;
        }

        // Deactivate all bids
        if let Some(bids) = self.bids.get_mut(listing_id) {
            for bid in bids.iter_mut() {
                bid.is_active = false;
            }
        }

        Ok(())
    }

    pub fn transfer_nft(&mut self, token_id: &str, from: &str, to: &str) -> Result<String, String> {
        let nft = self.nfts.get_mut(token_id)
            .ok_or_else(|| "NFT not found".to_string())?;

        if nft.owner != from {
            return Err("Not the owner".to_string());
        }

        if nft.is_listed {
            return Err("Cannot transfer listed NFT".to_string());
        }

        let previous_owner = nft.owner.clone();
        nft.owner = to.to_string();

        // Record transaction
        self.transaction_counter += 1;
        let transaction = Transaction {
            id: format!("tx_{}", self.transaction_counter),
            token_id: token_id.to_string(),
            contract_address: nft.contract_address.clone(),
            from_address: previous_owner,
            to_address: to.to_string(),
            price: None,
            currency: "NATIVE".to_string(),
            transaction_type: "transfer".to_string(),
            timestamp: Utc::now(),
            royalty_amount: None,
            platform_fee: None,
        };

        self.transactions.push(transaction);

        Ok(format!("tx_{}", self.transaction_counter))
    }

    pub fn get_nft(&self, token_id: &str) -> Result<NFT, String> {
        self.nfts.get(token_id)
            .cloned()
            .ok_or_else(|| "NFT not found".to_string())
    }

    pub fn get_listing(&self, listing_id: &str) -> Result<Listing, String> {
        self.listings.get(listing_id)
            .cloned()
            .ok_or_else(|| "Listing not found".to_string())
    }

    pub fn get_collection(&self, address: &str) -> Result<Collection, String> {
        self.collections.get(address)
            .cloned()
            .ok_or_else(|| "Collection not found".to_string())
    }

    pub fn get_user_nfts(&self, owner: &str) -> Vec<NFT> {
        self.nfts.values()
            .filter(|nft| nft.owner == owner)
            .cloned()
            .collect()
    }

    pub fn get_active_listings(&self) -> Vec<Listing> {
        self.listings.values()
            .filter(|listing| listing.status == ListingStatus::Active)
            .cloned()
            .collect()
    }

    pub fn get_collection_listings(&self, contract_address: &str) -> Vec<Listing> {
        self.listings.values()
            .filter(|listing| listing.contract_address == contract_address && listing.status == ListingStatus::Active)
            .cloned()
            .collect()
    }

    pub fn get_listing_bids(&self, listing_id: &str) -> Result<Vec<Bid>, String> {
        self.bids.get(listing_id)
            .cloned()
            .ok_or_else(|| "Listing not found".to_string())
    }

    pub fn get_recent_transactions(&self, limit: usize) -> Vec<Transaction> {
        self.transactions.iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    pub fn get_user_balance(&self, user: &str, currency: &str) -> Decimal {
        self.user_balances
            .get(user)
            .and_then(|balances| balances.get(currency))
            .copied()
            .unwrap_or(Decimal::ZERO)
    }

    pub fn update_balance(&mut self, user: &str, currency: &str, amount: Decimal) {
        self.user_balances
            .entry(user.to_string())
            .or_insert_with(HashMap::new)
            .insert(currency.to_string(), amount);
    }

    pub fn deposit_funds(&mut self, user: &str, currency: &str, amount: Decimal) {
        let current_balance = self.get_user_balance(user, currency);
        self.update_balance(user, currency, current_balance + amount);
    }

    pub fn withdraw_funds(&mut self, user: &str, currency: &str, amount: Decimal) -> Result<(), String> {
        let current_balance = self.get_user_balance(user, currency);
        if current_balance < amount {
            return Err("Insufficient balance".to_string());
        }
        self.update_balance(user, currency, current_balance - amount);
        Ok(())
    }

    fn generate_token_id(&self, contract_address: &str, creator: &str, metadata: &NFTMetadata) -> String {
        let mut hasher = Sha3_256::new();
        hasher.update(contract_address.as_bytes());
        hasher.update(creator.as_bytes());
        hasher.update(metadata.name.as_bytes());
        hasher.update(Utc::now().timestamp().to_string().as_bytes());
        let result = hasher.finalize();
        format!("{:x}", result)
    }

    fn generate_contract_address(&self, creator: &str, name: &str) -> String {
        let mut hasher = Sha3_256::new();
        hasher.update(creator.as_bytes());
        hasher.update(name.as_bytes());
        hasher.update(Utc::now().timestamp().to_string().as_bytes());
        let result = hasher.finalize();
        format!("0x{:x}", result)
    }

    pub fn get_market_stats(&self) -> HashMap<String, String> {
        let mut stats = HashMap::new();

        let total_nfts = self.nfts.len();
        stats.insert("total_nfts".to_string(), total_nfts.to_string());

        let total_collections = self.collections.len();
        stats.insert("total_collections".to_string(), total_collections.to_string());

        let active_listings = self.get_active_listings().len();
        stats.insert("active_listings".to_string(), active_listings.to_string());

        let total_volume: Decimal = self.transactions.iter()
            .filter_map(|tx| tx.price)
            .sum();
        stats.insert("total_volume".to_string(), total_volume.to_string());

        let total_transactions = self.transactions.len();
        stats.insert("total_transactions".to_string(), total_transactions.to_string());

        stats
    }

    pub fn get_top_collections(&self, limit: usize) -> Vec<Collection> {
        let mut collections: Vec<Collection> = self.collections.values().cloned().collect();
        collections.sort_by(|a, b| b.volume_traded.cmp(&a.volume_traded));
        collections.into_iter().take(limit).collect()
    }

    pub fn verify_collection(&mut self, address: &str) -> Result<(), String> {
        let collection = self.collections.get_mut(address)
            .ok_or_else(|| "Collection not found".to_string())?;

        collection.verified = true;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mint_nft() {
        let mut marketplace = NFTMarketplace::new();

        let metadata = NFTMetadata {
            name: "Test NFT".to_string(),
            description: "A test NFT".to_string(),
            image: "ipfs://test".to_string(),
            attributes: vec![],
            external_url: None,
            animation_url: None,
        };

        let result = marketplace.mint_nft("0x123", "creator1", metadata, Decimal::new(5, 2)); // 5%
        assert!(result.is_ok());
    }

    #[test]
    fn test_create_listing() {
        let mut marketplace = NFTMarketplace::new();

        let metadata = NFTMetadata {
            name: "Test NFT".to_string(),
            description: "A test NFT".to_string(),
            image: "ipfs://test".to_string(),
            attributes: vec![],
            external_url: None,
            animation_url: None,
        };

        let token_id = marketplace.mint_nft("0x123", "creator1", metadata, Decimal::new(5, 2)).unwrap();

        let result = marketplace.create_listing(&token_id, "creator1", ListingType::FixedPrice, Decimal::new(100, 0), "ETH".to_string(), Some(7));
        assert!(result.is_ok());
    }

    #[test]
    fn test_buy_now() {
        let mut marketplace = NFTMarketplace::new();

        let metadata = NFTMetadata {
            name: "Test NFT".to_string(),
            description: "A test NFT".to_string(),
            image: "ipfs://test".to_string(),
            attributes: vec![],
            external_url: None,
            animation_url: None,
        };

        let token_id = marketplace.mint_nft("0x123", "creator1", metadata, Decimal::new(5, 2)).unwrap();
        let listing_id = marketplace.create_listing(&token_id, "creator1", ListingType::FixedPrice, Decimal::new(100, 0), "ETH".to_string(), Some(7)).unwrap();

        marketplace.deposit_funds("buyer1", "ETH", Decimal::new(200, 0));

        let result = marketplace.buy_now(&listing_id, "buyer1");
        assert!(result.is_ok());

        let nft = marketplace.get_nft(&token_id).unwrap();
        assert_eq!(nft.owner, "buyer1");
    }
}