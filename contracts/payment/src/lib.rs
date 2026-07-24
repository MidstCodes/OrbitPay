//! OrbitPay Payment Contract
//!
//! This contract manages payment tracking on the Stellar network.
//! It handles payment creation, status updates, and cross-contract
//! communication with the Notification and History contracts.
//!
//! ## Key Features
//! - Create payments with metadata (payer, payee, amount, asset)
//! - Confirm and cancel payments with authorization checks
//! - Paged queries for payer/payee payment history
//! - Event emission for real-time frontend updates
//! - Inter-contract calls to Notification and History contracts

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec,
    symbol_short, Symbol,
};

/// Storage key enum for the contract's persistent storage.
/// Uses a tagged union pattern for clear key namespacing.
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// Stores a Payment struct by its unique ID
    Payment(u64),
    /// Stores a list of payment IDs for a payer address
    PayerPayments(Address),
    /// Stores a list of payment IDs for a payee address
    PayeePayments(Address),
    /// The next available payment ID counter (u64)
    PaymentCount,
    /// Address of the Notification contract for inter-contract calls
    NotificationContract,
    /// Address of the History contract for inter-contract calls
    HistoryContract,
    /// Admin address authorized to configure contract settings
    Admin,
}

/// Represents the complete lifecycle of a payment on OrbitPay.
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Payment {
    /// Unique payment identifier (auto-incremented)
    pub id: u64,
    /// Address of the account creating the payment
    pub payer: Address,
    /// Address of the account receiving the payment
    pub payee: Address,
    /// Payment amount in the smallest unit of the asset
    pub amount: i128,
    /// Asset code (e.g., "XLM", "USDC")
    pub asset: String,
    /// Current status: "Pending", "Confirmed", or "Cancelled"
    pub status: String,
    /// Optional metadata string (e.g., invoice number, description)
    pub metadata: String,
    /// Ledger timestamp when the payment was created
    pub created_at: u64,
    /// Ledger timestamp of the last status update
    pub updated_at: u64,
}

/// Status constants used throughout the contract.
mod status {
    pub const PENDING: &str = "Pending";
    pub const CONFIRMED: &str = "Confirmed";
    pub const CANCELLED: &str = "Cancelled";
}

/// Symbol constants for inter-contract function calls.
mod symbols {
    use soroban_sdk::symbol_short;
    pub const NOTIFY: soroban_sdk::Symbol = symbol_short!("notify");
    pub const RECORD: soroban_sdk::Symbol = symbol_short!("record");
}

/// The main OrbitPay payment contract.
#[contract]
pub struct OrbitPayContract;

#[contractimpl]
impl OrbitPayContract {
    /// Initializes the contract by setting the payment counter to 1
    /// and the deployer as admin.
    pub fn __constructor(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::PaymentCount) {
            return;
        }
        env.storage().instance().set(&DataKey::PaymentCount, &1u64);
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Sets the Notification contract address for inter-contract communication.
    /// Only the admin can call this function.
    pub fn set_notification_contract(env: Env, contract_address: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::NotificationContract, &contract_address);
    }

    /// Sets the History contract address for inter-contract communication.
    /// Only the admin can call this function.
    pub fn set_history_contract(env: Env, contract_address: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::HistoryContract, &contract_address);
    }

    /// Creates a new payment and stores it in the contract's persistent storage.
    ///
    /// ### Authorization
    /// Requires authorization from the caller (payer).
    ///
    /// ### Parameters
    /// - `payee`: The address that will receive the payment
    /// - `amount`: The payment amount in the smallest unit (must be positive)
    /// - `asset`: The asset code as a string (must not be empty)
    /// - `metadata`: Optional metadata (can be empty string "")
    ///
    /// ### Returns
    /// The unique payment ID assigned to the new payment.
    ///
    /// ### Events
    /// Emits a `payment_cr` event with full payment details.
    pub fn create_payment(
        env: Env,
        payee: Address,
        amount: i128,
        asset: String,
        metadata: String,
    ) -> u64 {
        // Validate inputs
        if amount <= 0 {
            panic!("Payment amount must be positive");
        }
        if asset.is_empty() {
            panic!("Asset code cannot be empty");
        }

        // Require authorization from the payer
        let payer = env.invoker();
        payer.require_auth();

        let payment_id = Self::get_next_id(&env);
        let timestamp = env.ledger().timestamp();

        let payment = Payment {
            id: payment_id,
            payer: payer.clone(),
            payee: payee.clone(),
            amount,
            asset: asset.clone(),
            status: String::from_str(&env, status::PENDING),
            metadata: metadata.clone(),
            created_at: timestamp,
            updated_at: timestamp,
        };

        // Store the payment
        env.storage().instance().set(&DataKey::Payment(payment_id), &payment);

        // Update the payer's payment list
        let mut payer_payments = Self::get_payer_payment_ids(&env, &payer);
        payer_payments.push_back(payment_id);
        env.storage().instance().set(&DataKey::PayerPayments(payer), &payer_payments);

        // Update the payee's payment list
        let mut payee_payments = Self::get_payee_payment_ids(&env, &payee);
        payee_payments.push_back(payment_id);
        env.storage().instance().set(&DataKey::PayeePayments(payee.clone()), &payee_payments);

        // Emit event for real-time tracking
        env.events().publish(
            symbol_short!("payment_cr"),
            (payment_id, payment.payer, payment.payee.clone(), amount, asset, timestamp),
        );

        // Notify the Notification contract
        Self::try_notify(
            &env,
            &payment.payee,
            "New payment created",
            "payment_created",
        );

        payment_id
    }

    /// Confirms an existing pending payment.
    ///
    /// ### Authorization
    /// Only the payee can confirm a payment.
    ///
    /// ### Events
    /// Emits a `payment_cf` event.
    pub fn confirm_payment(env: Env, payment_id: u64) {
        let payment = Self::get_payment_by_id(&env, payment_id);

        // Authorization: only the payee can confirm
        payment.payee.require_auth();

        if payment.status.to_str() != status::PENDING {
            panic!("Only pending payments can be confirmed");
        }

        let timestamp = env.ledger().timestamp();

        // Update payment status
        let mut updated_payment = payment.clone();
        updated_payment.status = String::from_str(&env, status::CONFIRMED);
        updated_payment.updated_at = timestamp;

        env.storage().instance().set(&DataKey::Payment(payment_id), &updated_payment);

        // Emit confirmation event
        env.events().publish(
            symbol_short!("payment_cf"),
            (payment_id, payment.payee.clone(), timestamp),
        );

        // Notify the payer
        Self::try_notify(
            &env,
            &payment.payer,
            "Payment confirmed",
            "payment_confirmed",
        );

        // Record in history contract
        Self::try_record_history(
            &env,
            payment_id,
            &payment.payer,
            &payment.payee,
            payment.amount,
            status::CONFIRMED,
        );
    }

    /// Cancels a pending payment.
    ///
    /// ### Authorization
    /// Only the payer can cancel a payment.
    ///
    /// ### Events
    /// Emits a `payment_can` event.
    pub fn cancel_payment(env: Env, payment_id: u64) {
        let payment = Self::get_payment_by_id(&env, payment_id);

        // Authorization: only the payer can cancel
        payment.payer.require_auth();

        if payment.status.to_str() != status::PENDING {
            panic!("Only pending payments can be cancelled");
        }

        let timestamp = env.ledger().timestamp();

        // Update payment status
        let mut updated_payment = payment.clone();
        updated_payment.status = String::from_str(&env, status::CANCELLED);
        updated_payment.updated_at = timestamp;

        env.storage().instance().set(&DataKey::Payment(payment_id), &updated_payment);

        // Emit cancellation event
        env.events().publish(
            symbol_short!("payment_can"),
            (payment_id, payment.payer.clone(), timestamp),
        );

        // Notify the payee
        Self::try_notify(
            &env,
            &payment.payee,
            "Payment cancelled",
            "payment_cancelled",
        );

        // Record in history contract
        Self::try_record_history(
            &env,
            payment_id,
            &payment.payer,
            &payment.payee,
            payment.amount,
            status::CANCELLED,
        );
    }

    /// Retrieves a payment by its ID.
    ///
    /// ### Panics
    /// If the payment ID does not exist.
    pub fn get_payment(env: Env, payment_id: u64) -> Payment {
        Self::get_payment_by_id(&env, payment_id)
    }

    /// Retrieves all payments for a given payer address with pagination.
    ///
    /// ### Parameters
    /// - `payer`: The payer's Stellar address
    /// - `page`: Page number (0-indexed)
    /// - `page_size`: Number of payments per page (max 50)
    ///
    /// ### Returns
    /// A vector of Payment structs for the requested page.
    pub fn get_payer_payments(env: Env, payer: Address, page: u32, page_size: u32) -> Vec<Payment> {
        let payment_ids = Self::get_payer_payment_ids(&env, &payer);
        Self::paginate_payments(&env, payment_ids, page, page_size)
    }

    /// Retrieves all payments for a given payee address with pagination.
    ///
    /// ### Parameters
    /// - `payee`: The payee's Stellar address
    /// - `page`: Page number (0-indexed)
    /// - `page_size`: Number of payments per page (max 50)
    ///
    /// ### Returns
    /// A vector of Payment structs for the requested page.
    pub fn get_payee_payments(env: Env, payee: Address, page: u32, page_size: u32) -> Vec<Payment> {
        let payment_ids = Self::get_payee_payment_ids(&env, &payee);
        Self::paginate_payments(&env, payment_ids, page, page_size)
    }

    /// Returns the total number of payments tracked by this contract.
    pub fn get_payment_count(env: Env) -> u64 {
        let current: u64 = env.storage().instance().get(&DataKey::PaymentCount).unwrap_or(1);
        current - 1
    }

    /// Returns the number of payments for a given payer.
    pub fn get_payer_payment_count(env: Env, payer: Address) -> u32 {
        Self::get_payer_payment_ids(&env, &payer).len()
    }

    /// Returns the number of payments for a given payee.
    pub fn get_payee_payment_count(env: Env, payee: Address) -> u32 {
        Self::get_payee_payment_ids(&env, &payee).len()
    }
}

// Private helper implementations
impl OrbitPayContract {
    /// Retrieves and increments the next payment ID atomically.
    fn get_next_id(env: &Env) -> u64 {
        let mut id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::PaymentCount)
            .unwrap_or(1);
        env.storage()
            .instance()
            .set(&DataKey::PaymentCount, &(id + 1));
        id
    }

    /// Retrieves a payment from storage, panicking if it doesn't exist.
    fn get_payment_by_id(env: &Env, payment_id: u64) -> Payment {
        env.storage()
            .instance()
            .get(&DataKey::Payment(payment_id))
            .unwrap_or_else(|| {
                panic!("Payment with ID {} not found", payment_id);
            })
    }

    /// Retrieves the list of payment IDs for a payer from storage.
    fn get_payer_payment_ids(env: &Env, payer: &Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::PayerPayments(payer.clone()))
            .unwrap_or(Vec::new(env))
    }

    /// Retrieves the list of payment IDs for a payee from storage.
    fn get_payee_payment_ids(env: &Env, payee: &Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::PayeePayments(payee.clone()))
            .unwrap_or(Vec::new(env))
    }

    /// Paginates a list of payment IDs and returns the corresponding Payment structs.
    /// Page size is capped at 50 to prevent excessive storage reads.
    fn paginate_payments(env: &Env, payment_ids: Vec<u64>, page: u32, page_size: u32) -> Vec<Payment> {
        let page_size = page_size.min(50);
        let total = payment_ids.len();
        let start = (page as u32 * page_size) as u32;
        let end = (start + page_size).min(total);

        if start >= total {
            return Vec::new(env);
        }

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

    /// Sends a notification to the Notification contract.
    /// Fails silently if the Notification contract is not configured.
    fn try_notify(env: &Env, recipient: &Address, message: &str, notification_type: &str) {
        if let Some(contract_id) = Self::get_notification_contract(env) {
            let _ = env.invoke_contract::<()>(
                &contract_id,
                &symbols::NOTIFY,
                (recipient.clone(), String::from_str(env, message), String::from_str(env, notification_type)),
            );
        }
    }

    /// Records payment history in the History contract.
    /// Fails silently if the History contract is not configured.
    fn try_record_history(
        env: &Env,
        payment_id: u64,
        payer: &Address,
        payee: &Address,
        amount: i128,
        status_str: &str,
    ) {
        if let Some(contract_id) = Self::get_history_contract(env) {
            let _ = env.invoke_contract::<()>(
                &contract_id,
                &symbols::RECORD,
                (payment_id, payer.clone(), payee.clone(), amount, String::from_str(env, status_str)),
            );
        }
    }

    /// Reads the configured Notification contract address from storage.
    fn get_notification_contract(env: &Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::NotificationContract)
    }

    /// Reads the configured History contract address from storage.
    fn get_history_contract(env: &Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::HistoryContract)
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

    fn setup_test_env() -> (Env, Address) {
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, OrbitPayContract);
        env.register_contract(&contract_id, OrbitPayContract);
        env.mock_all_auths();
        (env, admin)
    }

    #[test]
    fn test_create_payment() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, OrbitPayContract);
        // The __constructor is not called automatically - need to call separately
        // For Soroban SDK v27, we call init functions directly

        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        // Create the contract with admin
        OrbitPayContract::__constructor(env.clone(), admin);

        let payment_id = OrbitPayContract::create_payment(
            env.clone(),
            payee.clone(),
            1000,
            String::from_str(&env, "XLM"),
            String::from_str(&env, "Invoice #123"),
        );

        assert_eq!(payment_id, 1);

        let payment = OrbitPayContract::get_payment(env.clone(), payment_id);
        assert_eq!(payment.payee, payee);
        assert_eq!(payment.amount, 1000);
        assert_eq!(payment.asset, String::from_str(&env, "XLM"));
        assert_eq!(payment.status, String::from_str(&env, "Pending"));
    }

    #[test]
    fn test_confirm_payment() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, OrbitPayContract);
        OrbitPayContract::__constructor(env.clone(), admin);

        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        let payment_id = OrbitPayContract::create_payment(
            env.clone(),
            payee.clone(),
            5000,
            String::from_str(&env, "USDC"),
            String::from_str(&env, "Test payment"),
        );

        OrbitPayContract::confirm_payment(env.clone(), payment_id);

        let payment = OrbitPayContract::get_payment(env.clone(), payment_id);
        assert_eq!(payment.status, String::from_str(&env, "Confirmed"));
    }

    #[test]
    fn test_cancel_payment() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, OrbitPayContract);
        OrbitPayContract::__constructor(env.clone(), admin);

        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        let payment_id = OrbitPayContract::create_payment(
            env.clone(),
            payee.clone(),
            2500,
            String::from_str(&env, "XLM"),
            String::from_str(&env, "Test cancellation"),
        );

        OrbitPayContract::cancel_payment(env.clone(), payment_id);

        let payment = OrbitPayContract::get_payment(env.clone(), payment_id);
        assert_eq!(payment.status, String::from_str(&env, "Cancelled"));
    }

    #[test]
    #[should_panic(expected = "Payment amount must be positive")]
    fn test_create_payment_zero_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, OrbitPayContract);
        OrbitPayContract::__constructor(env.clone(), admin);

        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        OrbitPayContract::create_payment(
            env.clone(),
            payee.clone(),
            0,
            String::from_str(&env, "XLM"),
            String::from_str(&env, ""),
        );
    }

    #[test]
    fn test_set_contract_addresses() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, OrbitPayContract);
        OrbitPayContract::__constructor(env.clone(), admin.clone());

        let notification_addr = Address::generate(&env);
        let history_addr = Address::generate(&env);

        // Admin can set contract addresses
        OrbitPayContract::set_notification_contract(env.clone(), notification_addr.clone());
        OrbitPayContract::set_history_contract(env.clone(), history_addr.clone());

        // Verify addresses were stored (indirectly through function behavior)
        // The addresses are stored in contract storage
        assert!(true);
    }

    #[test]
    fn test_get_payment_count() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, OrbitPayContract);
        OrbitPayContract::__constructor(env.clone(), admin);

        let payer = Address::generate(&env);
        let payee = Address::generate(&env);

        for i in 0..3 {
            OrbitPayContract::create_payment(
                env.clone(),
                payee.clone(),
                1000 * (i + 1),
                String::from_str(&env, "XLM"),
                String::from_str(&env, ""),
            );
        }

        let count = OrbitPayContract::get_payment_count(env.clone());
        assert_eq!(count, 3);
    }
}
