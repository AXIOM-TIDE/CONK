/// CONK — Dock Contract
/// Private sealed room. 4 modes. 50 vessel max.
/// $0.50 one time. 30 days from last message.
module conk::dock {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};

    const E_DOCK_EXPIRED:    u64 = 1;
    const E_NOT_OWNER:       u64 = 2;
    const E_MAX_VESSELS:     u64 = 3;
    const LIFESPAN_MS: u64 = 30 * 24 * 60 * 60 * 1000;
    const MAX_VESSELS: u64 = 50;

    const MODE_SHIELDED:     u8 = 0;
    const MODE_DISCOVERABLE: u8 = 1;
    const MODE_INVITE:       u8 = 2;
    const MODE_SIREN:        u8 = 3;

    public struct Dock has key, store {
        id:              UID,
        owner_vessel_id: ID,
        owner:           address,
        mode:            u8,
        created_at:      u64,
        last_message:    u64,
        vessel_count:    u64,
        message_count:   u64,
        has_siren:       bool,
        siren_message:   Option<vector<u8>>,
    }

    public struct DockCap has key, store {
        id:      UID,
        dock_id: ID,
        owner:   address,
    }

    public struct DockCreated has copy, drop {
        dock_id:    address,
        owner:      address,
        mode:       u8,
        created_at: u64,
    }

    public struct DockMessage has copy, drop {
        dock_id:   address,
        sender:    address,
        burn:      bool,
        has_media: bool,
        sent_at:   u64,
    }

    public struct DockWrecked has copy, drop {
        dock_id:    address,
        wrecked_at: u64,
    }

    public fun is_alive(dock: &Dock, clock: &Clock): bool {
        clock::timestamp_ms(clock) < dock.last_message + LIFESPAN_MS
    }

    public fun mode(dock: &Dock):          u8   { dock.mode }
    public fun vessel_count(dock: &Dock):  u64  { dock.vessel_count }
    public fun message_count(dock: &Dock): u64  { dock.message_count }
    public fun has_siren(dock: &Dock):     bool { dock.has_siren }
    public fun last_message(dock: &Dock):  u64  { dock.last_message }
    public fun expires_at(dock: &Dock):    u64  { dock.last_message + LIFESPAN_MS }
    public fun mode_shielded():     u8 { MODE_SHIELDED }
    public fun mode_discoverable(): u8 { MODE_DISCOVERABLE }
    public fun mode_invite():       u8 { MODE_INVITE }
    public fun mode_siren():        u8 { MODE_SIREN }
}
