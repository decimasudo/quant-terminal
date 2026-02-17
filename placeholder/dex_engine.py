import asyncio
import math
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from decimal import Decimal, getcontext
from collections import defaultdict
import time
from enum import Enum

getcontext().prec = 28

class OrderType(Enum):
    LIMIT = "limit"
    MARKET = "market"

class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"

class OrderStatus(Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"

@dataclass
class Order:
    id: str
    trader: str
    side: OrderSide
    type: OrderType
    symbol: str
    amount: Decimal
    price: Optional[Decimal]
    filled_amount: Decimal = Decimal('0')
    status: OrderStatus = OrderStatus.PENDING
    timestamp: float = field(default_factory=time.time)
    trades: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class Trade:
    id: str
    symbol: str
    price: Decimal
    amount: Decimal
    buyer: str
    seller: str
    timestamp: float
    buy_order_id: str
    sell_order_id: str

@dataclass
class OrderBook:
    symbol: str
    bids: List[Order] = field(default_factory=list)
    asks: List[Order] = field(default_factory=list)

    def add_order(self, order: Order) -> None:
        if order.side == OrderSide.BUY:
            self.bids.append(order)
            self.bids.sort(key=lambda x: (-x.price, x.timestamp))
        else:
            self.asks.append(order)
            self.asks.sort(key=lambda x: (x.price, x.timestamp))

    def remove_order(self, order_id: str) -> bool:
        for order_list in [self.bids, self.asks]:
            for i, order in enumerate(order_list):
                if order.id == order_id:
                    order_list.pop(i)
                    return True
        return False

    def get_best_bid(self) -> Optional[Order]:
        return self.bids[0] if self.bids else None

    def get_best_ask(self) -> Optional[Order]:
        return self.asks[0] if self.asks else None

    def get_spread(self) -> Optional[Decimal]:
        best_bid = self.get_best_bid()
        best_ask = self.get_best_ask()
        if best_bid and best_ask:
            return best_ask.price - best_bid.price
        return None

class DEXEngine:
    def __init__(self):
        self.order_books: Dict[str, OrderBook] = {}
        self.orders: Dict[str, Order] = {}
        self.trades: List[Trade] = []
        self.balances: Dict[str, Dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
        self.order_counter = 0
        self.trade_counter = 0

    def create_order_book(self, symbol: str) -> None:
        if symbol not in self.order_books:
            self.order_books[symbol] = OrderBook(symbol)

    def place_order(self, trader: str, side: OrderSide, order_type: OrderType,
                   symbol: str, amount: Decimal, price: Optional[Decimal] = None) -> str:
        if symbol not in self.order_books:
            self.create_order_book(symbol)

        self.order_counter += 1
        order_id = f"order_{self.order_counter}"

        order = Order(
            id=order_id,
            trader=trader,
            side=side,
            type=order_type,
            symbol=symbol,
            amount=amount,
            price=price
        )

        self.orders[order_id] = order

        if order_type == OrderType.MARKET:
            return self._process_market_order(order)
        else:
            return self._process_limit_order(order)

    def _process_market_order(self, order: Order) -> str:
        remaining_amount = order.amount
        order_book = self.order_books[order.symbol]

        if order.side == OrderSide.BUY:
            while remaining_amount > 0 and order_book.asks:
                best_ask = order_book.get_best_ask()
                if not best_ask:
                    break

                trade_amount = min(remaining_amount, best_ask.amount - best_ask.filled_amount)
                trade_price = best_ask.price

                if not self._execute_trade(order, best_ask, trade_amount, trade_price):
                    break

                remaining_amount -= trade_amount

                if best_ask.filled_amount >= best_ask.amount:
                    order_book.remove_order(best_ask.id)
                    best_ask.status = OrderStatus.FILLED
                else:
                    best_ask.status = OrderStatus.PARTIAL
        else:
            while remaining_amount > 0 and order_book.bids:
                best_bid = order_book.get_best_bid()
                if not best_bid:
                    break

                trade_amount = min(remaining_amount, best_bid.amount - best_bid.filled_amount)
                trade_price = best_bid.price

                if not self._execute_trade(best_bid, order, trade_amount, trade_price):
                    break

                remaining_amount -= trade_amount

                if best_bid.filled_amount >= best_bid.amount:
                    order_book.remove_order(best_bid.id)
                    best_bid.status = OrderStatus.FILLED
                else:
                    best_bid.status = OrderStatus.PARTIAL

        if remaining_amount == 0:
            order.status = OrderStatus.FILLED
        elif remaining_amount < order.amount:
            order.status = OrderStatus.PARTIAL
        else:
            order.status = OrderStatus.CANCELLED

        return order.id

    def _process_limit_order(self, order: Order) -> str:
        order_book = self.order_books[order.symbol]

        if order.side == OrderSide.BUY:
            while order.amount > order.filled_amount and order_book.asks:
                best_ask = order_book.get_best_ask()
                if not best_ask or best_ask.price > order.price:
                    break

                trade_amount = min(order.amount - order.filled_amount,
                                 best_ask.amount - best_ask.filled_amount)
                trade_price = best_ask.price

                if not self._execute_trade(order, best_ask, trade_amount, trade_price):
                    break

                if best_ask.filled_amount >= best_ask.amount:
                    order_book.remove_order(best_ask.id)
                    best_ask.status = OrderStatus.FILLED
                else:
                    best_ask.status = OrderStatus.PARTIAL

            if order.filled_amount == 0:
                order_book.add_order(order)
            elif order.filled_amount < order.amount:
                order.status = OrderStatus.PARTIAL
                order_book.add_order(order)
            else:
                order.status = OrderStatus.FILLED
        else:
            while order.amount > order.filled_amount and order_book.bids:
                best_bid = order_book.get_best_bid()
                if not best_bid or best_bid.price < order.price:
                    break

                trade_amount = min(order.amount - order.filled_amount,
                                 best_bid.amount - best_bid.filled_amount)
                trade_price = best_bid.price

                if not self._execute_trade(best_bid, order, trade_amount, trade_price):
                    break

                if best_bid.filled_amount >= best_bid.amount:
                    order_book.remove_order(best_bid.id)
                    best_bid.status = OrderStatus.FILLED
                else:
                    best_bid.status = OrderStatus.PARTIAL

            if order.filled_amount == 0:
                order_book.add_order(order)
            elif order.filled_amount < order.amount:
                order.status = OrderStatus.PARTIAL
                order_book.add_order(order)
            else:
                order.status = OrderStatus.FILLED

        return order.id

    def _execute_trade(self, buy_order: Order, sell_order: Order, amount: Decimal, price: Decimal) -> bool:
        buy_trader = buy_order.trader
        sell_trader = sell_order.trader
        symbol = buy_order.symbol

        base_currency, quote_currency = symbol.split('/')

        buy_cost = amount * price
        sell_revenue = amount * price

        if self.balances[buy_trader][quote_currency] < buy_cost:
            return False

        if self.balances[sell_trader][base_currency] < amount:
            return False

        self.balances[buy_trader][quote_currency] -= buy_cost
        self.balances[buy_trader][base_currency] += amount

        self.balances[sell_trader][base_currency] -= amount
        self.balances[sell_trader][quote_currency] += sell_revenue

        buy_order.filled_amount += amount
        sell_order.filled_amount += amount

        self.trade_counter += 1
        trade = Trade(
            id=f"trade_{self.trade_counter}",
            symbol=symbol,
            price=price,
            amount=amount,
            buyer=buy_trader,
            seller=sell_trader,
            timestamp=time.time(),
            buy_order_id=buy_order.id,
            sell_order_id=sell_order.id
        )

        self.trades.append(trade)
        buy_order.trades.append({
            'trade_id': trade.id,
            'amount': float(amount),
            'price': float(price),
            'counterparty': sell_trader
        })
        sell_order.trades.append({
            'trade_id': trade.id,
            'amount': float(amount),
            'price': float(price),
            'counterparty': buy_trader
        })

        return True

    def cancel_order(self, order_id: str, trader: str) -> bool:
        if order_id not in self.orders:
            return False

        order = self.orders[order_id]
        if order.trader != trader or order.status not in [OrderStatus.PENDING, OrderStatus.PARTIAL]:
            return False

        order_book = self.order_books[order.symbol]
        order_book.remove_order(order_id)
        order.status = OrderStatus.CANCELLED

        return True

    def deposit_funds(self, trader: str, currency: str, amount: Decimal) -> None:
        self.balances[trader][currency] += amount

    def withdraw_funds(self, trader: str, currency: str, amount: Decimal) -> bool:
        if self.balances[trader][currency] < amount:
            return False
        self.balances[trader][currency] -= amount
        return True

    def get_balance(self, trader: str, currency: str) -> Decimal:
        return self.balances[trader][currency]

    def get_order_book(self, symbol: str) -> Dict[str, List[Dict[str, Any]]]:
        if symbol not in self.order_books:
            return {'bids': [], 'asks': []}

        order_book = self.order_books[symbol]
        return {
            'bids': [
                {
                    'price': float(order.price),
                    'amount': float(order.amount - order.filled_amount),
                    'total': float((order.amount - order.filled_amount) * order.price)
                }
                for order in order_book.bids[:10]
            ],
            'asks': [
                {
                    'price': float(order.price),
                    'amount': float(order.amount - order.filled_amount),
                    'total': float((order.amount - order.filled_amount) * order.price)
                }
                for order in order_book.asks[:10]
            ]
        }

    def get_recent_trades(self, symbol: str, limit: int = 50) -> List[Dict[str, Any]]:
        symbol_trades = [trade for trade in reversed(self.trades) if trade.symbol == symbol]
        return [
            {
                'id': trade.id,
                'price': float(trade.price),
                'amount': float(trade.amount),
                'total': float(trade.price * trade.amount),
                'buyer': trade.buyer,
                'seller': trade.seller,
                'timestamp': trade.timestamp
            }
            for trade in symbol_trades[:limit]
        ]

    def get_order_status(self, order_id: str) -> Optional[Dict[str, Any]]:
        if order_id not in self.orders:
            return None

        order = self.orders[order_id]
        return {
            'id': order.id,
            'status': order.status.value,
            'filled_amount': float(order.filled_amount),
            'remaining_amount': float(order.amount - order.filled_amount),
            'price': float(order.price) if order.price else None,
            'trades': order.trades
        }

    def get_user_orders(self, trader: str, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        user_orders = []
        for order in self.orders.values():
            if order.trader == trader and (symbol is None or order.symbol == symbol):
                user_orders.append({
                    'id': order.id,
                    'symbol': order.symbol,
                    'side': order.side.value,
                    'type': order.type.value,
                    'amount': float(order.amount),
                    'price': float(order.price) if order.price else None,
                    'filled_amount': float(order.filled_amount),
                    'status': order.status.value,
                    'timestamp': order.timestamp
                })
        return sorted(user_orders, key=lambda x: x['timestamp'], reverse=True)

    def get_market_stats(self, symbol: str) -> Dict[str, Any]:
        if symbol not in self.order_books:
            return {}

        order_book = self.order_books[symbol]
        recent_trades = self.get_recent_trades(symbol, 100)

        if not recent_trades:
            return {
                'symbol': symbol,
                'spread': float(order_book.get_spread()) if order_book.get_spread() else None,
                'bid_depth': len(order_book.bids),
                'ask_depth': len(order_book.asks),
                'last_price': None,
                'volume_24h': 0,
                'high_24h': None,
                'low_24h': None
            }

        last_price = recent_trades[0]['price']
        volume_24h = sum(trade['total'] for trade in recent_trades)
        prices_24h = [trade['price'] for trade in recent_trades]
        high_24h = max(prices_24h)
        low_24h = min(prices_24h)

        return {
            'symbol': symbol,
            'spread': float(order_book.get_spread()) if order_book.get_spread() else None,
            'bid_depth': len(order_book.bids),
            'ask_depth': len(order_book.asks),
            'last_price': last_price,
            'volume_24h': volume_24h,
            'high_24h': high_24h,
            'low_24h': low_24h
        }

    def get_all_symbols(self) -> List[str]:
        return list(self.order_books.keys())

    def get_system_status(self) -> Dict[str, Any]:
        total_orders = len(self.orders)
        active_orders = len([o for o in self.orders.values()
                           if o.status in [OrderStatus.PENDING, OrderStatus.PARTIAL]])
        total_trades = len(self.trades)
        total_users = len(self.balances)

        return {
            'total_orders': total_orders,
            'active_orders': active_orders,
            'total_trades': total_trades,
            'total_users': total_users,
            'symbols': self.get_all_symbols()
        }

async def main():
    dex = DEXEngine()

    dex.deposit_funds("trader1", "ETH", Decimal('10'))
    dex.deposit_funds("trader1", "USDC", Decimal('10000'))
    dex.deposit_funds("trader2", "ETH", Decimal('5'))
    dex.deposit_funds("trader2", "USDC", Decimal('5000'))

    dex.place_order("trader2", OrderSide.SELL, OrderType.LIMIT, "ETH/USDC", Decimal('2'), Decimal('2000'))
    dex.place_order("trader1", OrderSide.BUY, OrderType.MARKET, "ETH/USDC", Decimal('1'))

    print("Order book:", dex.get_order_book("ETH/USDC"))
    print("Recent trades:", dex.get_recent_trades("ETH/USDC"))
    print("Trader1 balance ETH:", dex.get_balance("trader1", "ETH"))
    print("Trader1 balance USDC:", dex.get_balance("trader1", "USDC"))

if __name__ == "__main__":
    asyncio.run(main())