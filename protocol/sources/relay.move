/// AXIOM TIDE PROTOCOL · v1.0.0
/// THE RELAY · Privacy Layer
/// Enforces the Three Laws.
/// Draws fuel from Harbor. Passes receipt to Cast.
/// The Harbor never knows what the fuel was for.
/// The Cast never knows which Harbor funded it.
/// The link is never made. Because it was never built.
/// Copyright © 2026 Axiom Tide LLC · axiomtide.com
module axiom_tide::relay {
    use sui::object::{Self, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use 0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC;
    use axiom_tide::harbor::{Self, Harbor, HarborCap};
    use axiom_tide::vessel::{Self, Vessel, VesselCap};

    const E_HARBOR_VESSEL_MISMATCH: u64 = 1;
    const E_INSUFFICIENT_FUEL:      u64 = 2;
    const E_VESSEL_EXPIRED:         u64 = 3;
    const E_HARBOR_EXPIRED:         u64 = 4;

    public struct RelayReceipt has drop {
        fee_paid:    u64,
        relayed_at:  u64,
        vessel_tier: u8,
    }

    public struct RelayProcessed has copy, drop {
        fee_paid:   u64,
        relayed_at: u64,
    }

    public fun process(
        harbor:     &mut Harbor,
        harbor_cap: &HarborCap,
        vessel:     &mut Vessel,
        vessel_cap: &VesselCap,
        fee:        u64,
        clock:      &Clock,
        ctx:        &mut TxContext,
    ): (Coin<USDC>, RelayReceipt) {
        assert!(
            vessel::harbor_id(vessel) == object::id(harbor),
            E_HARBOR_VESSEL_MISMATCH
        );
        assert!(harbor::is_alive(harbor, clock), E_HARBOR_EXPIRED);
        assert!(vessel::is_alive(vessel, clock), E_VESSEL_EXPIRED);
        assert!(harbor::has_balance(harbor, fee), E_INSUFFICIENT_FUEL);
        let now         = clock::timestamp_ms(clock);
        let coin        = harbor::drain(harbor, harbor_cap, fee, clock, ctx);
        let should_sink = vessel::touch(vessel, vessel_cap, clock, ctx);
        let receipt     = RelayReceipt {
            fee_paid:    fee,
            relayed_at:  now,
            vessel_tier: vessel::tier(vessel),
        };
        event::emit(RelayProcessed { fee_paid: fee, relayed_at: now });
        (coin, receipt)
    }

    public fun receipt_fee(r: &RelayReceipt):  u64 { r.fee_paid }
    public fun receipt_tier(r: &RelayReceipt): u8  { r.vessel_tier }
    public fun receipt_time(r: &RelayReceipt): u64 { r.relayed_at }
}
