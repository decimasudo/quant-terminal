use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use sha3::{Digest, Sha3_256, Sha3_512};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, NewAead};
use rand::RngCore;
use rand::rngs::OsRng;
use bip39::{Mnemonic, Language};
use bitcoin::util::bip32::{ExtendedPrivKey, ExtendedPubKey, DerivationPath};
use bitcoin::network::constants::Network;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallet {
    pub id: String,
    pub name: String,
    pub address: String,
    pub encrypted_private_key: Vec<u8>,
    pub public_key: String,
    pub blockchain: String,
    pub created_at: DateTime<Utc>,
    pub last_used: DateTime<Utc>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub wallet_id: String,
    pub tx_hash: String,
    pub from_address: String,
    pub to_address: String,
    pub amount: Decimal,
    pub currency: String,
    pub gas_used: Option<Decimal>,
    pub gas_price: Option<Decimal>,
    pub status: TransactionStatus,
    pub timestamp: DateTime<Utc>,
    pub block_number: Option<u64>,
    pub confirmations: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TransactionStatus {
    Pending,
    Confirmed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Balance {
    pub currency: String,
    pub amount: Decimal,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HDWallet {
    pub mnemonic: String,
    pub seed: Vec<u8>,
    pub master_private_key: ExtendedPrivKey,
    pub master_public_key: ExtendedPubKey,
    pub accounts: Vec<HDAccount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HDAccount {
    pub index: u32,
    pub private_key: ExtendedPrivKey,
    pub public_key: ExtendedPubKey,
    pub address: String,
    pub blockchain: String,
    pub derivation_path: String,
}

#[derive(Debug, Clone)]
pub struct WalletManager {
    wallets: HashMap<String, Wallet>,
    transactions: HashMap<String, Vec<Transaction>>,
    balances: HashMap<String, Vec<Balance>>,
    hd_wallets: HashMap<String, HDWallet>,
    encryption_key: Vec<u8>,
    wallet_counter: u64,
    transaction_counter: u64,
}

impl WalletManager {
    pub fn new(master_password: &str) -> Self {
        let encryption_key = Self::derive_key_from_password(master_password);
        
        Self {
            wallets: HashMap::new(),
            transactions: HashMap::new(),
            balances: HashMap::new(),
            hd_wallets: HashMap::new(),
            encryption_key,
            wallet_counter: 0,
            transaction_counter: 0,
        }
    }

    pub fn create_wallet(&mut self, name: String, blockchain: String, private_key: Option<String>) -> Result<String, String> {
        self.wallet_counter += 1;
        let wallet_id = format!("wallet_{}", self.wallet_counter);

        let (private_key, address, public_key) = if let Some(pk) = private_key {
            // Import existing private key
            self.validate_and_derive_address(&pk, &blockchain)?
        } else {
            // Generate new keypair
            self.generate_keypair(&blockchain)?
        };

        // Encrypt private key
        let encrypted_private_key = self.encrypt_private_key(&private_key)?;

        let wallet = Wallet {
            id: wallet_id.clone(),
            name,
            address: address.clone(),
            encrypted_private_key,
            public_key,
            blockchain,
            created_at: Utc::now(),
            last_used: Utc::now(),
            is_active: true,
        };

        self.wallets.insert(wallet_id.clone(), wallet);
        self.transactions.insert(wallet_id.clone(), Vec::new());
        self.balances.insert(wallet_id.clone(), Vec::new());

        Ok(wallet_id)
    }

    pub fn create_hd_wallet(&mut self, name: String, password: &str) -> Result<String, String> {
        let wallet_id = format!("hd_wallet_{}", name);

        // Generate mnemonic
        let mut rng = OsRng;
        let entropy = {
            let mut entropy = [0u8; 32];
            rng.fill_bytes(&mut entropy);
            entropy
        };

        let mnemonic = Mnemonic::from_entropy(&entropy, Language::English)
            .map_err(|e| format!("Failed to generate mnemonic: {}", e))?;

        // Derive seed from mnemonic and password
        let seed = Self::derive_seed_from_mnemonic(&mnemonic, password);

        // Create master key
        let master_private_key = ExtendedPrivKey::new_master(Network::Bitcoin, &seed)
            .map_err(|e| format!("Failed to create master key: {}", e))?;

        let master_public_key = ExtendedPubKey::from_private(&master_private_key);

        let hd_wallet = HDWallet {
            mnemonic: mnemonic.to_string(),
            seed: seed.to_vec(),
            master_private_key,
            master_public_key,
            accounts: Vec::new(),
        };

        self.hd_wallets.insert(wallet_id.clone(), hd_wallet);

        Ok(wallet_id)
    }

    pub fn derive_hd_account(&mut self, hd_wallet_id: &str, account_index: u32, blockchain: &str) -> Result<String, String> {
        let hd_wallet = self.hd_wallets.get_mut(hd_wallet_id)
            .ok_or_else(|| "HD wallet not found".to_string())?;

        // Derive account key using BIP44 path: m/44'/60'/0'/0/{account_index}
        let derivation_path = format!("m/44'/60'/0'/0/{}", account_index);
        let path: DerivationPath = derivation_path.parse()
            .map_err(|e| format!("Invalid derivation path: {}", e))?;

        let account_private_key = hd_wallet.master_private_key.derive_priv(&hd_wallet.master_private_key.network, &path)
            .map_err(|e| format!("Failed to derive account key: {}", e))?;

        let account_public_key = ExtendedPubKey::from_private(&account_private_key);

        // Generate address based on blockchain
        let address = self.generate_address_from_public_key(&account_public_key, blockchain)?;

        let account = HDAccount {
            index: account_index,
            private_key: account_private_key,
            public_key: account_public_key,
            address: address.clone(),
            blockchain: blockchain.to_string(),
            derivation_path,
        };

        hd_wallet.accounts.push(account);

        Ok(address)
    }

    pub fn import_wallet(&mut self, name: String, blockchain: String, private_key: String, password: &str) -> Result<String, String> {
        // Validate private key format
        self.validate_private_key(&private_key, &blockchain)?;

        // Encrypt and store
        let encrypted_key = self.encrypt_data(private_key.as_bytes(), password)?;

        self.wallet_counter += 1;
        let wallet_id = format!("wallet_{}", self.wallet_counter);

        let (address, public_key) = self.derive_address(&private_key, &blockchain)?;

        let wallet = Wallet {
            id: wallet_id.clone(),
            name,
            address,
            encrypted_private_key: encrypted_key,
            public_key,
            blockchain,
            created_at: Utc::now(),
            last_used: Utc::now(),
            is_active: true,
        };

        self.wallets.insert(wallet_id.clone(), wallet);
        self.transactions.insert(wallet_id.clone(), Vec::new());
        self.balances.insert(wallet_id.clone(), Vec::new());

        Ok(wallet_id)
    }

    pub fn export_private_key(&self, wallet_id: &str, password: &str) -> Result<String, String> {
        let wallet = self.wallets.get(wallet_id)
            .ok_or_else(|| "Wallet not found".to_string())?;

        let decrypted_key = self.decrypt_data(&wallet.encrypted_private_key, password)?;
        String::from_utf8(decrypted_key)
            .map_err(|e| format!("Invalid private key format: {}", e))
    }

    pub fn sign_transaction(&self, wallet_id: &str, transaction_data: &[u8], password: &str) -> Result<Vec<u8>, String> {
        let wallet = self.wallets.get(wallet_id)
            .ok_or_else(|| "Wallet not found".to_string())?;

        let private_key_bytes = self.decrypt_data(&wallet.encrypted_private_key, password)?;

        // Sign transaction based on blockchain
        match wallet.blockchain.as_str() {
            "ethereum" => self.sign_ethereum_transaction(&private_key_bytes, transaction_data),
            "bitcoin" => self.sign_bitcoin_transaction(&private_key_bytes, transaction_data),
            _ => Err("Unsupported blockchain".to_string()),
        }
    }

    pub fn record_transaction(&mut self, wallet_id: &str, tx_hash: String, from_address: String,
                            to_address: String, amount: Decimal, currency: String,
                            gas_used: Option<Decimal>, gas_price: Option<Decimal>) -> Result<String, String> {
        let wallet = self.wallets.get(wallet_id)
            .ok_or_else(|| "Wallet not found".to_string())?;

        self.transaction_counter += 1;
        let transaction_id = format!("tx_{}", self.transaction_counter);

        let transaction = Transaction {
            id: transaction_id.clone(),
            wallet_id: wallet_id.to_string(),
            tx_hash,
            from_address,
            to_address,
            amount,
            currency,
            gas_used,
            gas_price,
            status: TransactionStatus::Pending,
            timestamp: Utc::now(),
            block_number: None,
            confirmations: 0,
        };

        self.transactions.get_mut(wallet_id).unwrap().push(transaction);

        // Update wallet last used time
        let wallet = self.wallets.get_mut(wallet_id).unwrap();
        wallet.last_used = Utc::now();

        Ok(transaction_id)
    }

    pub fn update_transaction_status(&mut self, wallet_id: &str, tx_hash: &str, status: TransactionStatus,
                                   block_number: Option<u64>, confirmations: u32) -> Result<(), String> {
        let transactions = self.transactions.get_mut(wallet_id)
            .ok_or_else(|| "Wallet not found".to_string())?;

        if let Some(tx) = transactions.iter_mut().find(|t| t.tx_hash == tx_hash) {
            tx.status = status;
            tx.block_number = block_number;
            tx.confirmations = confirmations;
            Ok(())
        } else {
            Err("Transaction not found".to_string())
        }
    }

    pub fn update_balance(&mut self, wallet_id: &str, currency: String, amount: Decimal) -> Result<(), String> {
        let balances = self.balances.get_mut(wallet_id)
            .ok_or_else(|| "Wallet not found".to_string())?;

        if let Some(balance) = balances.iter_mut().find(|b| b.currency == currency) {
            balance.amount = amount;
            balance.last_updated = Utc::now();
        } else {
            let balance = Balance {
                currency,
                amount,
                last_updated: Utc::now(),
            };
            balances.push(balance);
        }

        Ok(())
    }

    pub fn get_balance(&self, wallet_id: &str, currency: &str) -> Option<Decimal> {
        self.balances.get(wallet_id)?
            .iter()
            .find(|b| b.currency == currency)
            .map(|b| b.amount)
    }

    pub fn get_wallet(&self, wallet_id: &str) -> Option<Wallet> {
        self.wallets.get(wallet_id).cloned()
    }

    pub fn get_wallets(&self) -> Vec<Wallet> {
        self.wallets.values().cloned().collect()
    }

    pub fn get_wallet_transactions(&self, wallet_id: &str) -> Option<Vec<Transaction>> {
        self.transactions.get(wallet_id).cloned()
    }

    pub fn get_wallet_balances(&self, wallet_id: &str) -> Option<Vec<Balance>> {
        self.balances.get(wallet_id).cloned()
    }

    pub fn backup_wallet(&self, wallet_id: &str, password: &str) -> Result<String, String> {
        let wallet = self.wallets.get(wallet_id)
            .ok_or_else(|| "Wallet not found".to_string())?;

        let private_key = self.decrypt_data(&wallet.encrypted_private_key, password)?;
        let private_key_hex = hex::encode(private_key);

        let backup = serde_json::json!({
            "wallet_id": wallet.id,
            "name": wallet.name,
            "address": wallet.address,
            "private_key": private_key_hex,
            "blockchain": wallet.blockchain,
            "created_at": wallet.created_at,
        });

        Ok(backup.to_string())
    }

    pub fn restore_wallet(&mut self, backup_json: &str, password: &str) -> Result<String, String> {
        let backup: serde_json::Value = serde_json::from_str(backup_json)
            .map_err(|e| format!("Invalid backup format: {}", e))?;

        let name = backup["name"].as_str().ok_or("Missing name")?.to_string();
        let blockchain = backup["blockchain"].as_str().ok_or("Missing blockchain")?.to_string();
        let private_key_hex = backup["private_key"].as_str().ok_or("Missing private key")?;

        let private_key = hex::decode(private_key_hex)
            .map_err(|e| format!("Invalid private key hex: {}", e))?;

        let private_key_str = String::from_utf8(private_key)
            .map_err(|e| format!("Invalid private key encoding: {}", e))?;

        self.import_wallet(name, blockchain, private_key_str, password)
    }

    pub fn change_password(&mut self, old_password: &str, new_password: &str) -> Result<(), String> {
        let old_key = Self::derive_key_from_password(old_password);
        let new_key = Self::derive_key_from_password(new_password);

        // Verify old password by attempting to decrypt a wallet
        if let Some((_, wallet)) = self.wallets.iter().next() {
            self.decrypt_data(&wallet.encrypted_private_key, old_password)?;
        }

        // Re-encrypt all wallets with new key
        for wallet in self.wallets.values_mut() {
            let decrypted_key = self.decrypt_data(&wallet.encrypted_private_key, old_password)?;
            wallet.encrypted_private_key = self.encrypt_data_with_key(&decrypted_key, &new_key)?;
        }

        self.encryption_key = new_key;
        Ok(())
    }

    pub fn get_wallet_stats(&self) -> HashMap<String, u64> {
        let mut stats = HashMap::new();
        stats.insert("total_wallets".to_string(), self.wallets.len() as u64);
        stats.insert("total_hd_wallets".to_string(), self.hd_wallets.len() as u64);
        stats.insert("total_transactions".to_string(), self.transactions.values().map(|txs| txs.len()).sum::<usize>() as u64);
        stats
    }

    // Private helper methods

    fn derive_key_from_password(password: &str) -> Vec<u8> {
        let mut hasher = Sha3_256::new();
        hasher.update(password.as_bytes());
        hasher.update(b"wallet_salt_2024");
        hasher.finalize().to_vec()
    }

    fn derive_seed_from_mnemonic(mnemonic: &Mnemonic, password: &str) -> Vec<u8> {
        let mut hasher = Sha3_512::new();
        hasher.update(mnemonic.to_string().as_bytes());
        hasher.update(password.as_bytes());
        hasher.finalize().to_vec()
    }

    fn encrypt_private_key(&self, private_key: &str) -> Result<Vec<u8>, String> {
        self.encrypt_data(private_key.as_bytes(), "")
    }

    fn encrypt_data(&self, data: &[u8], additional_data: &str) -> Result<Vec<u8>, String> {
        self.encrypt_data_with_key(data, &self.encryption_key)
    }

    fn encrypt_data_with_key(&self, data: &[u8], key: &[u8]) -> Result<Vec<u8>, String> {
        let key = Key::from_slice(key);
        let cipher = Aes256Gcm::new(key);
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher.encrypt(nonce, data)
            .map_err(|e| format!("Encryption failed: {}", e))?;

        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);
        Ok(result)
    }

    fn decrypt_data(&self, encrypted_data: &[u8], password: &str) -> Result<Vec<u8>, String> {
        let key = if password.is_empty() {
            self.encryption_key.as_slice()
        } else {
            Self::derive_key_from_password(password).as_slice()
        };

        let key = Key::from_slice(key);
        let cipher = Aes256Gcm::new(key);

        if encrypted_data.len() < 12 {
            return Err("Invalid encrypted data".to_string());
        }

        let nonce = Nonce::from_slice(&encrypted_data[..12]);
        let ciphertext = &encrypted_data[12..];

        cipher.decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))
    }

    fn generate_keypair(&self, blockchain: &str) -> Result<(String, String, String), String> {
        match blockchain {
            "ethereum" => self.generate_ethereum_keypair(),
            "bitcoin" => self.generate_bitcoin_keypair(),
            _ => Err("Unsupported blockchain".to_string()),
        }
    }

    fn generate_ethereum_keypair(&self) -> Result<(String, String, String), String> {
        // Simplified Ethereum key generation
        let mut rng = OsRng;
        let mut private_key_bytes = [0u8; 32];
        rng.fill_bytes(&mut private_key_bytes);

        let private_key = hex::encode(private_key_bytes);
        let (address, public_key) = self.derive_address(&private_key, "ethereum")?;

        Ok((private_key, address, public_key))
    }

    fn generate_bitcoin_keypair(&self) -> Result<(String, String, String), String> {
        // Simplified Bitcoin key generation
        let mut rng = OsRng;
        let mut private_key_bytes = [0u8; 32];
        rng.fill_bytes(&mut private_key_bytes);

        let private_key = hex::encode(private_key_bytes);
        let (address, public_key) = self.derive_address(&private_key, "bitcoin")?;

        Ok((private_key, address, public_key))
    }

    fn validate_and_derive_address(&self, private_key: &str, blockchain: &str) -> Result<(String, String, String), String> {
        self.validate_private_key(private_key, blockchain)?;
        let (address, public_key) = self.derive_address(private_key, blockchain)?;
        Ok((private_key.to_string(), address, public_key))
    }

    fn validate_private_key(&self, private_key: &str, blockchain: &str) -> Result<(), String> {
        match blockchain {
            "ethereum" => {
                if private_key.len() != 64 || !private_key.chars().all(|c| c.is_ascii_hexdigit()) {
                    return Err("Invalid Ethereum private key format".to_string());
                }
            }
            "bitcoin" => {
                if private_key.len() != 64 || !private_key.chars().all(|c| c.is_ascii_hexdigit()) {
                    return Err("Invalid Bitcoin private key format".to_string());
                }
            }
            _ => return Err("Unsupported blockchain".to_string()),
        }
        Ok(())
    }

    fn derive_address(&self, private_key: &str, blockchain: &str) -> Result<(String, String), String> {
        match blockchain {
            "ethereum" => self.derive_ethereum_address(private_key),
            "bitcoin" => self.derive_bitcoin_address(private_key),
            _ => Err("Unsupported blockchain".to_string()),
        }
    }

    fn derive_ethereum_address(&self, private_key: &str) -> Result<(String, String), String> {
        // Simplified Ethereum address derivation
        let mut hasher = Sha3_256::new();
        hasher.update(hex::decode(private_key).map_err(|_| "Invalid hex")?);
        let public_key_hash = hasher.finalize();
        let address = format!("0x{}", hex::encode(&public_key_hash[..20]));
        let public_key = hex::encode(public_key_hash);
        Ok((address, public_key))
    }

    fn derive_bitcoin_address(&self, private_key: &str) -> Result<(String, String), String> {
        // Simplified Bitcoin address derivation
        let mut hasher = Sha3_256::new();
        hasher.update(hex::decode(private_key).map_err(|_| "Invalid hex")?);
        let public_key_hash = hasher.finalize();
        let address = format!("1{}", hex::encode(&public_key_hash[..20]));
        let public_key = hex::encode(public_key_hash);
        Ok((address, public_key))
    }

    fn generate_address_from_public_key(&self, public_key: &ExtendedPubKey, blockchain: &str) -> Result<String, String> {
        match blockchain {
            "ethereum" => {
                let pub_key_bytes = public_key.public_key.to_bytes();
                let mut hasher = Sha3_256::new();
                hasher.update(&pub_key_bytes[1..]); // Skip the 0x04 prefix
                let hash = hasher.finalize();
                Ok(format!("0x{}", hex::encode(&hash[12..])))
            }
            "bitcoin" => {
                let pub_key_bytes = public_key.public_key.to_bytes();
                let mut hasher = Sha3_256::new();
                hasher.update(&pub_key_bytes);
                let hash = hasher.finalize();
                Ok(format!("1{}", hex::encode(&hash[..20])))
            }
            _ => Err("Unsupported blockchain".to_string()),
        }
    }

    fn sign_ethereum_transaction(&self, private_key: &[u8], transaction_data: &[u8]) -> Result<Vec<u8>, String> {
        // Simplified Ethereum transaction signing
        let mut hasher = Sha3_256::new();
        hasher.update(private_key);
        hasher.update(transaction_data);
        let signature = hasher.finalize();
        Ok(signature.to_vec())
    }

    fn sign_bitcoin_transaction(&self, private_key: &[u8], transaction_data: &[u8]) -> Result<Vec<u8>, String> {
        // Simplified Bitcoin transaction signing
        let mut hasher = Sha3_256::new();
        hasher.update(private_key);
        hasher.update(transaction_data);
        let signature = hasher.finalize();
        Ok(signature.to_vec())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_wallet() {
        let mut manager = WalletManager::new("test_password");

        let result = manager.create_wallet("Test Wallet".to_string(), "ethereum".to_string(), None);
        assert!(result.is_ok());

        let wallet_id = result.unwrap();
        let wallet = manager.get_wallet(&wallet_id).unwrap();
        assert_eq!(wallet.name, "Test Wallet");
        assert!(wallet.address.starts_with("0x"));
    }

    #[test]
    fn test_update_balance() {
        let mut manager = WalletManager::new("test_password");

        let wallet_id = manager.create_wallet("Test Wallet".to_string(), "ethereum".to_string(), None).unwrap();

        let result = manager.update_balance(&wallet_id, "ETH".to_string(), Decimal::new(100, 0));
        assert!(result.is_ok());

        let balance = manager.get_balance(&wallet_id, "ETH").unwrap();
        assert_eq!(balance, Decimal::new(100, 0));
    }

    #[test]
    fn test_record_transaction() {
        let mut manager = WalletManager::new("test_password");

        let wallet_id = manager.create_wallet("Test Wallet".to_string(), "ethereum".to_string(), None).unwrap();

        let result = manager.record_transaction(
            &wallet_id,
            "0x123...".to_string(),
            "0xabc...".to_string(),
            "0xdef...".to_string(),
            Decimal::new(10, 0),
            "ETH".to_string(),
            Some(Decimal::new(21000, 0)),
            Some(Decimal::new(20, 9)),
        );

        assert!(result.is_ok());

        let transactions = manager.get_wallet_transactions(&wallet_id).unwrap();
        assert_eq!(transactions.len(), 1);
        assert_eq!(transactions[0].amount, Decimal::new(10, 0));
    }

    #[test]
    fn test_create_hd_wallet() {
        let mut manager = WalletManager::new("test_password");

        let result = manager.create_hd_wallet("Test HD Wallet".to_string(), "mnemonic_password");
        assert!(result.is_ok());

        let hd_wallet_id = result.unwrap();
        assert!(manager.hd_wallets.contains_key(&hd_wallet_id));
    }
}