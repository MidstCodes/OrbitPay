//! OrbitPay History Contract
//!
//! This contract maintains an aggregate history of all payments
//! processed through the OrbitPay platform. It receives data from
//! the Payment contract and provides query functions for the frontend.
//!
//! ## Key Features
//! - Record payment history entries from the Payment contract
//! - Paged history queries with metadata
//! - Total record count tracking
//! - Event emission for real-time frontend synchronization

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec,
    symbol_short,
};

/// Storage key enum.
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// Stores a HistoryEntry by its sequential index
    HistoryEntry(u64),
    /// Total number of history entries
    TotalEntries,
}

/// A historical record of a payment event.
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct HistoryEntry {
    /// The record index (auto-incremented)
    pub index: u64,
    /// The payment ID from the Payment contract
    pub payment_id: u64,
    /// The payer's Stellar address
    pub payer: Address,
    /// The payee's Stellar address
    pub payee: Address,
    /// The payment amount
    pub amount: i128,
    /// The final status of the payment
    pub status: String,
    /// Ledger timestamp of this history record
    pub timestamp: u64,
}

/// The OrbitPay history contract.
#[contract]
pub struct HistoryContract;

#[contractimpl]
impl HistoryContract {
    /// Initializes the entry counter.
    pub fn __constructor(env: Env, _admin: Address) {
        if env.storage().instance().has(&DataKey::TotalEntries) {
            return;
        }
        env.storage().instance().set(&DataKey::TotalEntries, &1u64);
    }

    /// Records a new payment in the history.
    ///
    /// This function is designed to be called by the Payment contract
    /// when a payment reaches its final state (Confirmed or Cancelled).
    ///
    /// ### Parameters
    /// - `payment_id`: The payment ID from the Payment contract
    /// - `payer`: The payer's Stellar address
    /// - `payee`: The payee's Stellar address
    /// - `amount`: The payment amount
    /// - `status`: The final status ("Confirmed" or "Cancelled")
    ///
    /// ### Events
    /// Emits a `history_up` event.
    pub fn record(
        env: Env,
        payment_id: u64,
        payer: Address,
        payee: Address,
        amount: i128,
        status: String,
    ) {
        let index = Self::get_next_index(&env);
        let timestamp = env.ledger().timestamp();

        let entry = HistoryEntry {
            index,
            payment_id,
            payer: payer.clone(),
            payee: payee.clone(),
            amount,
            status: status.clone(),
            timestamp,
        };

        env.storage().instance().set(&DataKey::HistoryEntry(index), &entry);

        // Emit event for frontend synchronization
        env.events().publish(
            symbol_short!("history_up"),
            (index, payment_id, payer, payee, amount, status, timestamp),
        );
    }

    /// Retrieves a paginated list of history entries.
    ///
    /// ### Parameters
    /// - `page`: Page number (0-indexed)
    /// - `page_size`: Number of entries per page (max 50)
    ///
    /// ### Returns
    /// A vector of HistoryEntry structs.
    pub fn get_history(env: Env, page: u32, page_size: u32) -> Vec<HistoryEntry> {
        let total = Self::get_total_count_internal(&env);
        let page_size = page_size.min(50);
        let start = (page as u64 * page_size as u64) + 1;
        let end = (start + page_size as u64).min(total);

        if start >= total {
            return Vec::new(&env);
        }

        let mut entries = Vec::new(&env);
        for i in start..end {
            if let Some(entry) = env.storage().instance().get(&DataKey::HistoryEntry(i)) {
                entries.push_back(entry);
            }
        }
        entries
    }

    /// Returns the total number of history entries.
    pub fn get_total_count(env: Env) -> u64 {
        let total = Self::get_total_count_internal(&env);
        if total == 0 { 0 } else { total - 1 }
    }

    /// Retrieves a single history entry by its index.
    ///
    /// ### Panics
    /// If the index does not exist.
    pub fn get_entry(env: Env, index: u64) -> HistoryEntry {
        env.storage()
            .instance()
            .get(&DataKey::HistoryEntry(index))
            .unwrap_or_else(|| {
                panic!("History entry with index {} not found", index);
            })
    }
}

// Private helper implementations
impl HistoryContract {
    /// Retrieves and increments the entry index counter.
    fn get_next_index(env: &Env) -> u64 {
        let mut index: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TotalEntries)
            .unwrap_or(1);
        env.storage()
            .instance()
            .set(&DataKey::TotalEntries, &(index + 1));
        index
    }

    /// Internal helper to get the total count.
    fn get_total_count_internal(env: &Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TotalEntries)
            .unwrap_or(1)
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        Env,
    };

    #[test]
    fn test_record_history() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let _contract_id = env.register_contract(None, HistoryContract);
        HistoryContract::__constructor(env.clone(), admin);

        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        env.mock_all_auths();

        HistoryContract::record(
            env.clone(),
            1,
            payer.clone(),
            payee.clone(),
            1000,
            String::from_str(&env, "Confirmed"),
        );

        let count = HistoryContract::get_total_count(env.clone());
        assert_eq!(count, 1);
    }

    #[test]
    fn test_get_history_pagination() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let _contract_id = env.register_contract(None, HistoryContract);
        HistoryContract::__constructor(env.clone(), admin);

        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        env.mock_all_auths();

        for i in 0..5 {
            HistoryContract::record(
                env.clone(),
                i + 1,
                payer.clone(),
                payee.clone(),
                1000 * (i + 1),
                String::from_str(&env, "Confirmed"),
            );
        }

        let history = HistoryContract::get_history(env.clone(), 0, 3);
        assert_eq!(history.len(), 3);

        let history_page2 = HistoryContract::get_history(env.clone(), 1, 3);
        assert_eq!(history_page2.len(), 2);
    }

    #[test]
    fn test_get_entry() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let _contract_id = env.register_contract(None, HistoryContract);
        HistoryContract::__constructor(env.clone(), admin);

        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        env.mock_all_auths();

        HistoryContract::record(
            env.clone(),
            42,
            payer.clone(),
            payee.clone(),
            5000,
            String::from_str(&env, "Cancelled"),
        );

        let entry = HistoryContract::get_entry(env.clone(), 1);
        assert_eq!(entry.payment_id, 42);
        assert_eq!(entry.amount, 5000);
        assert_eq!(entry.status, String::from_str(&env, "Cancelled"));
    }
}
