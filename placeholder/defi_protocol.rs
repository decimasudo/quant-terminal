use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use rust_decimal::Decimal;
use rust_decimal::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityPool {
    pub token_a: String,
    pub token_b: String,
    pub reserve_a: Decimal,
    pub reserve_b: Decimal,
    pub fee: Decimal,
    pub total_liquidity: Decimal,
    pub k_constant: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolShare {
    pub user: String,
    pub pool_id: String,
    pub liquidity_tokens: Decimal,
    pub token_a_share: Decimal,
    pub token_b_share: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderType {
    Market,
    Limit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderSide {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderStatus {
    Pending,
    Partial,
    Filled,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub trader: String,
    pub order_type: OrderType,
    pub side: OrderSide,
    pub symbol: String,
    pub amount: Decimal,
    pub price: Option<Decimal>,
    pub filled_amount: Decimal,
    pub status: OrderStatus,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    pub id: String,
    pub symbol: String,
    pub price: Decimal,
    pub amount: Decimal,
    pub buyer: String,
    pub seller: String,
    pub timestamp: DateTime<Utc>,
    pub buy_order_id: String,
    pub sell_order_id: String,
}

#[derive(Debug, Clone)]
pub struct DeFiProtocol {
    pools: HashMap<String, LiquidityPool>,
    user_balances: HashMap<String, HashMap<String, Decimal>>,
    pool_shares: HashMap<String, Vec<PoolShare>>,
    orders: HashMap<String, Order>,
    trades: Vec<Trade>,
    order_counter: u64,
    trade_counter: u64,
}

impl DeFiProtocol {
    pub fn new() -> Self {
        Self {
            pools: HashMap::new(),
            user_balances: HashMap::new(),
            pool_shares: HashMap::new(),
            orders: HashMap::new(),
            trades: Vec::new(),
            order_counter: 0,
            trade_counter: 0,
        }
    }

    pub fn create_pool(&mut self, token_a: String, token_b: String, amount_a: Decimal, amount_b: Decimal) -> Result<String, String> {
        let pool_id = format!("{}_{}", token_a, token_b);

        if self.pools.contains_key(&pool_id) {
            return Err("Pool already exists".to_string());
        }

        let k_constant = amount_a * amount_b;

        let pool = LiquidityPool {
            token_a: token_a.clone(),
            token_b: token_b.clone(),
            reserve_a: amount_a,
            reserve_b: amount_b,
            fee: Decimal::new(3, 3), // 0.3%
            total_liquidity: amount_a + amount_b,
            k_constant,
        };

        self.pools.insert(pool_id.clone(), pool);
        self.pool_shares.insert(pool_id.clone(), Vec::new());

        Ok(pool_id)
    }

    pub fn add_liquidity(&mut self, pool_id: &str, user: &str, amount_a: Decimal, amount_b: Decimal) -> Result<Decimal, String> {
        let pool = self.pools.get_mut(pool_id)
            .ok_or_else(|| "Pool not found".to_string())?;

        let user_balance_a = self.get_user_balance(user, &pool.token_a);
        let user_balance_b = self.get_user_balance(user, &pool.token_b);

        if user_balance_a < amount_a || user_balance_b < amount_b {
            return Err("Insufficient balance".to_string());
        }

        let liquidity_minted = if pool.total_liquidity == Decimal::ZERO {
            (amount_a + amount_b).sqrt().ok_or("Square root calculation failed")?
        } else {
            let liquidity_a = (amount_a / pool.reserve_a) * pool.total_liquidity;
            let liquidity_b = (amount_b / pool.reserve_b) * pool.total_liquidity;
            liquidity_a.min(liquidity_b)
        };

        pool.reserve_a += amount_a;
        pool.reserve_b += amount_b;
        pool.total_liquidity += liquidity_minted;
        pool.k_constant = pool.reserve_a * pool.reserve_b;

        self.update_balance(user, &pool.token_a, user_balance_a - amount_a);
        self.update_balance(user, &pool.token_b, user_balance_b - amount_b);

        let share = PoolShare {
            user: user.to_string(),
            pool_id: pool_id.to_string(),
            liquidity_tokens: liquidity_minted,
            token_a_share: amount_a,
            token_b_share: amount_b,
        };

        self.pool_shares.get_mut(pool_id).unwrap().push(share);

        Ok(liquidity_minted)
    }

    pub fn remove_liquidity(&mut self, pool_id: &str, user: &str, liquidity_amount: Decimal) -> Result<(Decimal, Decimal), String> {
        let pool = self.pools.get_mut(pool_id)
            .ok_or_else(|| "Pool not found".to_string())?;

        let shares = self.pool_shares.get_mut(pool_id)
            .ok_or_else(|| "Pool shares not found".to_string())?;

        let user_share_index = shares.iter().position(|s| s.user == user && s.liquidity_tokens >= liquidity_amount)
            .ok_or_else(|| "Insufficient liquidity tokens".to_string())?;

        let share = &mut shares[user_share_index];

        if share.liquidity_tokens < liquidity_amount {
            return Err("Insufficient liquidity tokens".to_string());
        }

        let token_a_amount = (liquidity_amount / pool.total_liquidity) * pool.reserve_a;
        let token_b_amount = (liquidity_amount / pool.total_liquidity) * pool.reserve_b;

        if token_a_amount > pool.reserve_a || token_b_amount > pool.reserve_b {
            return Err("Insufficient pool reserves".to_string());
        }

        pool.reserve_a -= token_a_amount;
        pool.reserve_b -= token_b_amount;
        pool.total_liquidity -= liquidity_amount;
        pool.k_constant = pool.reserve_a * pool.reserve_b;

        share.liquidity_tokens -= liquidity_amount;

        if share.liquidity_tokens == Decimal::ZERO {
            shares.remove(user_share_index);
        }

        let user_balance_a = self.get_user_balance(user, &pool.token_a);
        let user_balance_b = self.get_user_balance(user, &pool.token_b);

        self.update_balance(user, &pool.token_a, user_balance_a + token_a_amount);
        self.update_balance(user, &pool.token_b, user_balance_b + token_b_amount);

        Ok((token_a_amount, token_b_amount))
    }

    pub fn get_amount_out(&self, pool_id: &str, amount_in: Decimal, token_in: &str) -> Result<Decimal, String> {
        let pool = self.pools.get(pool_id)
            .ok_or_else(|| "Pool not found".to_string())?;

        let (reserve_in, reserve_out) = if token_in == pool.token_a {
            (pool.reserve_a, pool.reserve_b)
        } else if token_in == pool.token_b {
            (pool.reserve_b, pool.reserve_a)
        } else {
            return Err("Invalid token".to_string());
        };

        if reserve_in == Decimal::ZERO || reserve_out == Decimal::ZERO {
            return Err("Insufficient liquidity".to_string());
        }

        let amount_in_with_fee = amount_in * (Decimal::ONE - pool.fee);
        let numerator = amount_in_with_fee * reserve_out;
        let denominator = reserve_in + amount_in_with_fee;

        Ok(numerator / denominator)
    }

    pub fn swap(&mut self, pool_id: &str, user: &str, amount_in: Decimal, token_in: &str) -> Result<Decimal, String> {
        let amount_out = self.get_amount_out(pool_id, amount_in, token_in)?;

        let pool = self.pools.get_mut(pool_id)
            .ok_or_else(|| "Pool not found".to_string())?;

        let user_balance_in = self.get_user_balance(user, token_in);
        if user_balance_in < amount_in {
            return Err("Insufficient balance".to_string());
        }

        let (token_out, reserve_in, reserve_out) = if token_in == pool.token_a {
            (&pool.token_b, &mut pool.reserve_a, &mut pool.reserve_b)
        } else {
            (&pool.token_a, &mut pool.reserve_b, &mut pool.reserve_a)
        };

        *reserve_in += amount_in;
        *reserve_out -= amount_out;
        pool.k_constant = pool.reserve_a * pool.reserve_b;

        self.update_balance(user, token_in, user_balance_in - amount_in);
        let user_balance_out = self.get_user_balance(user, token_out);
        self.update_balance(user, token_out, user_balance_out + amount_out);

        Ok(amount_out)
    }

    pub fn place_order(&mut self, trader: &str, side: OrderSide, order_type: OrderType,
                      symbol: &str, amount: Decimal, price: Option<Decimal>) -> Result<String, String> {
        self.order_counter += 1;
        let order_id = format!("order_{}", self.order_counter);

        let order = Order {
            id: order_id.clone(),
            trader: trader.to_string(),
            order_type,
            side,
            symbol: symbol.to_string(),
            amount,
            price,
            filled_amount: Decimal::ZERO,
            status: OrderStatus::Pending,
            timestamp: Utc::now(),
        };

        self.orders.insert(order_id.clone(), order);

        match order_type {
            OrderType::Market => self.process_market_order(&order_id),
            OrderType::Limit => self.process_limit_order(&order_id),
        }
    }

    fn process_market_order(&mut self, order_id: &str) -> Result<String, String> {
        let order = self.orders.get(order_id).unwrap().clone();

        // Simplified market order processing - in real implementation,
        // this would match against order book
        match order.side {
            OrderSide::Buy => {
                // Assume market buy fills immediately at current market price
                // In real implementation, this would interact with order book
            }
            OrderSide::Sell => {
                // Assume market sell fills immediately at current market price
            }
        }

        Ok(order_id.to_string())
    }

    fn process_limit_order(&mut self, order_id: &str) -> Result<String, String> {
        // Simplified limit order processing
        // In real implementation, this would add to order book
        Ok(order_id.to_string())
    }

    pub fn cancel_order(&mut self, order_id: &str, trader: &str) -> Result<(), String> {
        let order = self.orders.get_mut(order_id)
            .ok_or_else(|| "Order not found".to_string())?;

        if order.trader != trader {
            return Err("Unauthorized".to_string());
        }

        if order.status != OrderStatus::Pending {
            return Err("Order cannot be cancelled".to_string());
        }

        order.status = OrderStatus::Cancelled;
        Ok(())
    }

    pub fn get_pool_info(&self, pool_id: &str) -> Result<LiquidityPool, String> {
        self.pools.get(pool_id)
            .cloned()
            .ok_or_else(|| "Pool not found".to_string())
    }

    pub fn get_user_balance(&self, user: &str, token: &str) -> Decimal {
        self.user_balances
            .get(user)
            .and_then(|balances| balances.get(token))
            .copied()
            .unwrap_or(Decimal::ZERO)
    }

    pub fn update_balance(&mut self, user: &str, token: &str, amount: Decimal) {
        self.user_balances
            .entry(user.to_string())
            .or_insert_with(HashMap::new)
            .insert(token.to_string(), amount);
    }

    pub fn deposit_token(&mut self, user: &str, token: &str, amount: Decimal) {
        let current_balance = self.get_user_balance(user, token);
        self.update_balance(user, token, current_balance + amount);
    }

    pub fn withdraw_token(&mut self, user: &str, token: &str, amount: Decimal) -> Result<(), String> {
        let current_balance = self.get_user_balance(user, token);
        if current_balance < amount {
            return Err("Insufficient balance".to_string());
        }
        self.update_balance(user, token, current_balance - amount);
        Ok(())
    }

    pub fn get_total_value_locked(&self, pool_id: &str) -> Result<Decimal, String> {
        let pool = self.get_pool_info(pool_id)?;
        Ok(pool.reserve_a + pool.reserve_b)
    }

    pub fn calculate_impermanent_loss(&self, pool_id: &str, initial_ratio: Decimal, current_ratio: Decimal) -> Result<Decimal, String> {
        let pool = self.get_pool_info(pool_id)?;

        if pool.reserve_a == Decimal::ZERO || pool.reserve_b == Decimal::ZERO {
            return Err("Invalid pool state".to_string());
        }

        let current_pool_ratio = pool.reserve_a / pool.reserve_b;
        let ratio_diff = (initial_ratio - current_pool_ratio).abs();

        let il = Decimal::TWO * (ratio_diff / (initial_ratio + current_pool_ratio)) * (ratio_diff / (initial_ratio + current_pool_ratio));

        Ok(il)
    }

    pub fn get_user_positions(&self, user: &str) -> HashMap<String, PoolShare> {
        let mut positions = HashMap::new();

        for (pool_id, shares) in &self.pool_shares {
            for share in shares {
                if share.user == user {
                    positions.insert(pool_id.clone(), share.clone());
                }
            }
        }

        positions
    }

    pub fn get_pool_price(&self, pool_id: &str) -> Result<Decimal, String> {
        let pool = self.get_pool_info(pool_id)?;
        if pool.reserve_b == Decimal::ZERO {
            return Err("Invalid pool state".to_string());
        }
        Ok(pool.reserve_a / pool.reserve_b)
    }

    pub fn get_protocol_stats(&self) -> HashMap<String, String> {
        let mut stats = HashMap::new();

        let total_pools = self.pools.len();
        stats.insert("total_pools".to_string(), total_pools.to_string());

        let total_tvl: Decimal = self.pools.values()
            .map(|pool| pool.reserve_a + pool.reserve_b)
            .sum();
        stats.insert("total_value_locked".to_string(), total_tvl.to_string());

        let total_users = self.user_balances.len();
        stats.insert("total_users".to_string(), total_users.to_string());

        let total_orders = self.orders.len();
        stats.insert("total_orders".to_string(), total_orders.to_string());

        let total_trades = self.trades.len();
        stats.insert("total_trades".to_string(), total_trades.to_string());

        stats
    }

    pub fn get_recent_trades(&self, limit: usize) -> Vec<Trade> {
        self.trades.iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    pub fn get_order_book(&self, symbol: &str) -> (Vec<Order>, Vec<Order>) {
        let bids: Vec<Order> = self.orders.values()
            .filter(|order| order.symbol == symbol && matches!(order.side, OrderSide::Buy))
            .cloned()
            .collect();

        let asks: Vec<Order> = self.orders.values()
            .filter(|order| order.symbol == symbol && matches!(order.side, OrderSide::Sell))
            .cloned()
            .collect();

        (bids, asks)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_pool() {
        let mut protocol = DeFiProtocol::new();

        let result = protocol.create_pool(
            "ETH".to_string(),
            "USDC".to_string(),
            Decimal::new(10, 0),
            Decimal::new(20000, 0)
        );

        assert!(result.is_ok());
        assert!(protocol.pools.contains_key("ETH_USDC"));
    }

    #[test]
    fn test_add_liquidity() {
        let mut protocol = DeFiProtocol::new();

        let pool_id = protocol.create_pool(
            "ETH".to_string(),
            "USDC".to_string(),
            Decimal::new(10, 0),
            Decimal::new(20000, 0)
        ).unwrap();

        protocol.deposit_token("user1", "ETH", Decimal::new(1, 0));
        protocol.deposit_token("user1", "USDC", Decimal::new(2000, 0));

        let result = protocol.add_liquidity(&pool_id, "user1", Decimal::new(1, 0), Decimal::new(2000, 0));
        assert!(result.is_ok());
    }

    #[test]
    fn test_swap() {
        let mut protocol = DeFiProtocol::new();

        let pool_id = protocol.create_pool(
            "ETH".to_string(),
            "USDC".to_string(),
            Decimal::new(10, 0),
            Decimal::new(20000, 0)
        ).unwrap();

        protocol.deposit_token("user1", "ETH", Decimal::new(1, 0));

        let result = protocol.swap(&pool_id, "user1", Decimal::new(1, 0), "ETH");
        assert!(result.is_ok());

        let eth_balance = protocol.get_user_balance("user1", "ETH");
        let usdc_balance = protocol.get_user_balance("user1", "USDC");

        assert_eq!(eth_balance, Decimal::ZERO);
        assert!(usdc_balance > Decimal::ZERO);
    }
}