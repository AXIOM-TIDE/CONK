/// CONK — Drift Contract
/// The public feed. Titles free. Messages $0.001.
/// 1M visits in 24hr OR 500k x 3 tides = Lighthouse.
module conk::drift {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};

    const E_POST_EXPIRED:       u64 = 1;
    const E_ALREADY_LIGHTHOUSE: u64 = 2;

    const MS_24H: u64 = 24 * 60 * 60 * 1000;
    const THRESHOLD_INSTANT: u64 = 1_000_000;
    const THRESHOLD_TIDE:    u64 =   500_000;
    const LH_LIFESPAN_MS: u64 = 100 * 365 * 24 * 60 * 60 * 1000;

    public struct DriftPost has key, store {
        id:               UID,
        author_vessel_id: ID,
        hook:             vector<u8>,
        content_blob_id:  vector<u8>,
        media_blob_id:    Option<vector<u8>>,
        duration:         u8,
        created_at:       u64,
        expires_at:       u64,
        visit_count:      u64,
        tide_1_count:     u64,
        tide_2_count:     u64,
        tide_3_count:     u64,
        current_tide:     u8,
        is_lighthouse:    bool,
    }

    public struct PostCreated has copy, drop {
        post_id:    address,
        hook:       vector<u8>,
        duration:   u8,
        created_at: u64,
    }

    public struct PostRead has copy, drop {
        post_id: address,
        read_at: u64,
    }

    public struct TideSurvived has copy, drop {
        post_id:     address,
        tide:        u8,
        visit_count: u64,
        survived_at: u64,
    }

    public struct LighthouseBorn has copy, drop {
        lighthouse_id:  address,
        birth_path:     u8,
        total_visits:   u64,
        born_at:        u64,
    }

    public struct LighthouseVisited has copy, drop {
        lighthouse_id: address,
        visit_count:   u64,
        visited_at:    u64,
        expires_at:    u64,
    }

    public struct LighthouseKillFired has copy, drop {
        lighthouse_id: address,
        visit_count:   u64,
        stood_for_ms:  u64,
        killed_at:     u64,
    }

    public fun hook(post: &DriftPost):          vector<u8> { post.hook }
    public fun visit_count(post: &DriftPost):   u64        { post.visit_count }
    public fun is_lighthouse(post: &DriftPost): bool       { post.is_lighthouse }
    public fun current_tide(post: &DriftPost):  u8         { post.current_tide }
    public fun expires_at(post: &DriftPost):    u64        { post.expires_at }
    public fun is_alive(post: &DriftPost, clock: &Clock): bool {
        post.is_lighthouse || clock::timestamp_ms(clock) < post.expires_at
    }
}
