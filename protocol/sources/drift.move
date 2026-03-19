/// AXIOM TIDE PROTOCOL · v1.0.0
/// PRIMITIVE 4 OF 7 · DRIFT
/// The public feed. Hooks free to all. Full cast $0.001.
/// The tide votes with every read. Lighthouses born here.
/// Copyright © 2026 Axiom Tide LLC · axiomtide.com
module axiom_tide::drift {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};

    public struct Drift has key {
        id:         UID,
        cast_count: u64,
        lh_count:   u64,
        created_at: u64,
    }

    public struct CastIndexed has copy, drop {
        cast_id:     address,
        hook:        vector<u8>,
        vessel_tier: u8,
        created_at:  u64,
        expires_at:  u64,
        mode:        u8,
    }

    public struct LighthouseIndexed has copy, drop {
        cast_id:       address,
        lighthouse_id: address,
        birth_path:    u8,
        born_at:       u64,
    }

    fun init(ctx: &mut TxContext) {
        transfer::share_object(Drift {
            id:         object::new(ctx),
            cast_count: 0,
            lh_count:   0,
            created_at: 0,
        });
    }

    public fun index_cast(
        drift:       &mut Drift,
        cast_id:     address,
        hook:        vector<u8>,
        vessel_tier: u8,
        expires_at:  u64,
        mode:        u8,
        clock:       &Clock,
        _ctx:        &TxContext,
    ) {
        let now = clock::timestamp_ms(clock);
        if (drift.created_at == 0) { drift.created_at = now; };
        drift.cast_count = drift.cast_count + 1;
        event::emit(CastIndexed {
            cast_id,
            hook,
            vessel_tier,
            created_at: now,
            expires_at,
            mode,
        });
    }

    public fun index_lighthouse(
        drift:         &mut Drift,
        cast_id:       address,
        lighthouse_id: address,
        birth_path:    u8,
        clock:         &Clock,
        _ctx:          &TxContext,
    ) {
        drift.lh_count = drift.lh_count + 1;
        event::emit(LighthouseIndexed {
            cast_id,
            lighthouse_id,
            birth_path,
            born_at: clock::timestamp_ms(clock),
        });
    }

    public fun cast_count(d: &Drift): u64 { d.cast_count }
    public fun lh_count(d: &Drift):   u64 { d.lh_count }
}
