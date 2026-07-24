//! OrbitPay Payment Contract

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec,
    Symbol, IntoVal, Val,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Payment(u64),
    PayerPayments(Address),
    PayeePayments(Address),
    PaymentCount,
    NotificationContract,
    HistoryContract,
    Admin,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Payment {
    pub id: u64,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub asset: String,
    pub status: String,
    pub metadata: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contract]
pub struct OrbitPayContract;

#[contractimpl]
impl OrbitPayContract {
    pub fn __constructor(env: Env) {
        if env.storage().instance().has(&DataKey::PaymentCount) { return; }
        env.storage().instance().set(&DataKey::PaymentCount, &1u64);
        let self_address = env.current_contract_address();
        env.storage().instance().set(&DataKey::Admin, &self_address);
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    pub fn set_notification_contract(env: Env, contract_address: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::NotificationContract, &contract_address);
    }

    pub fn set_history_contract(env: Env, contract_address: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::HistoryContract, &contract_address);
    }

    pub fn create_payment(env: Env, payer: Address, payee: Address, amount: i128, asset: String, metadata: String) -> u64 {
        if amount <= 0 { panic!("Payment amount must be positive"); }
        if asset.is_empty() { panic!("Asset code cannot be empty"); }
        payer.require_auth();

        let payment_id = Self::get_next_id(&env);
        let timestamp = env.ledger().timestamp();

        let payment = Payment {
            id: payment_id, payer: payer.clone(), payee: payee.clone(),
            amount, asset: asset.clone(), status: String::from_str(&env, "Pending"),
            metadata: metadata.clone(), created_at: timestamp, updated_at: timestamp,
        };

        env.storage().instance().set(&DataKey::Payment(payment_id), &payment);

        let mut payer_payments = Self::get_payer_payment_ids(&env, &payer);
        payer_payments.push_back(payment_id);
        env.storage().instance().set(&DataKey::PayerPayments(payer), &payer_payments);

        let mut payee_payments = Self::get_payee_payment_ids(&env, &payee);
        payee_payments.push_back(payment_id);
        env.storage().instance().set(&DataKey::PayeePayments(payee.clone()), &payee_payments);

        let topics = Vec::from_array(&env, [Symbol::new(&env, "payment_created")]);
        let data: Vec<Val> = (payment_id, payment.payer.clone(), payment.payee.clone(), amount, asset.clone(), timestamp).into_val(&env);
        #[allow(deprecated)]
        env.events().publish(topics, data);

        Self::try_notify(&env, &payment.payee, "New payment created", "payment_created");
        payment_id
    }

    pub fn confirm_payment(env: Env, payment_id: u64) {
        let payment = Self::get_payment_by_id(&env, payment_id);
        payment.payee.require_auth();

        if payment.status != String::from_str(&env, "Pending") {
            panic!("Only pending payments can be confirmed");
        }

        let timestamp = env.ledger().timestamp();
        let mut updated_payment = payment.clone();
        updated_payment.status = String::from_str(&env, "Confirmed");
        updated_payment.updated_at = timestamp;
        env.storage().instance().set(&DataKey::Payment(payment_id), &updated_payment);

        let topics = Vec::from_array(&env, [Symbol::new(&env, "payment_confirmed")]);
        let data: Vec<Val> = (payment_id, payment.payee.clone(), timestamp).into_val(&env);
        #[allow(deprecated)]
        env.events().publish(topics, data);

        Self::try_notify(&env, &payment.payer, "Payment confirmed", "payment_confirmed");
        Self::try_record_history(&env, payment_id, &payment.payer, &payment.payee, payment.amount, "Confirmed");
    }

    pub fn cancel_payment(env: Env, payment_id: u64) {
        let payment = Self::get_payment_by_id(&env, payment_id);
        payment.payer.require_auth();

        if payment.status != String::from_str(&env, "Pending") {
            panic!("Only pending payments can be cancelled");
        }

        let timestamp = env.ledger().timestamp();
        let mut updated_payment = payment.clone();
        updated_payment.status = String::from_str(&env, "Cancelled");
        updated_payment.updated_at = timestamp;
        env.storage().instance().set(&DataKey::Payment(payment_id), &updated_payment);

        let topics = Vec::from_array(&env, [Symbol::new(&env, "payment_cancelled")]);
        let data: Vec<Val> = (payment_id, payment.payer.clone(), timestamp).into_val(&env);
        #[allow(deprecated)]
        env.events().publish(topics, data);

        Self::try_notify(&env, &payment.payee, "Payment cancelled", "payment_cancelled");
        Self::try_record_history(&env, payment_id, &payment.payer, &payment.payee, payment.amount, "Cancelled");
    }

    pub fn get_payment(env: Env, payment_id: u64) -> Payment {
        Self::get_payment_by_id(&env, payment_id)
    }

    pub fn get_payer_payments(env: Env, payer: Address, page: u32, page_size: u32) -> Vec<Payment> {
        let payment_ids = Self::get_payer_payment_ids(&env, &payer);
        Self::paginate_payments(&env, payment_ids, page, page_size)
    }

    pub fn get_payee_payments(env: Env, payee: Address, page: u32, page_size: u32) -> Vec<Payment> {
        let payment_ids = Self::get_payee_payment_ids(&env, &payee);
        Self::paginate_payments(&env, payment_ids, page, page_size)
    }

    pub fn get_payment_count(env: Env) -> u64 {
        let current: u64 = env.storage().instance().get(&DataKey::PaymentCount).unwrap_or(1);
        current - 1
    }

    pub fn get_payer_payment_count(env: Env, payer: Address) -> u32 {
        Self::get_payer_payment_ids(&env, &payer).len()
    }

    pub fn get_payee_payment_count(env: Env, payee: Address) -> u32 {
        Self::get_payee_payment_ids(&env, &payee).len()
    }
}

impl OrbitPayContract {
    fn get_next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::PaymentCount).unwrap_or(1);
        env.storage().instance().set(&DataKey::PaymentCount, &(id + 1));
        id
    }

    fn get_payment_by_id(env: &Env, payment_id: u64) -> Payment {
        env.storage().instance().get(&DataKey::Payment(payment_id))
            .unwrap_or_else(|| panic!("Payment with ID {} not found", payment_id))
    }

    fn get_payer_payment_ids(env: &Env, payer: &Address) -> Vec<u64> {
        env.storage().instance().get(&DataKey::PayerPayments(payer.clone()))
            .unwrap_or(Vec::new(env))
    }

    fn get_payee_payment_ids(env: &Env, payee: &Address) -> Vec<u64> {
        env.storage().instance().get(&DataKey::PayeePayments(payee.clone()))
            .unwrap_or(Vec::new(env))
    }

    fn paginate_payments(env: &Env, payment_ids: Vec<u64>, page: u32, page_size: u32) -> Vec<Payment> {
        let page_size = page_size.min(50);
        let total = payment_ids.len();
        let start = (page * page_size) as u32;
        let end = (start + page_size).min(total);
        if start >= total { return Vec::new(env); }

        let mut payments = Vec::new(env);
        for i in start..end {
            if let Some(payment) = payment_ids.get(i) {
                if let Some(p) = env.storage().instance().get(&DataKey::Payment(payment)) {
                    payments.push_back(p);
                }
            }
        }
        payments
    }

    fn try_notify(env: &Env, recipient: &Address, message: &str, notification_type: &str) {
        if let Some(contract_id) = Self::get_notification_contract(env) {
            let args: Vec<Val> = (recipient.clone(), String::from_str(env, message), String::from_str(env, notification_type)).into_val(env);
            let _ = env.invoke_contract::<()>(&contract_id, &Symbol::new(env, "notify"), args);
        }
    }

    fn try_record_history(env: &Env, payment_id: u64, payer: &Address, payee: &Address, amount: i128, status_str: &str) {
        if let Some(contract_id) = Self::get_history_contract(env) {
            let args: Vec<Val> = (payment_id, payer.clone(), payee.clone(), amount, String::from_str(env, status_str)).into_val(env);
            let _ = env.invoke_contract::<()>(&contract_id, &Symbol::new(env, "record"), args);
        }
    }

    fn get_notification_contract(env: &Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::NotificationContract)
    }

    fn get_history_contract(env: &Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::HistoryContract)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_create_payment() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, OrbitPayContract);
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        env.as_contract(&contract_id, || {
            let payment_id = OrbitPayContract::create_payment(env.clone(), payer.clone(), payee.clone(), 1000,
                String::from_str(&env, "XLM"), String::from_str(&env, "Invoice #123"));
            assert_eq!(payment_id, 1);
        });

        env.as_contract(&contract_id, || {
            let payment = OrbitPayContract::get_payment(env.clone(), 1);
            assert_eq!(payment.payee, payee);
            assert_eq!(payment.amount, 1000);
            assert_eq!(payment.status, String::from_str(&env, "Pending"));
        });
    }

    #[test]
    fn test_confirm_payment() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, OrbitPayContract);
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        env.as_contract(&contract_id, || {
            let pid = OrbitPayContract::create_payment(env.clone(), payer, payee.clone(), 5000,
                String::from_str(&env, "USDC"), String::from_str(&env, "Test"));
            OrbitPayContract::confirm_payment(env.clone(), pid);
            assert_eq!(OrbitPayContract::get_payment(env.clone(), pid).status, String::from_str(&env, "Confirmed"));
        });
    }

    #[test]
    fn test_cancel_payment() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, OrbitPayContract);
        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        let pid = env.as_contract(&contract_id, || {
            OrbitPayContract::create_payment(env.clone(), payer.clone(), payee, 2500,
                String::from_str(&env, "XLM"), String::from_str(&env, "Test"))
        });

        env.as_contract(&contract_id, || {
            OrbitPayContract::cancel_payment(env.clone(), pid);
        });

        env.as_contract(&contract_id, || {
            assert_eq!(OrbitPayContract::get_payment(env.clone(), pid).status, String::from_str(&env, "Cancelled"));
        });
    }

    #[test]
    #[should_panic(expected = "Payment amount must be positive")]
    fn test_create_payment_zero_amount() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, OrbitPayContract);

        env.as_contract(&contract_id, || {
            OrbitPayContract::create_payment(env.clone(), Address::generate(&env), Address::generate(&env), 0,
                String::from_str(&env, "XLM"), String::from_str(&env, ""));
        });
    }

    #[test]
    fn test_set_contract_addresses() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, OrbitPayContract);

        env.as_contract(&contract_id, || {
            OrbitPayContract::set_notification_contract(env.clone(), Address::generate(&env));
        });

        env.as_contract(&contract_id, || {
            OrbitPayContract::set_history_contract(env.clone(), Address::generate(&env));
        });
    }

    #[test]
    fn test_get_payment_count() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, OrbitPayContract);

        env.as_contract(&contract_id, || {
            for i in 0..3 {
                OrbitPayContract::create_payment(env.clone(), Address::generate(&env), Address::generate(&env),
                    1000 * (i + 1), String::from_str(&env, "XLM"), String::from_str(&env, ""));
            }
            assert_eq!(OrbitPayContract::get_payment_count(env.clone()), 3);
        });
    }
}
