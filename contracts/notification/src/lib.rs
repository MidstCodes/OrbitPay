//! OrbitPay Notification Contract

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Vec,
    Symbol, IntoVal, Val,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Notifications(Address),
    NotificationCounter,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Notification {
    pub id: u64,
    pub recipient: Address,
    pub message: String,
    pub notification_type: String,
    pub read: bool,
    pub created_at: u64,
}

#[contract]
pub struct NotificationContract;

#[contractimpl]
impl NotificationContract {
    pub fn __constructor(env: Env) {
        if env.storage().instance().has(&DataKey::NotificationCounter) {
            return;
        }
        env.storage().instance().set(&DataKey::NotificationCounter, &1u64);
    }

    pub fn notify(env: Env, recipient: Address, message: String, notification_type: String) {
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

        let mut notifications = Self::get_notifications_for_recipient(&env, &recipient);
        notifications.push_back(notification);
        env.storage().instance().set(&DataKey::Notifications(recipient.clone()), &notifications);

        let topics = Vec::from_array(&env, [Symbol::new(&env, "notification_sent")]);
        let data: Vec<Val> = (recipient, notification_id, message, notification_type, timestamp).into_val(&env);
        #[allow(deprecated)]
        env.events().publish(topics, data);
    }

    pub fn get_notifications(env: Env, recipient: Address, page: u32, page_size: u32) -> Vec<Notification> {
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

    pub fn clear_notifications(env: Env, recipient: Address) {
        recipient.require_auth();
        env.storage().instance().set(&DataKey::Notifications(recipient), &Vec::<Notification>::new(&env));
    }
}

impl NotificationContract {
    fn get_next_id(env: &Env) -> u64 {
        let id: u64 = env.storage().instance().get(&DataKey::NotificationCounter).unwrap_or(1);
        env.storage().instance().set(&DataKey::NotificationCounter, &(id + 1));
        id
    }

    fn get_notifications_for_recipient(env: &Env, recipient: &Address) -> Vec<Notification> {
        env.storage().instance().get(&DataKey::Notifications(recipient.clone()))
            .unwrap_or(Vec::new(env))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_create_notification() {
        let env = Env::default();
        let contract_id = env.register_contract(None, NotificationContract);
        let recipient = Address::generate(&env);

        env.as_contract(&contract_id, || {
            NotificationContract::notify(env.clone(), recipient.clone(),
                String::from_str(&env, "New payment received"), String::from_str(&env, "payment_created"));
        });

        env.as_contract(&contract_id, || {
            let notifications = NotificationContract::get_notifications(env.clone(), recipient.clone(), 0, 10);
            assert_eq!(notifications.len(), 1);
        });
    }

    #[test]
    fn test_unread_count() {
        let env = Env::default();
        let contract_id = env.register_contract(None, NotificationContract);
        let recipient = Address::generate(&env);

        env.as_contract(&contract_id, || {
            NotificationContract::notify(env.clone(), recipient.clone(),
                String::from_str(&env, "N1"), String::from_str(&env, "test"));
            NotificationContract::notify(env.clone(), recipient.clone(),
                String::from_str(&env, "N2"), String::from_str(&env, "test"));
        });

        env.as_contract(&contract_id, || {
            assert_eq!(NotificationContract::get_unread_count(env.clone(), recipient.clone()), 2);
        });
    }

    #[test]
    fn test_clear_notifications() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, NotificationContract);
        let recipient = Address::generate(&env);

        env.as_contract(&contract_id, || {
            NotificationContract::notify(env.clone(), recipient.clone(),
                String::from_str(&env, "Test"), String::from_str(&env, "test"));
            NotificationContract::clear_notifications(env.clone(), recipient.clone());
            assert_eq!(NotificationContract::get_notifications(env.clone(), recipient.clone(), 0, 10).len(), 0);
        });
    }
}
