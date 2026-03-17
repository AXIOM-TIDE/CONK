/// CONK — Signals Contract
/// Flare: private invite · $0.03 · specific vessels only
/// Siren: open invite · $0.03 · anyone can respond
module conk::signals {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};

    const E_SIGNAL_EXPIRED:  u64 = 1;
    const E_NOT_OWNER:       u64 = 2;
    const E_WRONG_RECIPIENT: u64 = 3;
    const LIFESPAN_MS: u64 = 30 * 24 * 60 * 60 * 1000;

    public struct Flare has key, store {
        id:               UID,
        sender_vessel_id: ID,
        sender:           address,
        recipient:        address,
        dock_id:          ID,
        sent_at:          u64,
        answered:         bool,
    }

    public struct Siren has key, store {
        id:               UID,
        owner_vessel_id:  ID,
        owner:            address,
        dock_id:          ID,
        message:          vector<u8>,
        created_at:       u64,
        last_interaction: u64,
        response_count:   u64,
        generator_copies: u64,
    }

    public struct FlareSent has copy, drop {
        flare_id: address,
        dock_id:  address,
        sent_at:  u64,
    }

    public struct FlareAnswered has copy, drop {
        flare_id:    address,
        dock_id:     address,
        answered_at: u64,
    }

    public struct FlareWrecked has copy, drop {
        flare_id:   address,
        wrecked_at: u64,
    }

    public struct SirenCreated has copy, drop {
        siren_id:   address,
        dock_id:    address,
        created_at: u64,
    }

    public struct SirenResponse has copy, drop {
        siren_id:     address,
        dock_id:      address,
        responded_at: u64,
    }

    public struct SirenWrecked has copy, drop {
        siren_id:   address,
        wrecked_at: u64,
    }

    public fun siren_dock_id(siren: &Siren):       ID         { siren.dock_id }
    public fun siren_message(siren: &Siren):        vector<u8> { siren.message }
    public fun siren_response_count(siren: &Siren): u64        { siren.response_count }
    public fun siren_is_alive(siren: &Siren, clock: &Clock): bool {
        clock::timestamp_ms(clock) < siren.last_interaction + LIFESPAN_MS
    }
}
