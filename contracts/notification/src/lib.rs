//! OrbitPay Notification Contract
//!
//! This contract handles notification management for the OrbitPay platform.
//! It receives notifications from the Payment contract and stores them
//! for retrieval by users.
//!
//! ## Key Features
//! - Store notifications for user addresses
//! - Paged notification retrieval
//! - Clear notifications after reading
//! - Event emission for real-time frontend updates

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec,
    symbol_short,
};

/// Storage key enum for the contract's persistent storage.
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// Stores all notifications for a given user address
    Notifications(Address),
    /// Counter for generating unique notification IDs
    NotificationCounter,
}

/// A notification event in the OrbitPay system.
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Notification {
    /// Unique notification ID
    pub id: u64,
    /// The user this notification is for
    pub recipient: Address,
    /// Notification message text
    pub message: String,
    /// Type/category of notification (e.g., "payment_created", "payment_confirmed")
    pub notification_type: String,
    /// Whether the notification has been read
    pub read: bool,
    /// Ledger timestamp when the notification was created
    pub created_at: u64,
}

/// The OrbitPay notification contract.
#[contract]
pub struct NotificationContract;

#[contractimpl]
impl NotificationContract {
    /// Initializes the notification counter.
    pub fn __constructor(env: Env, _admin: Address) {
        if env.storage().instance().has(&DataKey::NotificationCounter) {
            return;
        }
        env.storage().instance().set(&DataKey::NotificationCounter, &1u64);
    }

    /// Creates a new notification for a recipient.
    ///
    /// This function is designed to be called by other contracts
    /// (e.g., the Payment contract) via inter-contract calls.
    ///
    /// ### Parameters
    /// - `recipient`: The Stellar address to notify
    /// - `message`: The notification message text
    /// - `notification_type`: The type/category of notification
    ///
    /// ### Events
    /// Emits a `notif_sent` event.
    pub fn notify(
        env: Env,
        recipient: Address,
        message: String,
        notification_type: String,
    ) {
        let notification_id = Self::get_next_id(&env);
        let timestamp = env.ledger().timestamp();

        let notification = Notification {
            id: notification_id,
            recipient: recipient.clone(),
            message: message.clone(),
            notification_type: notification_type.clone(),
            read: false,
            created_at: timestamp,
        };

        // Store the notification
        let mut notifications = Self::get_notifications_for_recipient(&env, &recipient);
        notifications.push_back(notification);
        env.storage().instance().set(&DataKey::Notifications(recipient.clone()), &notifications);

        // Emit event for real-time frontend updates
        env.events().publish(
            symbol_short!("notif_sent"),
            (recipient, notification_id, message, notification_type, timestamp),
        );
    }

    /// Retrieves notifications for a given recipient with pagination.
    ///
    /// ### Parameters
    /// - `recipient`: The Stellar address to query
    /// - `page`: Page number (0-indexed)
    /// - `page_size`: Number of notifications per page (max 50)
    ///
    /// ### Returns
    /// A vector of Notification structs.
    pub fn get_notifications(
        env: Env,
        recipient: Address,
        page: u32,
        page_size: u32,
    ) -> Vec<Notification> {
        let all_notifications = Self::get_notifications_for_recipient(&env, &recipient);
        let page_size = page_size.min(50);
        let total = all_notifications.len();
        let start = (page * page_size) as u32;
        let end = (start + page_size).min(total);

        if start >= total {
            return Vec::new(&env);
        }

        let mut result = Vec::new(&env);
        for i in start..end {
            if let Some(notification) = all_notifications.get(i) {
                result.push_back(notification);
            }
        }
        result
    }

    /// Returns the total number of unread notifications for a recipient.
    pub fn get_unread_count(env: Env, recipient: Address) -> u32 {
        let notifications = Self::get_notifications_for_recipient(&env, &recipient);
        let mut count = 0u32;
        for i in 0..notifications.len() {
            if let Some(notification) = notifications.get(i) {
                if !notification.read {
                    count += 1;
                }
            }
        }
        count
    }

    /// Marks all notifications as read for a given recipient.
    ///
    /// ### Authorization
    /// Requires authorization from the recipient address.
    pub fn mark_all_read(env: Env, recipient: Address) {
        recipient.require_auth();

        let mut notifications = Self::get_notifications_for_recipient(&env, &recipient);
        for i in 0..notifications.len() {
            if let Some(mut notification) = notifications.get(i) {
                if !notification.read {
                    notification.read = true;
                    notifications.set(i, notification);
                }
            }
        }
        env.storage().instance().set(&DataKey::Notifications(recipient), &notifications);
    }

    /// Clears all notifications for a given recipient.
    ///
    /// ### Authorization
    /// Requires authorization from the recipient address.
    pub fn clear_notifications(env: Env, recipient: Address) {
        recipient.require_auth();
        env.storage().instance().set(&DataKey::Notifications(recipient), &Vec::new(&env));
    }
}

// Private helper implementations
impl NotificationContract {
    /// Retrieves and increments the notification ID counter.
    fn get_next_id(env: &Env) -> u64 {
        let mut id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NotificationCounter)
            .unwrap_or(1);
        env.storage()
            .instance()
            .set(&DataKey::NotificationCounter, &(id + 1));
        id
    }

    /// Retrieves all notifications for a recipient from storage.
    fn get_notifications_for_recipient(env: &Env, recipient: &Address) -> Vec<Notification> {
        env.storage()
            .instance()
            .get(&DataKey::Notifications(recipient.clone()))
            .unwrap_or(Vec::new(env))
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
    fn test_create_notification() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let _contract_id = env.register_contract(None, NotificationContract);
        NotificationContract::__constructor(env.clone(), admin);

        let recipient = Address::generate(&env);
        env.mock_all_auths();

        NotificationContract::notify(
            env.clone(),
            recipient.clone(),
            String::from_str(&env, "New payment received"),
            String::from_str(&env, "payment_created"),
        );

        let notifications = NotificationContract::get_notifications(
            env.clone(),
            recipient.clone(),
            0,
            10,
        );

        assert_eq!(notifications.len(), 1);
        assert_eq!(
            notifications.get(0).unwrap().message,
            String::from_str(&env, "New payment received")
        );
    }

    #[test]
    fn test_unread_count() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let _contract_id = env.register_contract(None, NotificationContract);
        NotificationContract::__constructor(env.clone(), admin);

        let recipient = Address::generate(&env);
        env.mock_all_auths();

        NotificationContract::notify(
            env.clone(),
            recipient.clone(),
            String::from_str(&env, "Notification 1"),
            String::from_str(&env, "test"),
        );

        NotificationContract::notify(
            env.clone(),
            recipient.clone(),
            String::from_str(&env, "Notification 2"),
            String::from_str(&env, "test"),
        );

        let unread = NotificationContract::get_unread_count(env.clone(), recipient.clone());
        assert_eq!(unread, 2);

        NotificationContract::mark_all_read(env.clone(), recipient.clone());

        let unread = NotificationContract::get_unread_count(env.clone(), recipient.clone());
        assert_eq!(unread, 0);
    }

    #[test]
    fn test_clear_notifications() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let _contract_id = env.register_contract(None, NotificationContract);
        NotificationContract::__constructor(env.clone(), admin);

        let recipient = Address::generate(&env);
        env.mock_all_auths();

        NotificationContract::notify(
            env.clone(),
            recipient.clone(),
            String::from_str(&env, "Test"),
            String::from_str(&env, "test"),
        );

        NotificationContract::clear_notifications(env.clone(), recipient.clone());

        let notifications = NotificationContract::get_notifications(
            env.clone(),
            recipient.clone(),
            0,
            10,
        );

        assert_eq!(notifications.len(), 0);
    }
}
