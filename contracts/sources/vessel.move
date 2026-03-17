/// CONK — Vessel Contract
/// Anonymous identity. Ghost · Shadow · Open.
/// $0.01 one time. 1 year from last action.
module conk::vessel {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};

    const E_VESSEL_EXPIRED:  u64 = 1;
    const E_NOT_OWNER:       u64 = 2;
    const E_INVALID_TYPE:    u64 = 3;
    const LIFESPAN_MS: u64 = 365 * 24 * 60 * 60 * 1000;

    const TYPE_GHOST:  u8 = 0;
    const TYPE_SHADOW: u8 = 1;
    const TYPE_OPEN:   u8 = 2;

    public struct Vessel has key, store {
        id:            UID,
        harbor_id:     ID,
        owner:         address,
        vessel_type:   u8,
        created_at:    u64,
        last_active:   u64,
        dock_id:       Option<ID>,
        total_actions: u64,
    }

    public struct VesselCap has key, store {
        id:          UID,
        vessel_id:   ID,
        harbor_id:   ID,
        owner:       address,
        vessel_type: u8,
    }

    public struct VesselCreated has copy, drop {
        vessel_id:   address,
        harbor_id:   address,
        vessel_type: u8,
        created_at:  u64,
    }

    public struct VesselWrecked has copy, drop {
        vessel_id:  address,
        wrecked_at: u64,
    }

    public fun is_alive(vessel: &Vessel, clock: &Clock): bool {
        clock::timestamp_ms(clock) < vessel.last_active + LIFESPAN_MS
    }

    public fun assert_alive(vessel: &Vessel, clock: &Clock) {
        assert!(is_alive(vessel, clock), E_VESSEL_EXPIRED);
    }

    public fun in_dock(vessel: &Vessel): bool {
        option::is_some(&vessel.dock_id)
    }

    public fun enter_dock(vessel: &mut Vessel, cap: &VesselCap, dock_id: ID, clock: &Clock, ctx: &TxContext) {
        assert!(cap.vessel_id == object::id(vessel), E_NOT_OWNER);
        assert!(is_alive(vessel, clock), E_VESSEL_EXPIRED);
        vessel.dock_id = option::some(dock_id);
    }

    public fun leave_dock(vessel: &mut Vessel, cap: &VesselCap, clock: &Clock, ctx: &TxContext) {
        assert!(cap.vessel_id == object::id(vessel), E_NOT_OWNER);
        vessel.dock_id = option::none();
    }

    public fun touch(vessel: &mut Vessel, cap: &VesselCap, clock: &Clock, ctx: &TxContext) {
        assert!(cap.vessel_id == object::id(vessel), E_NOT_OWNER);
        vessel.last_active   = clock::timestamp_ms(clock);
        vessel.total_actions = vessel.total_actions + 1;
    }

    public fun owner(vessel: &Vessel):       address    { vessel.owner }
    public fun vessel_type(vessel: &Vessel): u8         { vessel.vessel_type }
    public fun harbor_id(vessel: &Vessel):   ID         { vessel.harbor_id }
    public fun last_active(vessel: &Vessel): u64        { vessel.last_active }
    public fun expires_at(vessel: &Vessel):  u64        { vessel.last_active + LIFESPAN_MS }
    public fun dock_id(vessel: &Vessel):     Option<ID> { vessel.dock_id }
    public fun type_ghost():  u8 { TYPE_GHOST }
    public fun type_shadow(): u8 { TYPE_SHADOW }
    public fun type_open():   u8 { TYPE_OPEN }
}
