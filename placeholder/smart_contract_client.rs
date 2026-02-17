use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use web3::types::{Address, U256, H256, TransactionRequest, TransactionReceipt};
use web3::Web3;
use web3::transports::Http;
use web3::contract::{Contract, Options};
use ethabi::Token;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct SmartContractClient {
    web3: Web3<Http>,
    contracts: HashMap<String, Contract<Http>>,
    account: Address,
    chain_id: u64,
    nonce_manager: Arc<Mutex<HashMap<Address, U256>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContractCall {
    pub contract_name: String,
    pub method_name: String,
    pub params: Vec<Token>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionResult {
    pub hash: H256,
    pub success: bool,
    pub gas_used: Option<U256>,
    pub block_number: Option<U256>,
}

impl SmartContractClient {
    pub async fn new(rpc_url: &str, private_key: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let transport = Http::new(rpc_url)?;
        let web3 = Web3::new(transport);

        let account = Address::from_str(private_key)?;

        let chain_id = web3.eth().chain_id().await?.as_u64();

        Ok(Self {
            web3,
            contracts: HashMap::new(),
            account,
            chain_id,
            nonce_manager: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub async fn load_contract(
        &mut self,
        name: String,
        address: Address,
        abi: &[u8],
    ) -> Result<(), Box<dyn std::error::Error>> {
        let contract = Contract::from_json(self.web3.eth(), address, abi)?;
        self.contracts.insert(name, contract);
        Ok(())
    }

    pub async fn get_nonce(&self, address: Address) -> Result<U256, Box<dyn std::error::Error>> {
        let mut nonces = self.nonce_manager.lock().await;

        if let Some(nonce) = nonces.get(&address) {
            Ok(*nonce)
        } else {
            let nonce = self.web3.eth().transaction_count(address, None).await?;
            nonces.insert(address, nonce);
            Ok(nonce)
        }
    }

    pub async fn increment_nonce(&self, address: Address) {
        let mut nonces = self.nonce_manager.lock().await;
        if let Some(nonce) = nonces.get_mut(&address) {
            *nonce += U256::one();
        }
    }

    pub async fn estimate_gas(
        &self,
        transaction: TransactionRequest,
    ) -> Result<U256, Box<dyn std::error::Error>> {
        let gas_estimate = self.web3.eth().estimate_gas(transaction, None).await?;
        Ok(gas_estimate * U256::from(110) / U256::from(100))
    }

    pub async fn send_transaction(
        &self,
        mut transaction: TransactionRequest,
    ) -> Result<TransactionResult, Box<dyn std::error::Error>> {
        transaction.from = Some(self.account);
        transaction.nonce = Some(self.get_nonce(self.account).await?);

        let gas_limit = self.estimate_gas(transaction.clone()).await?;
        transaction.gas = Some(gas_limit);

        let signed_transaction = self.web3.accounts().sign_transaction(transaction, &self.account).await?;
        let transaction_hash = self.web3.eth().send_raw_transaction(signed_transaction.raw_transaction).await?;

        self.increment_nonce(self.account).await;

        let receipt = self.web3.eth().transaction_receipt(transaction_hash).await?;

        let result = TransactionResult {
            hash: transaction_hash,
            success: receipt.status == Some(U256::one()),
            gas_used: receipt.gas_used,
            block_number: receipt.block_number,
        };

        Ok(result)
    }

    pub async fn call_contract_method(
        &self,
        contract_name: &str,
        method_name: &str,
        params: Vec<Token>,
    ) -> Result<Vec<Token>, Box<dyn std::error::Error>> {
        let contract = self.contracts.get(contract_name)
            .ok_or_else(|| format!("Contract {} not found", contract_name))?;

        let result = contract.query(method_name, params, None, Options::default(), None).await?;
        Ok(result)
    }

    pub async fn transact_contract_method(
        &self,
        contract_name: &str,
        method_name: &str,
        params: Vec<Token>,
        value: U256,
    ) -> Result<TransactionResult, Box<dyn std::error::Error>> {
        let contract = self.contracts.get(contract_name)
            .ok_or_else(|| format!("Contract {} not found", contract_name))?;

        let options = Options {
            value: Some(value),
            ..Default::default()
        };

        let transaction = contract.call(method_name, params, self.account, options).await?;
        self.send_transaction(transaction).await
    }

    pub async fn get_balance(&self, address: Address) -> Result<U256, Box<dyn std::error::Error>> {
        let balance = self.web3.eth().balance(address, None).await?;
        Ok(balance)
    }

    pub async fn get_block_number(&self) -> Result<U256, Box<dyn std::error::Error>> {
        let block_number = self.web3.eth().block_number().await?;
        Ok(block_number)
    }

    pub async fn get_gas_price(&self) -> Result<U256, Box<dyn std::error::Error>> {
        let gas_price = self.web3.eth().gas_price().await?;
        Ok(gas_price)
    }

    pub async fn get_transaction_receipt(
        &self,
        tx_hash: H256,
    ) -> Result<Option<TransactionReceipt>, Box<dyn std::error::Error>> {
        let receipt = self.web3.eth().transaction_receipt(tx_hash).await?;
        Ok(receipt)
    }

    pub async fn get_logs(
        &self,
        contract_name: &str,
        event_name: &str,
        from_block: U256,
        to_block: U256,
    ) -> Result<Vec<web3::types::Log>, Box<dyn std::error::Error>> {
        let contract = self.contracts.get(contract_name)
            .ok_or_else(|| format!("Contract {} not found", contract_name))?;

        let filter = web3::types::FilterBuilder::default()
            .address(vec![contract.address()])
            .from_block(web3::types::BlockNumber::Number(from_block))
            .to_block(web3::types::BlockNumber::Number(to_block))
            .build();

        let logs = self.web3.eth().logs(filter).await?;
        Ok(logs)
    }

    pub async fn batch_call(
        &self,
        calls: Vec<ContractCall>,
    ) -> Result<Vec<Vec<Token>>, Box<dyn std::error::Error>> {
        let mut results = Vec::new();

        for call in calls {
            let result = self.call_contract_method(&call.contract_name, &call.method_name, call.params).await?;
            results.push(result);
        }

        Ok(results)
    }

    pub async fn multicall_aggregate(
        &self,
        calls: Vec<(Address, Vec<u8>)>,
    ) -> Result<Vec<Vec<u8>>, Box<dyn std::error::Error>> {
        if let Some(multicall_contract) = self.contracts.get("multicall") {
            let tokens: Vec<Token> = calls.into_iter()
                .map(|(address, data)| Token::Tuple(vec![Token::Address(address), Token::Bytes(data)]))
                .collect();

            let result = multicall_contract
                .query("aggregate", vec![Token::Array(tokens)], None, Options::default(), None)
                .await?;

            if let Some(Token::Array(return_data)) = result.get(1) {
                let decoded_data: Vec<Vec<u8>> = return_data
                    .iter()
                    .filter_map(|token| {
                        if let Token::Bytes(bytes) = token {
                            Some(bytes.clone())
                        } else {
                            None
                        }
                    })
                    .collect();

                Ok(decoded_data)
            } else {
                Err("Invalid multicall response format".into())
            }
        } else {
            Err("Multicall contract not loaded".into())
        }
    }

    pub fn format_wei_to_eth(&self, wei: U256) -> f64 {
        let eth_value = wei.as_u128() as f64 / 1_000_000_000_000_000_000.0;
        eth_value
    }

    pub fn format_eth_to_wei(&self, eth: f64) -> U256 {
        let wei_value = (eth * 1_000_000_000_000_000_000.0) as u128;
        U256::from(wei_value)
    }

    pub async fn get_token_balance(
        &self,
        token_address: Address,
        wallet_address: Address,
    ) -> Result<U256, Box<dyn std::error::Error>> {
        let contract = if let Some(erc20) = self.contracts.get("erc20") {
            erc20
        } else {
            let erc20_abi = include_bytes!("../abi/erc20.json");
            Contract::from_json(self.web3.eth(), token_address, erc20_abi)?
        };

        let result = contract
            .query("balanceOf", vec![Token::Address(wallet_address)], None, Options::default(), None)
            .await?;

        if let Some(Token::Uint(balance)) = result.get(0) {
            Ok(*balance)
        } else {
            Err("Invalid balance response".into())
        }
    }

    pub async fn approve_token(
        &self,
        token_address: Address,
        spender_address: Address,
        amount: U256,
    ) -> Result<TransactionResult, Box<dyn std::error::Error>> {
        let contract = if let Some(erc20) = self.contracts.get("erc20") {
            erc20
        } else {
            let erc20_abi = include_bytes!("../abi/erc20.json");
            Contract::from_json(self.web3.eth(), token_address, erc20_abi)?
        };

        self.transact_contract_method(
            "erc20",
            "approve",
            vec![Token::Address(spender_address), Token::Uint(amount)],
            U256::zero(),
        ).await
    }

    pub async fn get_network_info(&self) -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
        let mut info = HashMap::new();

        let chain_id = self.web3.eth().chain_id().await?;
        info.insert("chain_id".to_string(), chain_id.to_string());

        let block_number = self.get_block_number().await?;
        info.insert("block_number".to_string(), block_number.to_string());

        let gas_price = self.get_gas_price().await?;
        info.insert("gas_price".to_string(), gas_price.to_string());

        let balance = self.get_balance(self.account).await?;
        info.insert("account_balance".to_string(), balance.to_string());

        Ok(info)
    }

    pub async fn wait_for_transaction(
        &self,
        tx_hash: H256,
        confirmations: usize,
    ) -> Result<TransactionReceipt, Box<dyn std::error::Error>> {
        let mut current_confirmations = 0;

        loop {
            if let Some(receipt) = self.get_transaction_receipt(tx_hash).await? {
                if receipt.status == Some(U256::one()) {
                    let latest_block = self.get_block_number().await?;
                    if let Some(tx_block) = receipt.block_number {
                        current_confirmations = (latest_block - tx_block).as_usize();
                        if current_confirmations >= confirmations {
                            return Ok(receipt);
                        }
                    }
                } else {
                    return Err("Transaction failed".into());
                }
            }

            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
    }

    pub fn get_contract_address(&self, name: &str) -> Option<Address> {
        self.contracts.get(name).map(|contract| contract.address())
    }

    pub fn list_contracts(&self) -> Vec<String> {
        self.contracts.keys().cloned().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_format_conversions() {
        let client = SmartContractClient::new("http://localhost:8545", "0x123").await.unwrap();

        let eth = 1.5;
        let wei = client.format_eth_to_wei(eth);
        let back_to_eth = client.format_wei_to_eth(wei);

        assert!((back_to_eth - eth).abs() < 0.0000000000000001);
    }
}