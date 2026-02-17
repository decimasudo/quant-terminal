import asyncio
import math
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal, getcontext
import time
from dataclasses import dataclass
from enum import Enum

getcontext().prec = 28

class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

@dataclass
class Order:
    id: str
    type: OrderType
    side: OrderSide
    amount: Decimal
    price: Optional[Decimal]
    timestamp: int
    status: str = "pending"

@dataclass
class LiquidityPool:
    token_a: str
    token_b: str
    reserve_a: Decimal
    reserve_b: Decimal
    fee: Decimal = Decimal('0.003')

class DeFiProtocol:
    def __init__(self):
        self.pools: Dict[str, LiquidityPool] = {}
        self.orders: Dict[str, Order] = {}
        self.balances: Dict[str, Dict[str, Decimal]] = {}
        self.order_counter = 0

    def create_pool(self, token_a: str, token_b: str, amount_a: Decimal, amount_b: Decimal) -> str:
        pool_id = f"{token_a}_{token_b}"
        pool = LiquidityPool(token_a, token_b, amount_a, amount_b)
        self.pools[pool_id] = pool
        return pool_id

    def add_liquidity(self, pool_id: str, amount_a: Decimal, amount_b: Decimal, user: str) -> bool:
        if pool_id not in self.pools:
            return False

        pool = self.pools[pool_id]

        if user not in self.balances:
            self.balances[user] = {}

        if pool.token_a not in self.balances[user]:
            self.balances[user][pool.token_a] = Decimal('0')
        if pool.token_b not in self.balances[user]:
            self.balances[user][pool.token_b] = Decimal('0')

        if self.balances[user][pool.token_a] < amount_a or self.balances[user][pool.token_b] < amount_b:
            return False

        self.balances[user][pool.token_a] -= amount_a
        self.balances[user][pool.token_b] -= amount_b

        pool.reserve_a += amount_a
        pool.reserve_b += amount_b

        return True

    def remove_liquidity(self, pool_id: str, liquidity_amount: Decimal, user: str) -> Tuple[Decimal, Decimal]:
        if pool_id not in self.pools:
            return Decimal('0'), Decimal('0')

        pool = self.pools[pool_id]
        total_liquidity = pool.reserve_a * pool.reserve_b

        if total_liquidity == 0:
            return Decimal('0'), Decimal('0')

        amount_a = (liquidity_amount * pool.reserve_a) / total_liquidity
        amount_b = (liquidity_amount * pool.reserve_b) / total_liquidity

        if amount_a > pool.reserve_a or amount_b > pool.reserve_b:
            return Decimal('0'), Decimal('0')

        pool.reserve_a -= amount_a
        pool.reserve_b -= amount_b

        if user not in self.balances:
            self.balances[user] = {}

        if pool.token_a not in self.balances[user]:
            self.balances[user][pool.token_a] = Decimal('0')
        if pool.token_b not in self.balances[user]:
            self.balances[user][pool.token_b] = Decimal('0')

        self.balances[user][pool.token_a] += amount_a
        self.balances[user][pool.token_b] += amount_b

        return amount_a, amount_b

    def get_amount_out(self, pool_id: str, amount_in: Decimal, token_in: str) -> Decimal:
        if pool_id not in self.pools:
            return Decimal('0')

        pool = self.pools[pool_id]

        if token_in == pool.token_a:
            reserve_in, reserve_out = pool.reserve_a, pool.reserve_b
        elif token_in == pool.token_b:
            reserve_in, reserve_out = pool.reserve_b, pool.reserve_a
        else:
            return Decimal('0')

        if reserve_in == 0 or reserve_out == 0:
            return Decimal('0')

        amount_in_with_fee = amount_in * (Decimal('1') - pool.fee)
        numerator = amount_in_with_fee * reserve_out
        denominator = reserve_in + amount_in_with_fee

        return numerator / denominator

    def swap(self, pool_id: str, amount_in: Decimal, token_in: str, user: str) -> Decimal:
        if pool_id not in self.pools:
            return Decimal('0')

        pool = self.pools[pool_id]
        amount_out = self.get_amount_out(pool_id, amount_in, token_in)

        if amount_out == 0:
            return Decimal('0')

        if user not in self.balances:
            self.balances[user] = {}

        if token_in not in self.balances[user] or self.balances[user][token_in] < amount_in:
            return Decimal('0')

        self.balances[user][token_in] -= amount_in

        if token_in == pool.token_a:
            pool.reserve_a += amount_in
            pool.reserve_b -= amount_out
            token_out = pool.token_b
        else:
            pool.reserve_b += amount_in
            pool.reserve_a -= amount_out
            token_out = pool.token_a

        if token_out not in self.balances[user]:
            self.balances[user][token_out] = Decimal('0')

        self.balances[user][token_out] += amount_out

        return amount_out

    def create_order(self, type: OrderType, side: OrderSide, amount: Decimal,
                    price: Optional[Decimal], user: str) -> str:
        self.order_counter += 1
        order_id = f"order_{self.order_counter}"

        order = Order(
            id=order_id,
            type=type,
            side=side,
            amount=amount,
            price=price,
            timestamp=int(time.time())
        )

        self.orders[order_id] = order
        return order_id

    def cancel_order(self, order_id: str, user: str) -> bool:
        if order_id not in self.orders:
            return False

        order = self.orders[order_id]
        if order.status != "pending":
            return False

        order.status = "cancelled"
        return True

    def execute_market_order(self, order_id: str) -> bool:
        if order_id not in self.orders:
            return False

        order = self.orders[order_id]
        if order.type != OrderType.MARKET or order.status != "pending":
            return False

        order.status = "executed"
        return True

    def execute_limit_order(self, order_id: str, current_price: Decimal) -> bool:
        if order_id not in self.orders:
            return False

        order = self.orders[order_id]
        if order.type != OrderType.LIMIT or order.status != "pending" or order.price is None:
            return False

        execute = False
        if order.side == OrderSide.BUY and current_price <= order.price:
            execute = True
        elif order.side == OrderSide.SELL and current_price >= order.price:
            execute = True

        if execute:
            order.status = "executed"
            return True

        return False

    def get_pool_price(self, pool_id: str) -> Decimal:
        if pool_id not in self.pools:
            return Decimal('0')

        pool = self.pools[pool_id]
        if pool.reserve_b == 0:
            return Decimal('0')

        return pool.reserve_a / pool.reserve_b

    def get_user_balance(self, user: str, token: str) -> Decimal:
        if user not in self.balances:
            return Decimal('0')

        if token not in self.balances[user]:
            return Decimal('0')

        return self.balances[user][token]

    def deposit_token(self, user: str, token: str, amount: Decimal) -> None:
        if user not in self.balances:
            self.balances[user] = {}

        if token not in self.balances[user]:
            self.balances[user][token] = Decimal('0')

        self.balances[user][token] += amount

    def withdraw_token(self, user: str, token: str, amount: Decimal) -> bool:
        balance = self.get_user_balance(user, token)
        if balance < amount:
            return False

        self.balances[user][token] -= amount
        return True

    def get_total_value_locked(self, pool_id: str) -> Decimal:
        if pool_id not in self.pools:
            return Decimal('0')

        pool = self.pools[pool_id]
        return pool.reserve_a + pool.reserve_b

    def calculate_impermanent_loss(self, pool_id: str, initial_ratio: Decimal, current_ratio: Decimal) -> Decimal:
        if pool_id not in self.pools:
            return Decimal('0')

        ratio_diff = abs(initial_ratio - current_ratio)
        return Decimal('2') * (ratio_diff / (initial_ratio + current_ratio)) ** 2

    def get_pool_info(self, pool_id: str) -> Optional[Dict[str, Any]]:
        if pool_id not in self.pools:
            return None

        pool = self.pools[pool_id]
        return {
            'token_a': pool.token_a,
            'token_b': pool.token_b,
            'reserve_a': pool.reserve_a,
            'reserve_b': pool.reserve_b,
            'fee': pool.fee,
            'price': self.get_pool_price(pool_id),
            'tvl': self.get_total_value_locked(pool_id)
        }

    def get_user_positions(self, user: str) -> Dict[str, Any]:
        positions = {}
        for pool_id, pool in self.pools.items():
            balance_a = self.get_user_balance(user, pool.token_a)
            balance_b = self.get_user_balance(user, pool.token_b)
            if balance_a > 0 or balance_b > 0:
                positions[pool_id] = {
                    'token_a_balance': balance_a,
                    'token_b_balance': balance_b,
                    'pool_info': self.get_pool_info(pool_id)
                }
        return positions

async def main():
    protocol = DeFiProtocol()

    protocol.deposit_token("user1", "ETH", Decimal('10'))
    protocol.deposit_token("user1", "USDC", Decimal('10000'))

    pool_id = protocol.create_pool("ETH", "USDC", Decimal('1'), Decimal('2000'))

    success = protocol.add_liquidity(pool_id, Decimal('1'), Decimal('2000'), "user1")
    print(f"Liquidity addition: {success}")

    amount_out = protocol.swap(pool_id, Decimal('0.1'), "ETH", "user1")
    print(f"Swap result: {amount_out}")

    print(f"User balance ETH: {protocol.get_user_balance('user1', 'ETH')}")
    print(f"User balance USDC: {protocol.get_user_balance('user1', 'USDC')}")

if __name__ == "__main__":
    asyncio.run(main())