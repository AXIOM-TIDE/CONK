/// CONK — Abyss Contract
/// The treasury. Receives all fees. No withdrawal. Ever.
module conk::abyss {
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};

    const E_INSUFFICIENT_FEE: u64 = 1;

    const FEE_HARBOR:       u64 = 50_000;
    const FEE_VESSEL:       u64 = 10_000;
    const FEE_SIREN:        u64 = 30_000;
    const FEE_FLARE:        u64 = 30_000;
    const FEE_DOCK:         u64 = 500_000;
    const FEE_MESSAGE:      u64 = 1_000;
    const FEE_DRIFT_READ:   u64 = 1_000;
    const FEE_DRIFT_24H:    u64 = 1_000;
    const FEE_DRIFT_48H:    u64 = 5_000;
    const FEE_DRIFT_72H:    u64 = 10_000;
    const FEE_DRIFT_7D:     u64 = 50_000;
    const FEE_DRIFT_MEDIA:  u64 = 10_000;
    const FEE_COMMENT:      u64 = 1_000;
    const FEE_LH_VISIT:     u64 = 1_000;
    const FEE_LH_KILL:      u64 = 1_000_000_000_000;

    public struct Abyss has key {
        id: UID,
        total_received: u64,
        total_actions: u64,
    }

    public struct FeeReceived has copy, drop {
        action: vector<u8>,
        amount: u64,
        total_received: u64,
    }

    fun init(ctx: &mut TxContext) {
        let abyss = Abyss {
            id: object::new(ctx),
            total_received: 0,
            total_actions: 0,
        };
        transfer::share_object(abyss);
    }

    public fun fee_harbor():   u64 { FEE_HARBOR }
    public fun fee_vessel():   u64 { FEE_VESSEL }
    public fun fee_siren():    u64 { FEE_SIREN }
    public fun fee_flare():    u64 { FEE_FLARE }
    public fun fee_dock():     u64 { FEE_DOCK }
    public fun fee_message():  u64 { FEE_MESSAGE }
    public fun fee_lh_visit(): u64 { FEE_LH_VISIT }
    public fun fee_lh_kill():  u64 { FEE_LH_KILL }
    public fun total_received(a: &Abyss): u64 { a.total_received }
}
