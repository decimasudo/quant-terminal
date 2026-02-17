import asyncio
import json
from typing import Dict, List, Optional, Any
from web3 import Web3, AsyncWeb3
from web3.contract import Contract
from web3.eth import AsyncEth
from eth_account import Account
from eth_account.signers.local import LocalAccount
from hexbytes import HexBytes
import os
from dotenv import load_dotenv

load_dotenv()

class SmartContractClient:
    def __init__(self, rpc_url: str, private_key: str):
        self.w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(rpc_url))
        self.account: LocalAccount = Account.from_key(private_key)
        self.contracts: Dict[str, Contract] = {}
        self.nonce_cache: Dict[str, int] = {}

    async def connect(self) -> bool:
        try:
            connected = await self.w3.is_connected()
            if connected:
                print(f"Connected to {await self.w3.eth.chain_id}")
            return connected
        except Exception as e:
            print(f"Connection failed: {e}")
            return False

    async def load_contract(self, name: str, address: str, abi_path: str) -> Contract:
        with open(abi_path, 'r') as f:
            abi = json.load(f)
        contract = self.w3.eth.contract(address=address, abi=abi)
        self.contracts[name] = contract
        return contract

    async def get_nonce(self, address: str) -> int:
        if address not in self.nonce_cache:
            self.nonce_cache[address] = await self.w3.eth.get_transaction_count(address)
        return self.nonce_cache[address]

    async def increment_nonce(self, address: str) -> None:
        self.nonce_cache[address] += 1

    async def estimate_gas(self, transaction: Dict[str, Any]) -> int:
        try:
            gas_estimate = await self.w3.eth.estimate_gas(transaction)
            return int(gas_estimate * 1.1)
        except Exception as e:
            print(f"Gas estimation failed: {e}")
            return 21000

    async def send_transaction(self, transaction: Dict[str, Any]) -> Optional[HexBytes]:
        try:
            gas = await self.estimate_gas(transaction)
            transaction['gas'] = gas
            transaction['nonce'] = await self.get_nonce(self.account.address)

            signed_txn = self.account.sign_transaction(transaction)
            tx_hash = await self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            await self.increment_nonce(self.account.address)

            receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt['status'] == 1:
                return tx_hash
            else:
                print(f"Transaction failed: {receipt}")
                return None
        except Exception as e:
            print(f"Transaction failed: {e}")
            return None

    async def call_contract_method(self, contract_name: str, method_name: str, *args) -> Any:
        if contract_name not in self.contracts:
            raise ValueError(f"Contract {contract_name} not loaded")

        contract = self.contracts[contract_name]
        method = getattr(contract.functions, method_name)
        return await method(*args).call()

    async def transact_contract_method(self, contract_name: str, method_name: str, *args, value: int = 0) -> Optional[HexBytes]:
        if contract_name not in self.contracts:
            raise ValueError(f"Contract {contract_name} not loaded")

        contract = self.contracts[contract_name]
        method = getattr(contract.functions, method_name)
        transaction = await method(*args).build_transaction({
            'from': self.account.address,
            'value': value,
            'chainId': await self.w3.eth.chain_id
        })
        return await self.send_transaction(transaction)

    async def get_balance(self, address: str) -> int:
        return await self.w3.eth.get_balance(address)

    async def get_block_number(self) -> int:
        return await self.w3.eth.block_number

    async def get_gas_price(self) -> int:
        return await self.w3.eth.gas_price

    async def get_transaction_receipt(self, tx_hash: HexBytes) -> Dict[str, Any]:
        return await self.w3.eth.get_transaction_receipt(tx_hash)

    async def get_logs(self, contract_name: str, event_name: str, from_block: int, to_block: int) -> List[Dict[str, Any]]:
        if contract_name not in self.contracts:
            raise ValueError(f"Contract {contract_name} not loaded")

        contract = self.contracts[contract_name]
        event = getattr(contract.events, event_name)
        logs = await self.w3.eth.get_logs({
            'fromBlock': from_block,
            'toBlock': to_block,
            'address': contract.address,
            'topics': [event.build_filter().topics[0]]
        })
        return [event.process_log(log) for log in logs]

    async def batch_call(self, calls: List[Dict[str, Any]]) -> List[Any]:
        batch = []
        for call in calls:
            if 'contract' in call and 'method' in call:
                contract = self.contracts[call['contract']]
                method = getattr(contract.functions, call['method'])
                batch.append(method(*call.get('args', [])))

        if batch:
            return await asyncio.gather(*[call.call() for call in batch])
        return []

    async def multicall_aggregate(self, calls: List[Dict[str, Any]]) -> List[Any]:
        if 'multicall' not in self.contracts:
            raise ValueError("Multicall contract not loaded")

        multicall = self.contracts['multicall']
        encoded_calls = []

        for call in calls:
            if 'contract' in call and 'method' in call:
                contract = self.contracts[call['contract']]
                method = getattr(contract.functions, call['method'])
                encoded_call = method(*call.get('args', [])).build_transaction()['data']
                encoded_calls.append((contract.address, encoded_call))

        if encoded_calls:
            result = await multicall.functions.aggregate(encoded_calls).call()
            return result[1]
        return []

    def format_wei_to_eth(self, wei: int) -> float:
        return float(self.w3.from_wei(wei, 'ether'))

    def format_eth_to_wei(self, eth: float) -> int:
        return self.w3.to_wei(eth, 'ether')

    async def get_token_balance(self, token_address: str, wallet_address: str) -> int:
        if 'erc20' not in self.contracts:
            erc20_abi = [
                {"constant": True, "inputs": [{"name": "_owner", "type": "address"}],
                 "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}],
                 "type": "function"}
            ]
            token_contract = self.w3.eth.contract(address=token_address, abi=erc20_abi)
        else:
            token_contract = self.contracts['erc20']
            token_contract.address = token_address

        return await token_contract.functions.balanceOf(wallet_address).call()

    async def approve_token(self, token_address: str, spender_address: str, amount: int) -> Optional[HexBytes]:
        if 'erc20' not in self.contracts:
            erc20_abi = [
                {"constant": False, "inputs": [{"name": "_spender", "type": "address"},
                                               {"name": "_value", "type": "uint256"}],
                 "name": "approve", "outputs": [{"name": "", "type": "bool"}],
                 "type": "function"}
            ]
            token_contract = self.w3.eth.contract(address=token_address, abi=erc20_abi)
        else:
            token_contract = self.contracts['erc20']
            token_contract.address = token_address

        return await self.transact_contract_method('erc20', 'approve', spender_address, amount)

async def main():
    client = SmartContractClient(
        rpc_url=os.getenv('RPC_URL', 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID'),
        private_key=os.getenv('PRIVATE_KEY', '')
    )

    connected = await client.connect()
    if not connected:
        return

    print(f"Account balance: {client.format_wei_to_eth(await client.get_balance(client.account.address))} ETH")

if __name__ == "__main__":
    asyncio.run(main())