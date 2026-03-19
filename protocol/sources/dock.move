/// AXIOM TIDE PROTOCOL · v1.0.0
/// PRIMITIVE 5 OF 7 · DOCK
/// The sealed room. Private casts only.
/// $0.50 to open. $0.001 per cast inside.
/// 30 days silence then crumbles. Void receives everything.
/// Copyright © 2026 Axiom Tide LLC · axiomtide.com
module axiom_tide::dock {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::vec_set::{Self, VecSet};

    const E_DOCK_EXPIRED:   u64 = 1;
    const E_NOT_OWNER:      u64 = 2;
    const E_AT_CAPACITY:    u64 = 3;
    const E_ALREADY_INSIDE: u64 = 4;
    const E_NOT_INSIDE:     u64 = 5;

    const LIFESPAN_MS: u64 = 30 * 24 * 60 * 60 * 1000;
    const MAX_VESSELS: u64 = 50;

    public struct Dock has key {
        id:              UID,
        owner_vessel_id: ID,
        owner:           address,
        seal_key_id:     vector<u8>,
        created_at:      u64,
        last_cast:       u64,
        cast_count:      u64,
        vessel_count:    u64,
        active_vessels:  VecSet<ID>,
        has_siren:       bool,
    }

    public struct DockCap has key, store {
        id:      UID,
        dock_id: ID,
        owner:   address,
    }

    public struct DockOpened has copy, drop {
        dock_id:    address,
        owner:      address,
        opened_at:  u64,
        expires_at: u64,
    }

    public struct DockCastSent has copy, drop {
        dock_id:    address,
        burn:       bool,
        has_media:  bool,
        sent_at:    u64,
        expires_at: u64,
    }

    public struct VesselEntered has copy, drop {
        dock_id:    address,
        vessel_id:  address,
        entered_at: u64,
    }

    public struct VesselLeft has copy, drop {
        dock_id:   address,
        vessel_id: address,
        left_at:   u64,
    }

    public struct DockCrumbled has copy, drop {
        dock_id:     address,
        cast_count:  u64,
        crumbled_at: u64,
    }

    public fun open(
        owner_vessel_id: ID,
        seal_key_id:     vector<u8>,
        clock:           &Clock,
        ctx:             &mut TxContext,
    ): DockCap {
        let owner = tx_context::sender(ctx);
        let now   = clock::timestamp_ms(clock);
        let dock  = Dock {
            id:              object::new(ctx),
            owner_vessel_id,
            owner,
            seal_key_id,
            created_at:      now,
            last_cast:       now,
            cast_count:      0,
            vessel_count:    0,
            active_vessels:  vec_set::empty(),
            has_siren:       false,
        };
        let dock_id   = object::id(&dock);
        let dock_addr = object::id_to_address(&dock_id);
        event::emit(DockOpened {
            dock_id:    dock_addr,
            owner,
            opened_at:  now,
            expires_at: now + LIFESPAN_MS,
        });
        let cap = DockCap { id: object::new(ctx), dock_id, owner };
        transfer::share_object(dock);
        cap
    }

    public fun cast_inside(
        dock:      &mut Dock,
        vessel_id: ID,
        burn:      bool,
        has_media: bool,
        clock:     &Clock,
        _ctx:      &TxContext,
    ) {
        assert!(is_alive(dock, clock), E_DOCK_EXPIRED);
        assert!(vec_set::contains(&dock.active_vessels, &vessel_id), E_NOT_INSIDE);
        let now        = clock::timestamp_ms(clock);
        dock.last_cast  = now;
        dock.cast_count = dock.cast_count + 1;
        event::emit(DockCastSent {
            dock_id:    object::id_to_address(&object::id(dock)),
            burn,
            has_media,
            sent_at:    now,
            expires_at: now + LIFESPAN_MS,
        });
    }

    public fun enter(
        dock:      &mut Dock,
        vessel_id: ID,
        clock:     &Clock,
        _ctx:      &TxContext,
    ) {
        assert!(is_alive(dock, clock), E_DOCK_EXPIRED);
        assert!(dock.vessel_count < MAX_VESSELS, E_AT_CAPACITY);
        assert!(!vec_set::contains(&dock.active_vessels, &vessel_id), E_ALREADY_INSIDE);
        vec_set::insert(&mut dock.active_vessels, vessel_id);
        dock.vessel_count = dock.vessel_count + 1;
        dock.last_cast    = clock::timestamp_ms(clock);
        event::emit(VesselEntered {
            dock_id:    object::id_to_address(&object::id(dock)),
            vessel_id:  object::id_to_address(&vessel_id),
            entered_at: clock::timestamp_ms(clock),
        });
    }

    public fun leave(
        dock:      &mut Dock,
        vessel_id: ID,
        clock:     &Clock,
        _ctx:      &TxContext,
    ) {
        assert!(vec_set::contains(&dock.active_vessels, &vessel_id), E_NOT_INSIDE);
        vec_set::remove(&mut dock.active_vessels, &vessel_id);
        event::emit(VesselLeft {
            dock_id:   object::id_to_address(&object::id(dock)),
            vessel_id: object::id_to_address(&vessel_id),
            left_at:   clock::timestamp_ms(clock),
        });
    }

    public fun attach_siren(dock: &mut Dock, cap: &DockCap, _ctx: &TxContext) {
        assert!(cap.dock_id == object::id(dock), E_NOT_OWNER);
        dock.has_siren = true;
    }

    public fun crumble(
        dock:  Dock,
        cap:   DockCap,
        clock: &Clock,
        _ctx:  &TxContext,
    ) {
        assert!(cap.dock_id == object::id(&dock), E_NOT_OWNER);
        let now       = clock::timestamp_ms(clock);
        let dock_addr = object::id_to_address(&object::id(&dock));
        let casts     = dock.cast_count;
        let Dock { id, owner_vessel_id:_, owner:_, seal_key_id:_,
                   created_at:_, last_cast:_, cast_count:_,
                   vessel_count:_, active_vessels:_, has_siren:_ } = dock;
        let DockCap { id: cap_id, dock_id:_, owner:_ } = cap;
        object::delete(id);
        object::delete(cap_id);
        event::emit(DockCrumbled {
            dock_id:     dock_addr,
            cast_count:  casts,
            crumbled_at: now,
        });
    }

    public fun is_alive(dock: &Dock, clock: &Clock): bool {
        clock::timestamp_ms(clock) < dock.last_cast + LIFESPAN_MS
    }

    public fun cast_count(d: &Dock):   u64  { d.cast_count }
    public fun vessel_count(d: &Dock): u64  { d.vessel_count }
    public fun last_cast(d: &Dock):    u64  { d.last_cast }
    public fun expires_at(d: &Dock):   u64  { d.last_cast + LIFESPAN_MS }
    public fun has_siren(d: &Dock):    bool { d.has_siren }
}
