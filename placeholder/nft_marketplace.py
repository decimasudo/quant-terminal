import asyncio
import hashlib
import json
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
import uuid

class NFTStandard(Enum):
    ERC721 = "ERC721"
    ERC1155 = "ERC1155"

class AuctionStatus(Enum):
    ACTIVE = "active"
    ENDED = "ended"
    CANCELLED = "cancelled"

@dataclass
class NFTMetadata:
    name: str
    description: str
    image: str
    attributes: List[Dict[str, Any]] = field(default_factory=list)
    external_url: Optional[str] = None
    animation_url: Optional[str] = None

@dataclass
class NFT:
    token_id: str
    contract_address: str
    owner: str
    creator: str
    metadata: NFTMetadata
    standard: NFTStandard
    supply: int = 1
    royalties: Decimal = Decimal('0.05')

@dataclass
class Auction:
    id: str
    nft_token_id: str
    nft_contract: str
    seller: str
    starting_price: Decimal
    reserve_price: Optional[Decimal]
    current_bid: Optional[Decimal] = None
    current_bidder: Optional[str] = None
    end_time: datetime
    status: AuctionStatus = AuctionStatus.ACTIVE
    bids: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class Listing:
    id: str
    nft_token_id: str
    nft_contract: str
    seller: str
    price: Decimal
    currency: str = "ETH"
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None

class NFTMarketplace:
    def __init__(self):
        self.nfts: Dict[str, Dict[str, NFT]] = {}
        self.auctions: Dict[str, Auction] = {}
        self.listings: Dict[str, Listing] = {}
        self.user_balances: Dict[str, Dict[str, Decimal]] = {}
        self.user_nfts: Dict[str, Set[str]] = {}
        self.auction_counter = 0
        self.listing_counter = 0

    def mint_nft(self, contract_address: str, creator: str, metadata: NFTMetadata,
                 standard: NFTStandard = NFTStandard.ERC721, supply: int = 1) -> str:
        token_id = str(uuid.uuid4())

        if contract_address not in self.nfts:
            self.nfts[contract_address] = {}

        nft = NFT(
            token_id=token_id,
            contract_address=contract_address,
            owner=creator,
            creator=creator,
            metadata=metadata,
            standard=standard,
            supply=supply
        )

        self.nfts[contract_address][token_id] = nft

        if creator not in self.user_nfts:
            self.user_nfts[creator] = set()
        self.user_nfts[creator].add(f"{contract_address}:{token_id}")

        return token_id

    def transfer_nft(self, contract_address: str, token_id: str, from_user: str, to_user: str) -> bool:
        if contract_address not in self.nfts or token_id not in self.nfts[contract_address]:
            return False

        nft = self.nfts[contract_address][token_id]
        if nft.owner != from_user:
            return False

        nft.owner = to_user

        if from_user in self.user_nfts:
            self.user_nfts[from_user].discard(f"{contract_address}:{token_id}")

        if to_user not in self.user_nfts:
            self.user_nfts[to_user] = set()
        self.user_nfts[to_user].add(f"{contract_address}:{token_id}")

        return True

    def create_listing(self, contract_address: str, token_id: str, seller: str,
                      price: Decimal, currency: str = "ETH", duration_days: int = 30) -> Optional[str]:
        if contract_address not in self.nfts or token_id not in self.nfts[contract_address]:
            return None

        nft = self.nfts[contract_address][token_id]
        if nft.owner != seller:
            return None

        self.listing_counter += 1
        listing_id = f"listing_{self.listing_counter}"

        expires_at = datetime.now() + timedelta(days=duration_days) if duration_days > 0 else None

        listing = Listing(
            id=listing_id,
            nft_token_id=token_id,
            nft_contract=contract_address,
            seller=seller,
            price=price,
            currency=currency,
            expires_at=expires_at
        )

        self.listings[listing_id] = listing
        return listing_id

    def cancel_listing(self, listing_id: str, user: str) -> bool:
        if listing_id not in self.listings:
            return False

        listing = self.listings[listing_id]
        if listing.seller != user:
            return False

        del self.listings[listing_id]
        return True

    def buy_listing(self, listing_id: str, buyer: str) -> bool:
        if listing_id not in self.listings:
            return False

        listing = self.listings[listing_id]

        if listing.expires_at and datetime.now() > listing.expires_at:
            del self.listings[listing_id]
            return False

        buyer_balance = self.get_user_balance(buyer, listing.currency)
        if buyer_balance < listing.price:
            return False

        seller_balance = self.get_user_balance(listing.seller, listing.currency)

        self.update_balance(buyer, listing.currency, buyer_balance - listing.price)
        self.update_balance(listing.seller, listing.currency, seller_balance + listing.price)

        success = self.transfer_nft(listing.nft_contract, listing.nft_token_id, listing.seller, buyer)

        if success:
            del self.listings[listing_id]

            royalty_amount = listing.price * self.nfts[listing.nft_contract][listing.nft_token_id].royalties
            if royalty_amount > 0:
                creator = self.nfts[listing.nft_contract][listing.nft_token_id].creator
                creator_balance = self.get_user_balance(creator, listing.currency)
                self.update_balance(creator, listing.currency, creator_balance + royalty_amount)
                self.update_balance(listing.seller, listing.currency,
                                  self.get_user_balance(listing.seller, listing.currency) - royalty_amount)

        return success

    def create_auction(self, contract_address: str, token_id: str, seller: str,
                      starting_price: Decimal, reserve_price: Optional[Decimal] = None,
                      duration_hours: int = 24) -> Optional[str]:
        if contract_address not in self.nfts or token_id not in self.nfts[contract_address]:
            return None

        nft = self.nfts[contract_address][token_id]
        if nft.owner != seller:
            return None

        self.auction_counter += 1
        auction_id = f"auction_{self.auction_counter}"

        end_time = datetime.now() + timedelta(hours=duration_hours)

        auction = Auction(
            id=auction_id,
            nft_token_id=token_id,
            nft_contract=contract_address,
            seller=seller,
            starting_price=starting_price,
            reserve_price=reserve_price,
            end_time=end_time
        )

        self.auctions[auction_id] = auction
        return auction_id

    def place_bid(self, auction_id: str, bidder: str, bid_amount: Decimal) -> bool:
        if auction_id not in self.auctions:
            return False

        auction = self.auctions[auction_id]
        if auction.status != AuctionStatus.ACTIVE:
            return False

        if datetime.now() > auction.end_time:
            auction.status = AuctionStatus.ENDED
            return False

        if bid_amount <= auction.starting_price:
            return False

        if auction.current_bid and bid_amount <= auction.current_bid:
            return False

        bidder_balance = self.get_user_balance(bidder, "ETH")
        if bidder_balance < bid_amount:
            return False

        if auction.current_bidder:
            previous_bidder_balance = self.get_user_balance(auction.current_bidder, "ETH")
            self.update_balance(auction.current_bidder, "ETH", previous_bidder_balance + auction.current_bid)

        self.update_balance(bidder, "ETH", bidder_balance - bid_amount)

        auction.current_bid = bid_amount
        auction.current_bidder = bidder
        auction.bids.append({
            'bidder': bidder,
            'amount': bid_amount,
            'timestamp': datetime.now().isoformat()
        })

        return True

    def end_auction(self, auction_id: str) -> bool:
        if auction_id not in self.auctions:
            return False

        auction = self.auctions[auction_id]
        if auction.status != AuctionStatus.ACTIVE:
            return False

        auction.status = AuctionStatus.ENDED

        if auction.current_bidder and auction.current_bid:
            if auction.reserve_price and auction.current_bid < auction.reserve_price:
                self.update_balance(auction.current_bidder, "ETH",
                                  self.get_user_balance(auction.current_bidder, "ETH") + auction.current_bid)
                return True

            seller_balance = self.get_user_balance(auction.seller, "ETH")
            self.update_balance(auction.seller, "ETH", seller_balance + auction.current_bid)

            success = self.transfer_nft(auction.nft_contract, auction.nft_token_id, auction.seller, auction.current_bidder)

            if success:
                royalty_amount = auction.current_bid * self.nfts[auction.nft_contract][auction.nft_token_id].royalties
                if royalty_amount > 0:
                    creator = self.nfts[auction.nft_contract][auction.nft_token_id].creator
                    creator_balance = self.get_user_balance(creator, "ETH")
                    self.update_balance(creator, "ETH", creator_balance + royalty_amount)
                    self.update_balance(auction.seller, "ETH",
                                      self.get_user_balance(auction.seller, "ETH") - royalty_amount)

        return True

    def get_user_balance(self, user: str, currency: str) -> Decimal:
        if user not in self.user_balances:
            return Decimal('0')
        if currency not in self.user_balances[user]:
            return Decimal('0')
        return self.user_balances[user][currency]

    def update_balance(self, user: str, currency: str, amount: Decimal) -> None:
        if user not in self.user_balances:
            self.user_balances[user] = {}
        self.user_balances[user][currency] = amount

    def get_nft_details(self, contract_address: str, token_id: str) -> Optional[Dict[str, Any]]:
        if contract_address not in self.nfts or token_id not in self.nfts[contract_address]:
            return None

        nft = self.nfts[contract_address][token_id]
        return {
            'token_id': nft.token_id,
            'contract_address': nft.contract_address,
            'owner': nft.owner,
            'creator': nft.creator,
            'metadata': {
                'name': nft.metadata.name,
                'description': nft.metadata.description,
                'image': nft.metadata.image,
                'attributes': nft.metadata.attributes
            },
            'standard': nft.standard.value,
            'supply': nft.supply,
            'royalties': float(nft.royalties)
        }

    def get_user_nfts(self, user: str) -> List[Dict[str, Any]]:
        if user not in self.user_nfts:
            return []

        nfts = []
        for nft_key in self.user_nfts[user]:
            contract_address, token_id = nft_key.split(':', 1)
            nft_details = self.get_nft_details(contract_address, token_id)
            if nft_details:
                nfts.append(nft_details)

        return nfts

    def get_active_listings(self) -> List[Dict[str, Any]]:
        active_listings = []
        for listing in self.listings.values():
            if listing.expires_at is None or datetime.now() <= listing.expires_at:
                active_listings.append({
                    'id': listing.id,
                    'nft_token_id': listing.nft_token_id,
                    'nft_contract': listing.nft_contract,
                    'seller': listing.seller,
                    'price': float(listing.price),
                    'currency': listing.currency,
                    'created_at': listing.created_at.isoformat(),
                    'expires_at': listing.expires_at.isoformat() if listing.expires_at else None
                })
        return active_listings

    def get_active_auctions(self) -> List[Dict[str, Any]]:
        active_auctions = []
        for auction in self.auctions.values():
            if auction.status == AuctionStatus.ACTIVE and datetime.now() <= auction.end_time:
                active_auctions.append({
                    'id': auction.id,
                    'nft_token_id': auction.nft_token_id,
                    'nft_contract': auction.nft_contract,
                    'seller': auction.seller,
                    'starting_price': float(auction.starting_price),
                    'reserve_price': float(auction.reserve_price) if auction.reserve_price else None,
                    'current_bid': float(auction.current_bid) if auction.current_bid else None,
                    'current_bidder': auction.current_bidder,
                    'end_time': auction.end_time.isoformat(),
                    'bid_count': len(auction.bids)
                })
        return active_auctions

    def get_market_stats(self) -> Dict[str, Any]:
        total_volume = Decimal('0')
        total_listings = len(self.get_active_listings())
        total_auctions = len(self.get_active_auctions())

        for listing in self.listings.values():
            total_volume += listing.price

        for auction in self.auctions.values():
            if auction.current_bid:
                total_volume += auction.current_bid

        return {
            'total_volume': float(total_volume),
            'active_listings': total_listings,
            'active_auctions': total_auctions,
            'total_nfts': sum(len(contract_nfts) for contract_nfts in self.nfts.values()),
            'total_users': len(self.user_balances)
        }

async def main():
    marketplace = NFTMarketplace()

    metadata = NFTMetadata(
        name="Digital Art #1",
        description="A unique digital artwork",
        image="ipfs://Qm...",
        attributes=[{"trait_type": "Rarity", "value": "Legendary"}]
    )

    token_id = marketplace.mint_nft("0x123...", "creator1", metadata)
    marketplace.update_balance("creator1", "ETH", Decimal('10'))
    marketplace.update_balance("buyer1", "ETH", Decimal('5'))

    listing_id = marketplace.create_listing("0x123...", token_id, "creator1", Decimal('1'))
    success = marketplace.buy_listing(listing_id, "buyer1")

    print(f"NFT purchase successful: {success}")
    print(f"Creator balance: {marketplace.get_user_balance('creator1', 'ETH')}")
    print(f"Buyer balance: {marketplace.get_user_balance('buyer1', 'ETH')}")
    print(f"Buyer NFTs: {len(marketplace.get_user_nfts('buyer1'))}")

if __name__ == "__main__":
    asyncio.run(main())