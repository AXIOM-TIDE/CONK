/// AXIOM TIDE PROTOCOL · v1.0.0
/// PRIMITIVE 1 OF 7 · HARBOR
/// The wallet. The fuel. Never sees a cast. Ever.
/// Three Laws enforced here.
/// Copyright © 2026 Axiom Tide LLC · axiomtide.com
module axiom_tide::harbor {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use 0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC;

    const E_HARBOR_EXPIRED:       u64 = 1;
    const E_NOT_OWNER:            u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    const E_VESSEL_LIMIT_REACHED: u64 = 4;
    const E_INVALID_TIER:         u64 = 5;
    const E_BELOW_MINIMUM:        u64 = 6;
    const E_ALREADY_MAX_TIER:     u64 = 7;

    const LIFESPAN_MS:     u64 = 365 * 24 * 60 * 60 * 1000;
    const MINIMUM_BALANCE: u64 = 100_000;

    const TIER_1: u8 = 1;
    const TIER_2: u8 = 2;
    const TIER_3: u8 = 3;
    const TIER_4: u8 = 4;

    const TIER_1_VESSEL_LIMIT: u64 = 1;
    const TIER_2_VESSEL_LIMIT: u64 = 5;
    const TIER_3_VESSEL_LIMIT: u64 = 10;
    const TIER_4_VESSEL_LIMIT: u64 = 20;

    const TIER_1_COST: u64 = 50_000;
    const TIER_2_COST: u64 = 100_000;
    const TIER_3_COST: u64 = 200_000;
    const TIER_4_COST: u64 = 500_000;

    public struct Harbor has key {
        id:            UID,
        owner:         address,
        tier:          u8,
        vessel_limit:  u64,
        vessel_count:  u64,
        balance:       Balance<USDC>,
        created_at:    u64,
        last_movement: u64,
        total_in:      u64,
        total_out:     u64,
    }

    public struct HarborCap has key, store {
        id:        UID,
        harbor_id: ID,
        owner:     address,
        tier:      u8,
    }

    public struct HarborOpened has copy, drop {
        harbor_id: address,
        owner:     address,
        tier:      u8,
        opened_at: u64,
    }

    public struct HarborFueled has copy, drop {
        harbor_id: address,
        amount:    u64,
        balance:   u64,
        fueled_at: u64,
    }

    public struct HarborDrained has copy, drop {
        harbor_id:  address,
        amount:     u64,
        balance:    u64,
        drained_at: u64,
    }

    public struct HarborUpgraded has copy, drop {
        harbor_id:   address,
        old_tier:    u8,
        new_tier:    u8,
        new_limit:   u64,
        upgraded_at: u64,
    }

    public struct HarborCrumbled has copy, drop {
        harbor_id:    address,
        balance_lost: u64,
        crumbled_at:  u64,
    }

    public fun open(
        payment: Coin<USDC>,
        tier:    u8,
        clock:   &Clock,
        ctx:     &mut TxContext,
    ): HarborCap {
        assert!(
            tier == TIER_1 || tier == TIER_2 ||
            tier == TIER_3 || tier == TIER_4,
            E_INVALID_TIER
        );
        let cost   = tier_cost(tier);
        let amount = coin::value(&payment);
        assert!(amount >= cost + MINIMUM_BALANCE, E_BELOW_MINIMUM);
        let owner = tx_context::sender(ctx);
        let now   = clock::timestamp_ms(clock);
        let harbor = Harbor {
            id:            object::new(ctx),
            owner,
            tier,
            vessel_limit:  tier_limit(tier),
            vessel_count:  0,
            balance:       coin::into_balance(payment),
            created_at:    now,
            last_movement: now,
            total_in:      amount,
            total_out:     0,
        };
        let harbor_id   = object::id(&harbor);
        let harbor_addr = object::id_to_address(&harbor_id);
        event::emit(HarborOpened { harbor_id: harbor_addr, owner, tier, opened_at: now });
        let cap = HarborCap { id: object::new(ctx), harbor_id, owner, tier };
        transfer::transfer(harbor, owner);
        cap
    }

    public fun fuel(
        harbor:  &mut Harbor,
        cap:     &HarborCap,
        payment: Coin<USDC>,
        clock:   &Clock,
        _ctx:    &TxContext,
    ) {
        assert!(cap.harbor_id == object::id(harbor), E_NOT_OWNER);
        let amount = coin::value(&payment);
        let now    = clock::timestamp_ms(clock);
        balance::join(&mut harbor.balance, coin::into_balance(payment));
        harbor.last_movement = now;
        harbor.total_in      = harbor.total_in + amount;
        event::emit(HarborFueled {
            harbor_id: object::id_to_address(&object::id(harbor)),
            amount,
            balance:   balance::value(&harbor.balance),
            fueled_at: now,
        });
    }

    public fun drain(
        harbor:  &mut Harbor,
        cap:     &HarborCap,
        amount:  u64,
        clock:   &Clock,
        ctx:     &mut TxContext,
    ): Coin<USDC> {
        assert!(cap.harbor_id == object::id(harbor), E_NOT_OWNER);
        assert!(is_alive(harbor, clock), E_HARBOR_EXPIRED);
        assert!(balance::value(&harbor.balance) >= amount, E_INSUFFICIENT_BALANCE);
        let now  = clock::timestamp_ms(clock);
        let coin = coin::from_balance(balance::split(&mut harbor.balance, amount), ctx);
        harbor.last_movement = now;
        harbor.total_out     = harbor.total_out + amount;
        event::emit(HarborDrained {
            harbor_id:  object::id_to_address(&object::id(harbor)),
            amount,
            balance:    balance::value(&harbor.balance),
            drained_at: now,
        });
        coin
    }

    public fun register_vessel(
        harbor: &mut Harbor,
        cap:    &HarborCap,
        clock:  &Clock,
        _ctx:   &TxContext,
    ) {
        assert!(cap.harbor_id == object::id(harbor), E_NOT_OWNER);
        assert!(is_alive(harbor, clock), E_HARBOR_EXPIRED);
        assert!(harbor.vessel_count < harbor.vessel_limit, E_VESSEL_LIMIT_REACHED);
        harbor.vessel_count  = harbor.vessel_count + 1;
        harbor.last_movement = clock::timestamp_ms(clock);
    }

    public fun release_vessel(
        harbor: &mut Harbor,
        cap:    &HarborCap,
        _ctx:   &TxContext,
    ) {
        assert!(cap.harbor_id == object::id(harbor), E_NOT_OWNER);
        if (harbor.vessel_count > 0) {
            harbor.vessel_count = harbor.vessel_count - 1;
        };
    }

    public fun upgrade(
        harbor:  &mut Harbor,
        cap:     &mut HarborCap,
        payment: Coin<USDC>,
        clock:   &Clock,
        _ctx:    &TxContext,
    ) {
        assert!(cap.harbor_id == object::id(harbor), E_NOT_OWNER);
        assert!(harbor.tier < TIER_4, E_ALREADY_MAX_TIER);
        let new_tier = harbor.tier + 1;
        let cost     = tier_cost(new_tier);
        assert!(coin::value(&payment) >= cost, E_INSUFFICIENT_BALANCE);
        let now = clock::timestamp_ms(clock);
        balance::join(&mut harbor.balance, coin::into_balance(payment));
        let old_tier         = harbor.tier;
        harbor.tier          = new_tier;
        harbor.vessel_limit  = tier_limit(new_tier);
        harbor.last_movement = now;
        cap.tier             = new_tier;
        event::emit(HarborUpgraded {
            harbor_id:   object::id_to_address(&object::id(harbor)),
            old_tier,
            new_tier,
            new_limit:   harbor.vessel_limit,
            upgraded_at: now,
        });
    }

    public fun is_alive(harbor: &Harbor, clock: &Clock): bool {
        clock::timestamp_ms(clock) < harbor.last_movement + LIFESPAN_MS
    }

    public fun has_vessel_capacity(harbor: &Harbor): bool {
        harbor.vessel_count < harbor.vessel_limit
    }

    public fun has_balance(harbor: &Harbor, amount: u64): bool {
        balance::value(&harbor.balance) >= amount
    }

    fun tier_limit(tier: u8): u64 {
        if (tier == TIER_1) TIER_1_VESSEL_LIMIT
        else if (tier == TIER_2) TIER_2_VESSEL_LIMIT
        else if (tier == TIER_3) TIER_3_VESSEL_LIMIT
        else TIER_4_VESSEL_LIMIT
    }

    fun tier_cost(tier: u8): u64 {
        if (tier == TIER_1) TIER_1_COST
        else if (tier == TIER_2) TIER_2_COST
        else if (tier == TIER_3) TIER_3_COST
        else TIER_4_COST
    }

    public fun owner(h: &Harbor):         address { h.owner }
    public fun tier(h: &Harbor):          u8      { h.tier }
    public fun vessel_count(h: &Harbor):  u64     { h.vessel_count }
    public fun vessel_limit(h: &Harbor):  u64     { h.vessel_limit }
    public fun balance(h: &Harbor):       u64     { balance::value(&h.balance) }
    public fun last_movement(h: &Harbor): u64     { h.last_movement }
    public fun expires_at(h: &Harbor):    u64     { h.last_movement + LIFESPAN_MS }
    public fun total_in(h: &Harbor):      u64     { h.total_in }
    public fun total_out(h: &Harbor):     u64     { h.total_out }
    public fun tier_1(): u8 { TIER_1 }
    public fun tier_2(): u8 { TIER_2 }
    public fun tier_3(): u8 { TIER_3 }
    public fun tier_4(): u8 { TIER_4 }
    public fun minimum_balance(): u64 { MINIMUM_BALANCE }
}
