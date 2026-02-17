use std::collections::{HashMap, BTreeMap, VecDeque};
use std::cmp::Ordering;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrderSide {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrderType {
    Limit,
    Market,
    Stop,
    StopLimit,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrderStatus {
    Pending,
    Partial,
    Filled,
    Cancelled,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TimeInForce {
    GTC, // Good Till Cancelled
    IOC, // Immediate Or Cancel
    FOK, // Fill Or Kill
    GTD, // Good Till Date
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub trader: String,
    pub symbol: String,
    pub side: OrderSide,
    pub order_type: OrderType,
    pub quantity: Decimal,
    pub price: Option<Decimal>,
    pub stop_price: Option<Decimal>,
    pub filled_quantity: Decimal,
    pub remaining_quantity: Decimal,
    pub status: OrderStatus,
    pub time_in_force: TimeInForce,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub expire_at: Option<DateTime<Utc>>,
}

impl Order {
    pub fn new(
        id: String,
        trader: String,
        symbol: String,
        side: OrderSide,
        order_type: OrderType,
        quantity: Decimal,
        price: Option<Decimal>,
        stop_price: Option<Decimal>,
        time_in_force: TimeInForce,
        expire_at: Option<DateTime<Utc>>,
    ) -> Self {
        Self {
            id,
            trader,
            symbol,
            side,
            order_type,
            quantity,
            price,
            stop_price,
            filled_quantity: Decimal::ZERO,
            remaining_quantity: quantity,
            status: OrderStatus::Pending,
            time_in_force,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            expire_at,
        }
    }

    pub fn is_expired(&self) -> bool {
        if let Some(expire_at) = self.expire_at {
            Utc::now() > expire_at
        } else {
            false
        }
    }

    pub fn update_filled(&mut self, filled_quantity: Decimal) {
        self.filled_quantity += filled_quantity;
        self.remaining_quantity -= filled_quantity;
        self.updated_at = Utc::now();

        if self.remaining_quantity == Decimal::ZERO {
            self.status = OrderStatus::Filled;
        } else {
            self.status = OrderStatus::Partial;
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    pub id: String,
    pub symbol: String,
    pub price: Decimal,
    pub quantity: Decimal,
    pub buy_order_id: String,
    pub sell_order_id: String,
    pub buyer: String,
    pub seller: String,
    pub timestamp: DateTime<Utc>,
    pub trade_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderBookLevel {
    pub price: Decimal,
    pub quantity: Decimal,
    pub order_count: usize,
}

#[derive(Debug, Clone)]
pub struct OrderBook {
    pub symbol: String,
    pub bids: BTreeMap<Decimal, VecDeque<Order>>, // Price -> Orders (sorted descending)
    pub asks: BTreeMap<Decimal, VecDeque<Order>>, // Price -> Orders (sorted ascending)
}

impl OrderBook {
    pub fn new(symbol: String) -> Self {
        Self {
            symbol,
            bids: BTreeMap::new(),
            asks: BTreeMap::new(),
        }
    }

    pub fn add_order(&mut self, order: Order) {
        let price_map = match order.side {
            OrderSide::Buy => &mut self.bids,
            OrderSide::Sell => &mut self.asks,
        };

        price_map.entry(order.price.unwrap_or(Decimal::ZERO))
            .or_insert_with(VecDeque::new)
            .push_back(order);
    }

    pub fn remove_order(&mut self, order_id: &str) -> Option<Order> {
        for (price, orders) in self.bids.iter_mut().chain(self.asks.iter_mut()) {
            if let Some(pos) = orders.iter().position(|o| o.id == order_id) {
                return orders.remove(pos);
            }
        }
        None
    }

    pub fn get_best_bid(&self) -> Option<Decimal> {
        self.bids.keys().next_back().copied()
    }

    pub fn get_best_ask(&self) -> Option<Decimal> {
        self.asks.keys().next().copied()
    }

    pub fn get_spread(&self) -> Option<Decimal> {
        if let (Some(best_bid), Some(best_ask)) = (self.get_best_bid(), self.get_best_ask()) {
            Some(best_ask - best_bid)
        } else {
            None
        }
    }

    pub fn get_bid_levels(&self, depth: usize) -> Vec<OrderBookLevel> {
        self.bids.iter().rev().take(depth).map(|(price, orders)| {
            let quantity = orders.iter().map(|o| o.remaining_quantity).sum();
            OrderBookLevel {
                price: *price,
                quantity,
                order_count: orders.len(),
            }
        }).collect()
    }

    pub fn get_ask_levels(&self, depth: usize) -> Vec<OrderBookLevel> {
        self.asks.iter().take(depth).map(|(price, orders)| {
            let quantity = orders.iter().map(|o| o.remaining_quantity).sum();
            OrderBookLevel {
                price: *price,
                quantity,
                order_count: orders.len(),
            }
        }).collect()
    }

    pub fn get_market_depth(&self, depth: usize) -> (Vec<OrderBookLevel>, Vec<OrderBookLevel>) {
        (self.get_bid_levels(depth), self.get_ask_levels(depth))
    }
}

#[derive(Debug, Clone)]
pub struct DEXEngine {
    order_books: HashMap<String, OrderBook>,
    orders: HashMap<String, Order>,
    trades: Vec<Trade>,
    user_balances: HashMap<String, HashMap<String, Decimal>>,
    order_counter: u64,
    trade_counter: u64,
}

impl DEXEngine {
    pub fn new() -> Self {
        Self {
            order_books: HashMap::new(),
            orders: HashMap::new(),
            trades: Vec::new(),
            user_balances: HashMap::new(),
            order_counter: 0,
            trade_counter: 0,
        }
    }

    pub fn add_symbol(&mut self, symbol: String) {
        self.order_books.insert(symbol, OrderBook::new(symbol));
    }

    pub fn place_order(&mut self, trader: String, symbol: String, side: OrderSide, order_type: OrderType,
                      quantity: Decimal, price: Option<Decimal>, stop_price: Option<Decimal>,
                      time_in_force: TimeInForce, expire_at: Option<DateTime<Utc>>) -> Result<String, String> {
        if !self.order_books.contains_key(&symbol) {
            return Err("Symbol not supported".to_string());
        }

        // Validate order parameters
        self.validate_order(&order_type, price, stop_price)?;

        // Check user balance for sell orders
        if side == OrderSide::Sell {
            let base_currency = self.get_base_currency(&symbol);
            let balance = self.get_user_balance(&trader, &base_currency);
            if balance < quantity {
                return Err("Insufficient balance".to_string());
            }
        }

        self.order_counter += 1;
        let order_id = format!("order_{}", self.order_counter);

        let mut order = Order::new(
            order_id.clone(),
            trader,
            symbol.clone(),
            side,
            order_type,
            quantity,
            price,
            stop_price,
            time_in_force,
            expire_at,
        );

        // Process market orders immediately
        if order_type == OrderType::Market {
            self.process_market_order(&mut order)?;
        } else {
            // Add limit orders to order book
            self.order_books.get_mut(&symbol).unwrap().add_order(order.clone());
        }

        self.orders.insert(order_id.clone(), order);
        Ok(order_id)
    }

    fn process_market_order(&mut self, order: &mut Order) -> Result<(), String> {
        let order_book = self.order_books.get_mut(&order.symbol).unwrap();

        match order.side {
            OrderSide::Buy => {
                // Match against asks (sell orders)
                self.match_market_buy_order(order, order_book)?;
            }
            OrderSide::Sell => {
                // Match against bids (buy orders)
                self.match_market_sell_order(order, order_book)?;
            }
        }

        Ok(())
    }

    fn match_market_buy_order(&mut self, order: &mut Order, order_book: &mut OrderBook) -> Result<(), String> {
        let mut remaining_quantity = order.quantity;

        while remaining_quantity > Decimal::ZERO {
            if let Some((price, orders)) = order_book.asks.iter_mut().next() {
                if orders.is_empty() {
                    continue;
                }

                let sell_order = orders.front_mut().unwrap();
                let match_quantity = remaining_quantity.min(sell_order.remaining_quantity);

                self.execute_trade(order, sell_order, *price, match_quantity);

                remaining_quantity -= match_quantity;

                if sell_order.remaining_quantity == Decimal::ZERO {
                    orders.pop_front();
                }

                if orders.is_empty() {
                    order_book.asks.remove(price);
                }
            } else {
                // No more sell orders available
                break;
            }
        }

        if remaining_quantity > Decimal::ZERO {
            order.status = OrderStatus::Partial;
            order.remaining_quantity = remaining_quantity;
        }

        Ok(())
    }

    fn match_market_sell_order(&mut self, order: &mut Order, order_book: &mut OrderBook) -> Result<(), String> {
        let mut remaining_quantity = order.quantity;

        while remaining_quantity > Decimal::ZERO {
            if let Some((price, orders)) = order_book.bids.iter_mut().rev().next() {
                if orders.is_empty() {
                    continue;
                }

                let buy_order = orders.front_mut().unwrap();
                let match_quantity = remaining_quantity.min(buy_order.remaining_quantity);

                self.execute_trade(buy_order, order, *price, match_quantity);

                remaining_quantity -= match_quantity;

                if buy_order.remaining_quantity == Decimal::ZERO {
                    orders.pop_front();
                }

                if orders.is_empty() {
                    order_book.bids.remove(price);
                }
            } else {
                // No more buy orders available
                break;
            }
        }

        if remaining_quantity > Decimal::ZERO {
            order.status = OrderStatus::Partial;
            order.remaining_quantity = remaining_quantity;
        }

        Ok(())
    }

    pub fn process_limit_order_matching(&mut self, symbol: &str) -> Result<(), String> {
        let order_book = self.order_books.get_mut(symbol)
            .ok_or_else(|| "Symbol not found".to_string())?;

        // Match buy and sell orders
        while let (Some(bid_price), Some(ask_price)) = (order_book.get_best_bid(), order_book.get_best_ask()) {
            if bid_price < ask_price {
                break; // No more matches possible
            }

            let bid_orders = order_book.bids.get_mut(&bid_price).unwrap();
            let ask_orders = order_book.asks.get_mut(&ask_price).unwrap();

            if bid_orders.is_empty() || ask_orders.is_empty() {
                break;
            }

            let buy_order = bid_orders.front_mut().unwrap();
            let sell_order = ask_orders.front_mut().unwrap();

            let match_quantity = buy_order.remaining_quantity.min(sell_order.remaining_quantity);
            let match_price = if buy_order.created_at < sell_order.created_at { bid_price } else { ask_price };

            self.execute_trade(buy_order, sell_order, match_price, match_quantity);

            if buy_order.remaining_quantity == Decimal::ZERO {
                bid_orders.pop_front();
            }
            if sell_order.remaining_quantity == Decimal::ZERO {
                ask_orders.pop_front();
            }

            if bid_orders.is_empty() {
                order_book.bids.remove(&bid_price);
            }
            if ask_orders.is_empty() {
                order_book.asks.remove(&ask_price);
            }
        }

        Ok(())
    }

    fn execute_trade(&mut self, buy_order: &mut Order, sell_order: &mut Order, price: Decimal, quantity: Decimal) {
        self.trade_counter += 1;
        let trade_id = format!("trade_{}", self.trade_counter);

        let trade = Trade {
            id: trade_id,
            symbol: buy_order.symbol.clone(),
            price,
            quantity,
            buy_order_id: buy_order.id.clone(),
            sell_order_id: sell_order.id.clone(),
            buyer: buy_order.trader.clone(),
            seller: sell_order.trader.clone(),
            timestamp: Utc::now(),
            trade_type: "limit".to_string(),
        };

        self.trades.push(trade);

        // Update order quantities
        buy_order.update_filled(quantity);
        sell_order.update_filled(quantity);

        // Update balances
        let base_currency = self.get_base_currency(&buy_order.symbol);
        let quote_currency = self.get_quote_currency(&buy_order.symbol);

        let trade_value = price * quantity;

        // Buyer: -quote_currency, +base_currency
        self.update_balance(&buy_order.trader, &quote_currency, self.get_user_balance(&buy_order.trader, &quote_currency) - trade_value);
        self.update_balance(&buy_order.trader, &base_currency, self.get_user_balance(&buy_order.trader, &base_currency) + quantity);

        // Seller: -base_currency, +quote_currency
        self.update_balance(&sell_order.trader, &base_currency, self.get_user_balance(&sell_order.trader, &base_currency) - quantity);
        self.update_balance(&sell_order.trader, &quote_currency, self.get_user_balance(&sell_order.trader, &quote_currency) + trade_value);
    }

    pub fn cancel_order(&mut self, order_id: &str, trader: &str) -> Result<(), String> {
        let order = self.orders.get(order_id)
            .ok_or_else(|| "Order not found".to_string())?;

        if order.trader != trader {
            return Err("Unauthorized".to_string());
        }

        if order.status != OrderStatus::Pending && order.status != OrderStatus::Partial {
            return Err("Order cannot be cancelled".to_string());
        }

        // Remove from order book
        if let Some(order_book) = self.order_books.get_mut(&order.symbol) {
            order_book.remove_order(order_id);
        }

        // Update order status
        let order = self.orders.get_mut(order_id).unwrap();
        order.status = OrderStatus::Cancelled;
        order.updated_at = Utc::now();

        Ok(())
    }

    pub fn get_order(&self, order_id: &str) -> Option<Order> {
        self.orders.get(order_id).cloned()
    }

    pub fn get_user_orders(&self, trader: &str) -> Vec<Order> {
        self.orders.values()
            .filter(|order| order.trader == trader)
            .cloned()
            .collect()
    }

    pub fn get_order_book(&self, symbol: &str) -> Option<OrderBook> {
        self.order_books.get(symbol).cloned()
    }

    pub fn get_recent_trades(&self, symbol: &str, limit: usize) -> Vec<Trade> {
        self.trades.iter()
            .filter(|trade| trade.symbol == symbol)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    pub fn get_ticker(&self, symbol: &str) -> Option<HashMap<String, Decimal>> {
        let trades: Vec<&Trade> = self.trades.iter()
            .filter(|trade| trade.symbol == symbol)
            .collect();

        if trades.is_empty() {
            return None;
        }

        let last_trade = trades.last().unwrap();
        let mut prices: Vec<Decimal> = trades.iter().map(|t| t.price).collect();
        prices.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));

        let mut ticker = HashMap::new();
        ticker.insert("last_price".to_string(), last_trade.price);
        ticker.insert("bid".to_string(), self.order_books.get(symbol)?.get_best_bid().unwrap_or(Decimal::ZERO));
        ticker.insert("ask".to_string(), self.order_books.get(symbol)?.get_best_ask().unwrap_or(Decimal::ZERO));
        ticker.insert("high".to_string(), *prices.last().unwrap_or(&Decimal::ZERO));
        ticker.insert("low".to_string(), *prices.first().unwrap_or(&Decimal::ZERO));
        ticker.insert("volume".to_string(), trades.iter().map(|t| t.quantity).sum());

        Some(ticker)
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

    pub fn deposit(&mut self, user: &str, currency: &str, amount: Decimal) {
        let current_balance = self.get_user_balance(user, currency);
        self.update_balance(user, currency, current_balance + amount);
    }

    pub fn withdraw(&mut self, user: &str, currency: &str, amount: Decimal) -> Result<(), String> {
        let current_balance = self.get_user_balance(user, currency);
        if current_balance < amount {
            return Err("Insufficient balance".to_string());
        }
        self.update_balance(user, currency, current_balance - amount);
        Ok(())
    }

    fn validate_order(&self, order_type: &OrderType, price: Option<Decimal>, stop_price: Option<Decimal>) -> Result<(), String> {
        match order_type {
            OrderType::Limit => {
                if price.is_none() || price.unwrap() <= Decimal::ZERO {
                    return Err("Limit orders must have a valid price".to_string());
                }
            }
            OrderType::Stop => {
                if stop_price.is_none() || stop_price.unwrap() <= Decimal::ZERO {
                    return Err("Stop orders must have a valid stop price".to_string());
                }
            }
            OrderType::StopLimit => {
                if price.is_none() || stop_price.is_none() ||
                   price.unwrap() <= Decimal::ZERO || stop_price.unwrap() <= Decimal::ZERO {
                    return Err("Stop-limit orders must have valid price and stop price".to_string());
                }
            }
            OrderType::Market => {
                // Market orders don't need price validation
            }
        }
        Ok(())
    }

    fn get_base_currency(&self, symbol: &str) -> String {
        // Simple implementation - in real DEX, this would be configurable
        symbol.split('/').next().unwrap_or("BASE").to_string()
    }

    fn get_quote_currency(&self, symbol: &str) -> String {
        // Simple implementation - in real DEX, this would be configurable
        symbol.split('/').nth(1).unwrap_or("QUOTE").to_string()
    }

    pub fn process_pending_orders(&mut self) {
        let expired_orders: Vec<String> = self.orders.iter()
            .filter(|(_, order)| order.status == OrderStatus::Pending && order.is_expired())
            .map(|(id, _)| id.clone())
            .collect();

        for order_id in expired_orders {
            if let Some(order) = self.orders.get_mut(&order_id) {
                order.status = OrderStatus::Expired;
                // Remove from order book
                if let Some(order_book) = self.order_books.get_mut(&order.symbol) {
                    order_book.remove_order(&order_id);
                }
            }
        }
    }

    pub fn get_market_stats(&self) -> HashMap<String, String> {
        let mut stats = HashMap::new();

        let total_symbols = self.order_books.len();
        stats.insert("total_symbols".to_string(), total_symbols.to_string());

        let total_orders = self.orders.len();
        stats.insert("total_orders".to_string(), total_orders.to_string());

        let total_trades = self.trades.len();
        stats.insert("total_trades".to_string(), total_trades.to_string());

        let total_users = self.user_balances.len();
        stats.insert("total_users".to_string(), total_users.to_string());

        stats
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_place_limit_order() {
        let mut dex = DEXEngine::new();
        dex.add_symbol("ETH/USDC".to_string());

        dex.deposit("trader1", "USDC", Decimal::new(10000, 0));

        let result = dex.place_order(
            "trader1".to_string(),
            "ETH/USDC".to_string(),
            OrderSide::Buy,
            OrderType::Limit,
            Decimal::new(1, 0),
            Some(Decimal::new(2000, 0)),
            None,
            TimeInForce::GTC,
            None,
        );

        assert!(result.is_ok());
    }

    #[test]
    fn test_market_order_matching() {
        let mut dex = DEXEngine::new();
        dex.add_symbol("ETH/USDC".to_string());

        // Add sell order
        dex.deposit("seller1", "ETH", Decimal::new(1, 0));
        dex.place_order(
            "seller1".to_string(),
            "ETH/USDC".to_string(),
            OrderSide::Sell,
            OrderType::Limit,
            Decimal::new(1, 0),
            Some(Decimal::new(2000, 0)),
            None,
            TimeInForce::GTC,
            None,
        ).unwrap();

        // Add buy order
        dex.deposit("buyer1", "USDC", Decimal::new(2000, 0));
        dex.place_order(
            "buyer1".to_string(),
            "ETH/USDC".to_string(),
            OrderSide::Buy,
            OrderType::Market,
            Decimal::new(1, 0),
            None,
            None,
            TimeInForce::GTC,
            None,
        ).unwrap();

        // Check that trade occurred
        assert_eq!(dex.trades.len(), 1);
        assert_eq!(dex.get_user_balance("buyer1", "ETH"), Decimal::new(1, 0));
        assert_eq!(dex.get_user_balance("seller1", "USDC"), Decimal::new(2000, 0));
    }

    #[test]
    fn test_cancel_order() {
        let mut dex = DEXEngine::new();
        dex.add_symbol("ETH/USDC".to_string());

        dex.deposit("trader1", "USDC", Decimal::new(10000, 0));

        let order_id = dex.place_order(
            "trader1".to_string(),
            "ETH/USDC".to_string(),
            OrderSide::Buy,
            OrderType::Limit,
            Decimal::new(1, 0),
            Some(Decimal::new(2000, 0)),
            None,
            TimeInForce::GTC,
            None,
        ).unwrap();

        let result = dex.cancel_order(&order_id, "trader1");
        assert!(result.is_ok());

        let order = dex.get_order(&order_id).unwrap();
        assert_eq!(order.status, OrderStatus::Cancelled);
    }
}