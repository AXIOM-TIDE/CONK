/// AXIOM TIDE PROTOCOL · v1.0.0
/// PRIMITIVE 7 OF 7 · LIGHTHOUSE
/// The permanent record. Earned by the tide. Never purchased.
/// 1M reads in 24hrs or 500k x 3 tides.
/// 100yr clock. $1M to remove. No human override. Ever.
/// GENESIS LIGHTHOUSE · placed by founder · free · permanent · forever.
/// Copyright © 2026 Axiom Tide LLC · axiomtide.com
module axiom_tide::lighthouse {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::usdc::USDC;

    const E_INSUFFICIENT_KILL: u64 = 1;
    const E_GENESIS_IMMORTAL:  u64 = 2;

    const LH_LIFESPAN_MS: u64 = 100 * 365 * 24 * 60 * 60 * 1000;
    const KILL_COST:       u64 = 1_000_000_000_000;

    const PATH_MILLION: u8 = 1;
    const PATH_TIDES:   u8 = 2;
    const PATH_GENESIS: u8 = 0;

    public struct Lighthouse has key {
        id:           UID,
        cast_id:      ID,
        vessel_id:    ID,
        content_blob: vector<u8>,
        created_at:   u64,
        last_visit:   u64,
        visit_count:  u64,
        birth_path:   u8,
    }

    public struct GenesisLighthouse has key {
        id:           UID,
        message:      vector<u8>,
        content_blob: vector<u8>,
        placed_at:    u64,
        placed_by:    address,
        visit_count:  u64,
    }

    public struct LighthouseStands has copy, drop {
        lighthouse_id: address,
        cast_id:       address,
        birth_path:    u8,
        total_reads:   u64,
        stands_at:     u64,
    }

    public struct LighthouseVisited has copy, drop {
        lighthouse_id: address,
        visit_count:   u64,
        visited_at:    u64,
        expires_at:    u64,
    }

    public struct LighthouseFallen has copy, drop {
        lighthouse_id: address,
        visit_count:   u64,
        stood_for_ms:  u64,
        fallen_at:     u64,
    }

    public struct GenesisPlaced has copy, drop {
        lighthouse_id: address,
        placed_by:     address,
        placed_at:     u64,
    }

    public struct GenesisVisited has copy, drop {
        lighthouse_id: address,
        visit_count:   u64,
        visited_at:    u64,
    }

    public fun raise(
        cast_id:      ID,
        vessel_id:    ID,
        content_blob: vector<u8>,
        birth_path:   u8,
        total_reads:  u64,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        let now = clock::timestamp_ms(clock);
        let lh  = Lighthouse {
            id:           object::new(ctx),
            cast_id,
            vessel_id,
            content_blob,
            created_at:   now,
            last_visit:   now,
            visit_count:  total_reads,
            birth_path,
        };
        let lh_addr   = object::id_to_address(&object::id(&lh));
        let cast_addr = object::id_to_address(&cast_id);
        event::emit(LighthouseStands {
            lighthouse_id: lh_addr,
            cast_id:       cast_addr,
            birth_path,
            total_reads,
            stands_at:     now,
        });
        transfer::share_object(lh);
    }

    public fun visit(
        lh:    &mut Lighthouse,
        clock: &Clock,
        _ctx:  &TxContext,
    ) {
        let now        = clock::timestamp_ms(clock);
        lh.visit_count = lh.visit_count + 1;
        lh.last_visit  = now;
        event::emit(LighthouseVisited {
            lighthouse_id: object::id_to_address(&object::id(lh)),
            visit_count:   lh.visit_count,
            visited_at:    now,
            expires_at:    now + LH_LIFESPAN_MS,
        });
    }

    public fun kill(
        lh:      Lighthouse,
        payment: Coin<USDC>,
        clock:   &Clock,
        _ctx:    &TxContext,
    ): Coin<USDC> {
        assert!(coin::value(&payment) >= KILL_COST, E_INSUFFICIENT_KILL);
        let now       = clock::timestamp_ms(clock);
        let lh_addr   = object::id_to_address(&object::id(&lh));
        let stood_for = now - lh.created_at;
        let visits    = lh.visit_count;
        let Lighthouse { id, cast_id:_, vessel_id:_, content_blob:_,
                         created_at:_, last_visit:_, visit_count:_,
                         birth_path:_ } = lh;
        object::delete(id);
        event::emit(LighthouseFallen {
            lighthouse_id: lh_addr,
            visit_count:   visits,
            stood_for_ms:  stood_for,
            fallen_at:     now,
        });
        payment
    }

    public fun place_genesis(
        message:      vector<u8>,
        content_blob: vector<u8>,
        clock:        &Clock,
        ctx:          &mut TxContext,
    ) {
        let placer  = tx_context::sender(ctx);
        let now     = clock::timestamp_ms(clock);
        let genesis = GenesisLighthouse {
            id:           object::new(ctx),
            message,
            content_blob,
            placed_at:    now,
            placed_by:    placer,
            visit_count:  0,
        };
        let addr = object::id_to_address(&object::id(&genesis));
        event::emit(GenesisPlaced {
            lighthouse_id: addr,
            placed_by:     placer,
            placed_at:     now,
        });
        transfer::share_object(genesis);
    }

    public fun visit_genesis(
        genesis: &mut GenesisLighthouse,
        clock:   &Clock,
        _ctx:    &TxContext,
    ) {
        genesis.visit_count = genesis.visit_count + 1;
        event::emit(GenesisVisited {
            lighthouse_id: object::id_to_address(&object::id(genesis)),
            visit_count:   genesis.visit_count,
            visited_at:    clock::timestamp_ms(clock),
        });
    }

    public fun visit_count(lh: &Lighthouse):          u64        { lh.visit_count }
    public fun birth_path(lh: &Lighthouse):           u8         { lh.birth_path }
    public fun last_visit(lh: &Lighthouse):           u64        { lh.last_visit }
    public fun expires_at(lh: &Lighthouse):           u64        { lh.last_visit + LH_LIFESPAN_MS }
    public fun genesis_visits(g: &GenesisLighthouse): u64        { g.visit_count }
    public fun genesis_message(g: &GenesisLighthouse): vector<u8> { g.message }
    public fun kill_cost():      u64 { KILL_COST }
    public fun path_million():   u8  { PATH_MILLION }
    public fun path_tides():     u8  { PATH_TIDES }
    public fun path_genesis():   u8  { PATH_GENESIS }
    public fun lh_lifespan_ms(): u64 { LH_LIFESPAN_MS }
}
