/// CONK — Harbor Contract
/// The master wallet. Gateway to participation.
/// $0.05 one time. 1 year from last activity.
module conk::harbor {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};

    const E_HARBOR_EXPIRED: u64 = 1;
    const E_NOT_OWNER:      u64 = 2;
    const LIFESPAN_MS: u64 = 365 * 24 * 60 * 60 * 1000;

    public struct Harbor has key, store {
        id:           UID,
        owner:        address,
        created_at:   u64,
        last_active:  u64,
        vessel_count: u64,
        dock_count:   u64,
        total_spent:  u64,
    }

    public struct HarborCap has key, store {
        id:        UID,
        harbor_id: ID,
        owner:     address,
    }

    public struct HarborCreated h
cat contracts/sources/harbor.move | head -5
