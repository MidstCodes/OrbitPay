//! OrbitPay History Contract

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec,
    Symbol, IntoVal, Val,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    HistoryEntry(u64),
    TotalEntries,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct HistoryEntry {
    pub index: u64,
    pub payment_id: u64,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub status: String,
    pub timestamp: u64,
}

#[contract]
pub struct HistoryContract;

#[contractimpl]
impl HistoryContract {
    pub fn __constructor(env: Env) {
        if env.storage().instance().has(&DataKey::TotalEntries) {
            return;
        }
        env.storage().instance().set(&DataKey::TotalEntries, &1u64);
    }

    pub fn record(env: Env, payment_id: u64, payer: Address, payee: Address, amount: i128, status: String) {
        let index = Self::get_next_index(&env);
        let timestamp = env.ledger().timestamp();

        let entry = HistoryEntry {
            index, payment_id,
            payer: payer.clone(), payee: payee.clone(),
            amount, status: status.clone(), timestamp,
        };

        env.storage().instance().set(&DataKey::HistoryEntry(index), &entry);

        let topics = Vec::from_array(&env, [Symbol::new(&env, "history_recorded")]);
        let data: Vec<Val> = (index, payment_id, payer, payee, amount, status, timestamp).into_val(&env);
        #[allow(deprecated)]
        env.events().publish(topics, data);
    }

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

    pub fn get_total_count(env: Env) -> u64 {
        let total = Self::get_total_count_internal(&env);
        if total == 0 { 0 } else { total - 1 }
    }

    pub fn get_entry(env: Env, index: u64) -> HistoryEntry {
        env.storage().instance().get(&DataKey::HistoryEntry(index))
            .unwrap_or_else(|| panic!("History entry with index {} not found", index))
    }
}

impl HistoryContract {
    fn get_next_index(env: &Env) -> u64 {
        let index: u64 = env.storage().instance().get(&DataKey::TotalEntries).unwrap_or(1);
        env.storage().instance().set(&DataKey::TotalEntries, &(index + 1));
        index
    }

    fn get_total_count_internal(env: &Env) -> u64 {
        env.storage().instance().get(&DataKey::TotalEntries).unwrap_or(1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_record_history() {
        let env = Env::default();
        let contract_id = env.register(HistoryContract, ());
        env.mock_all_auths();

        env.as_contract(&contract_id, || {
            HistoryContract::record(env.clone(), 1,
                Address::generate(&env), Address::generate(&env), 1000i128,
                String::from_str(&env, "Confirmed"));
        });

        env.as_contract(&contract_id, || {
            assert_eq!(HistoryContract::get_total_count(env.clone()), 1);
        });
    }

    #[test]
    fn test_get_history_pagination() {
        let env = Env::default();
        let contract_id = env.register(HistoryContract, ());
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);
        env.mock_all_auths();

        for i in 0..5 {
            env.as_contract(&contract_id, || {
                HistoryContract::record(env.clone(), i + 1, payer.clone(), payee.clone(),
                    1000i128 * (i as i128 + 1), String::from_str(&env, "Confirmed"));
            });
        }

        env.as_contract(&contract_id, || {
            assert_eq!(HistoryContract::get_history(env.clone(), 0, 3).len(), 3);
            assert_eq!(HistoryContract::get_history(env.clone(), 1, 3).len(), 2);
        });
    }

    #[test]
    fn test_get_entry() {
        let env = Env::default();
        let contract_id = env.register(HistoryContract, ());
        env.mock_all_auths();

        env.as_contract(&contract_id, || {
            HistoryContract::record(env.clone(), 42,
                Address::generate(&env), Address::generate(&env), 5000i128,
                String::from_str(&env, "Cancelled"));
        });

        env.as_contract(&contract_id, || {
            let entry = HistoryContract::get_entry(env.clone(), 1);
            assert_eq!(entry.payment_id, 42);
            assert_eq!(entry.amount, 5000);
            assert_eq!(entry.status, String::from_str(&env, "Cancelled"));
        });
    }
}
