/// AXIOM TIDE PROTOCOL · v14.0.0
/// PRIMITIVE 3 OF 7 · CAST
/// The communication primitive. Everything is a cast.
/// Open · Sealed · Eyes Only · Ghost.
/// v5: Dock mechanics — single-claim by default, open-Dock upgrade at $0.01/slot.
/// v5: Author payment routing fixed (97% to author, not recipient).
/// v5: Tide & Lighthouse mechanics preserved on-chain, hidden in CONK UI.
/// v6: Flare minimum publish fee ($0.05).
/// v11: BUG-4 fixed — sound() requires &mut Vessel + &VesselCap, calls touch() internally.
///      vessel_id and vessel_tier derived from Vessel object — not trusted from caller.
/// v11: lighthouse_path added to Cast struct; set in become_lighthouse().
/// v11: vessel_id added to CastSounded event for indexer attribution.
/// v11: read() accepts &ProtocolConfig for dynamic Lighthouse threshold.
/// v14: Expiration is visibility, not death.
///      Expired casts leave Drift but remain readable — reads still accumulate toward Lighthouse.
///      wreck() only fires on truly abandoned casts: expired + 30-day neglect window.
///      check_tide() is now cumulative (no 24h velocity gate) — tides are phases, not races.
///      Native synapse references via dynamic field: cast::set_references().
///      STATE_WRECKED (2) added to distinguish keeper-wrecked from author-burned casts.
/// Copyright © 2026 Axiom Tide LLC · axiomtide.com
module axiom_tide::cast {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::dynamic_field;
    use 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC;
    use axiom_tide::abyss::{Self, Abyss};
    use axiom_tide::vessel::{Self, Vessel, VesselCap};
    use axiom_tide::config::{Self, ProtocolConfig};

    // ─── Errors ───────────────────────────────────────────────────────────────
    const E_CAST_EXPIRED:             u64 = 1;   // kept for ABI compat; no longer used in read()
    const E_WRONG_RECIPIENT:          u64 = 2;
    const E_ALREADY_BURNED:           u64 = 3;   // state != STATE_LIVE (burned or wrecked)
    const E_PRICE_TOO_LOW:            u64 = 4;
    const E_DOCK_FULL:                u64 = 5;
    const E_INVALID_MAX_CLAIMS:       u64 = 6;
    const E_INSUFFICIENT_UPGRADE_FEE: u64 = 7;
    const E_INSUFFICIENT_FLARE_FEE:   u64 = 8;
    const E_NOT_EXPIRED:              u64 = 9;   // wreck(): not yet past abandon window
    const E_IS_LIGHTHOUSE:            u64 = 10;  // wreck(): lighthouses cannot be wrecked
    const E_NOT_CAST_AUTHOR:          u64 = 11;  // set_references(): cap doesn't match cast vessel

    // ─── Constants ────────────────────────────────────────────────────────────
    const MIN_PAID_PRICE:   u64 = 1_000;
    const DOCK_SLOT_PRICE:  u64 = 10_000;
    const MIN_FLARE_PUBLISH_FEE: u64 = 50_000;
    const MIN_MAX_CLAIMS:   u64 = 1;
    const MAX_MAX_CLAIMS:   u64 = 10_000;

    const MODE_OPEN:      u8 = 0;
    const MODE_SEALED:    u8 = 1;
    const MODE_EYES_ONLY: u8 = 2;
    const MODE_GHOST:     u8 = 3;

    /// v14: STATE_WRECKED (2) distinguishes keeper-wrecked casts from
    /// author-burned (GHOST/EYES_ONLY) casts. Both are permanently inert.
    const STATE_LIVE:    u8 = 0;
    const STATE_BURNED:  u8 = 1;  // auto-burned by mode (GHOST / EYES_ONLY full)
    const STATE_WRECKED: u8 = 2;  // v14: keeper-wrecked after abandon window

    const DUR_24H: u8 = 1;
    const DUR_48H: u8 = 2;
    const DUR_72H: u8 = 3;
    const DUR_7D:  u8 = 4;
    const MS_24H:  u64 = 24 * 60 * 60 * 1000;

    const LH_PATH_MILLION: u8 = 1;
    const LH_PATH_TIDES:   u8 = 2;

    /// v14: 30-day abandon window after expiry before wreck() is callable.
    /// Gives active casts time to accumulate reads toward Lighthouse
    /// even after they've left the active Drift feed.
    const ABANDON_WINDOW_MS: u64 = 30 * 24 * 60 * 60 * 1000;

    /// v14: dynamic_field key for native synapse references.
    const REFS_KEY: vector<u8> = b"refs";

    // ─── Struct ───────────────────────────────────────────────────────────────
    public struct Cast has key, store {
        id:                    UID,
        vessel_id:             ID,
        vessel_tier:           u8,
        hook:                  vector<u8>,
        content_blob:          vector<u8>,
        media_blob:            Option<vector<u8>>,
        mode:                  u8,
        recipient:             address,
        state:                 u8,
        created_at:            u64,
        expires_at:            u64,
        read_count:            u64,
        tide_1_count:          u64,
        tide_2_count:          u64,
        tide_3_count:          u64,
        current_tide:          u8,
        is_lighthouse:         bool,
        fee_paid:              u64,
        author:                address,
        max_claims:            u64,
        claims_used:           u64,
        dock_upgrade_fee_paid: u64,
        dock_description:      vector<u8>,
        lighthouse_path:       u8,
    }

    // ─── Events ───────────────────────────────────────────────────────────────
    public struct CastSounded has copy, drop {
        cast_id:    address,
        vessel_id:  address,
        hook:       vector<u8>,
        mode:       u8,
        duration:   u8,
        created_at: u64,
        expires_at: u64,
    }

    public struct CastRead has copy, drop {
        cast_id:    address,
        read_count: u64,
        read_at:    u64,
    }

    public struct CastBurned has copy, drop {
        cast_id:   address,
        mode:      u8,
        burned_at: u64,
    }

    public struct TideSurvived has copy, drop {
        cast_id:     address,
        tide:        u8,
        read_count:  u64,
        survived_at: u64,
    }

    public struct LighthouseBorn has copy, drop {
        cast_id:     address,
        birth_path:  u8,
        read_count:  u64,
        born_at:     u64,
    }

    public struct DockOpened has copy, drop {
        cast_id:          address,
        max_claims:       u64,
        upgrade_fee_paid: u64,
        opened_at:        u64,
    }

    public struct DockClaimed has copy, drop {
        cast_id:     address,
        claimant:    address,
        claims_used: u64,
        max_claims:  u64,
        claimed_at:  u64,
    }

    public struct CastWrecked has copy, drop {
        cast_id:    address,
        wrecked_at: u64,
    }

    /// v14: emitted when a cast author declares on-chain synapse references.
    /// brain indexer picks this up and writes explicit edges (weight=2.0).
    public struct CastReferenced has copy, drop {
        cast_id:    address,
        references: vector<address>,
        updated_at: u64,
    }

    // ─── sound() ──────────────────────────────────────────────────────────────
    public fun sound(
        fee_coin:         Coin<USDC>,
        abyss:            &mut Abyss,
        vessel:           &mut Vessel,
        vessel_cap:       &VesselCap,
        hook:             vector<u8>,
        content_blob:     vector<u8>,
        media_blob:       Option<vector<u8>>,
        mode:             u8,
        recipient:        address,
        duration:         u8,
        fee:              u64,
        max_claims:       u64,
        dock_description: vector<u8>,
        clock:            &Clock,
        ctx:              &mut TxContext,
    ) {
        assert!(max_claims >= MIN_MAX_CLAIMS && max_claims <= MAX_MAX_CLAIMS, E_INVALID_MAX_CLAIMS);

        let dock_upgrade_fee = (max_claims - 1) * DOCK_SLOT_PRICE;
        let paid_amount = coin::value(&fee_coin);
        assert!(paid_amount >= dock_upgrade_fee, E_INSUFFICIENT_UPGRADE_FEE);

        if (mode == MODE_EYES_ONLY) {
            assert!(paid_amount >= MIN_FLARE_PUBLISH_FEE + dock_upgrade_fee, E_INSUFFICIENT_FLARE_FEE);
        };

        let _burn_after_cast = vessel::touch(vessel, vessel_cap, clock, ctx);

        let vessel_id   = object::id(vessel);
        let vessel_tier = vessel::tier(vessel);
        let author_addr = vessel::owner(vessel);

        let now     = clock::timestamp_ms(clock);
        let life_ms = if (duration == DUR_24H)      { MS_24H }
                      else if (duration == DUR_48H)  { MS_24H * 2 }
                      else if (duration == DUR_72H)  { MS_24H * 3 }
                      else                           { MS_24H * 7 };

        abyss::receive_cast(abyss, fee_coin, clock, ctx);

        let cast = Cast {
            id:                    object::new(ctx),
            vessel_id,
            vessel_tier,
            hook,
            content_blob,
            media_blob,
            mode,
            recipient,
            state:                 STATE_LIVE,
            created_at:            now,
            expires_at:            now + life_ms,
            read_count:            0,
            tide_1_count:          0,
            tide_2_count:          0,
            tide_3_count:          0,
            current_tide:          1,
            is_lighthouse:         false,
            fee_paid:              fee,
            author:                author_addr,
            max_claims,
            claims_used:           0,
            dock_upgrade_fee_paid: dock_upgrade_fee,
            dock_description,
            lighthouse_path:       0,
        };
        let cast_id = object::id_to_address(&object::id(&cast));

        event::emit(CastSounded {
            cast_id,
            vessel_id: object::id_to_address(&vessel_id),
            hook: cast.hook,
            mode,
            duration,
            created_at: now,
            expires_at: now + life_ms,
        });

        if (max_claims > 1) {
            event::emit(DockOpened {
                cast_id,
                max_claims,
                upgrade_fee_paid: dock_upgrade_fee,
                opened_at: now,
            });
        };

        transfer::share_object(cast);
    }

    // ─── read() — v14: expiry no longer blocks reads ──────────────────────────
    //
    // v14 change: the E_CAST_EXPIRED guard is removed.
    //
    // Rationale: expiry is now a visibility event (cast leaves Drift) not a death
    // event. Expired casts are still readable; reads still accumulate toward
    // Lighthouse. Only truly abandoned casts (state = STATE_WRECKED) are dead.
    //
    // Payment flow is identical: PROTOCOL_READ_FEE + cast.fee_paid.
    // SEAL decryption path is identical: zkProxy verifies CastRead event on-chain.
    // The only change is the removed assert.

    public fun read(
        cast:     &mut Cast,
        fee_coin: Coin<USDC>,
        abyss:    &mut Abyss,
        config:   &ProtocolConfig,
        reader:   address,
        clock:    &Clock,
        ctx:      &mut TxContext,
    ) {
        let now = clock::timestamp_ms(clock);

        // v14: state check covers STATE_BURNED (GHOST/EYES_ONLY auto-burn)
        // and STATE_WRECKED (keeper-wrecked after 30-day abandon).
        // Removed: E_CAST_EXPIRED — expired casts are still readable.
        assert!(cast.state == STATE_LIVE, E_ALREADY_BURNED);

        if (cast.mode == MODE_EYES_ONLY) {
            assert!(cast.claims_used < cast.max_claims, E_DOCK_FULL);
            cast.claims_used = cast.claims_used + 1;
            event::emit(DockClaimed {
                cast_id:     object::id_to_address(&object::id(cast)),
                claimant:    reader,
                claims_used: cast.claims_used,
                max_claims:  cast.max_claims,
                claimed_at:  now,
            });
        } else if (cast.mode == MODE_SEALED) {
            assert!(reader == cast.recipient, E_WRONG_RECIPIENT);
        };

        // v13 two-payment model — unchanged in v14.
        let paid_amount = coin::value(&fee_coin);
        let total_required = abyss::fee_read() + cast.fee_paid;
        assert!(paid_amount >= total_required, E_PRICE_TOO_LOW);

        let mut coin_mut = fee_coin;

        if (cast.fee_paid > 0) {
            let author_amount = (cast.fee_paid * 97) / 100;
            let author_payment = coin::split(&mut coin_mut, author_amount, ctx);
            transfer::public_transfer(author_payment, cast.author);
        };

        abyss::receive_read(abyss, coin_mut, clock, ctx);

        cast.read_count = cast.read_count + 1;
        event::emit(CastRead {
            cast_id:    object::id_to_address(&object::id(cast)),
            read_count: cast.read_count,
            read_at:    now,
        });

        if (cast.mode == MODE_GHOST || cast.mode == MODE_EYES_ONLY) {
            if (cast.mode == MODE_GHOST || cast.claims_used >= cast.max_claims) {
                cast.state        = STATE_BURNED;
                cast.content_blob = vector::empty();
                cast.media_blob   = option::none();
                event::emit(CastBurned {
                    cast_id:   object::id_to_address(&object::id(cast)),
                    mode:      cast.mode,
                    burned_at: now,
                });
            };
            return
        };

        // Tide/Lighthouse check: OPEN casts only.
        if (cast.mode == MODE_OPEN) { check_tide(cast, config, clock); };
    }

    // ─── set_references() — v14: native on-chain synapse declarations ─────────
    //
    // Declares explicit Cast→Cast references on-chain via dynamic field.
    // Only callable by the vessel that authored this cast (verified via VesselCap).
    // Overwrites any previous references (idempotent).
    //
    // Brain indexer picks up CastReferenced events and writes explicit synapse
    // edges with weight=2.0 (strongest signal).
    //
    // refs: vector of Cast object IDs (as address) that this cast references.
    // The brain validates each ref exists before writing a synapse edge.

    public fun set_references(
        cast:  &mut Cast,
        refs:  vector<address>,
        cap:   &VesselCap,
        clock: &Clock,
        _ctx:  &mut TxContext,
    ) {
        // Verify the cap belongs to the vessel that authored this cast.
        assert!(vessel::cap_vessel_id(cap) == cast.vessel_id, E_NOT_CAST_AUTHOR);

        let now = clock::timestamp_ms(clock);

        // Overwrite any existing refs dynamic field.
        if (dynamic_field::exists_(&cast.id, REFS_KEY)) {
            let _old: vector<address> = dynamic_field::remove(&mut cast.id, REFS_KEY);
        };
        dynamic_field::add(&mut cast.id, REFS_KEY, refs);

        event::emit(CastReferenced {
            cast_id:    object::id_to_address(&object::id(cast)),
            references: refs,
            updated_at: now,
        });
    }

    // ─── wreck() — v14: 30-day abandon window ────────────────────────────────
    //
    // Callable by anyone (keeper daemon) after a cast is both:
    //   (a) expired (now >= expires_at), AND
    //   (b) abandoned for ABANDON_WINDOW_MS (30 days) past expiry
    //       (now >= expires_at + ABANDON_WINDOW_MS)
    //
    // This gives every cast a 30-day window after expiry to keep accumulating
    // reads toward Lighthouse before content is zeroed. A cast that's being
    // actively read will become a Lighthouse before day 37; only truly neglected
    // casts get wrecked.
    //
    // v14: sets STATE_WRECKED (2) rather than STATE_BURNED (1), allowing
    // indexers to distinguish author-burned from keeper-wrecked.
    //
    // The "not referenced by graph" condition is enforced by the drift-keeper
    // daemon (off-chain, DB check) before calling this function.

    public fun wreck(
        cast:  &mut Cast,
        clock: &Clock,
    ) {
        let now = clock::timestamp_ms(clock);
        assert!(cast.state == STATE_LIVE,            E_ALREADY_BURNED);
        assert!(!cast.is_lighthouse,                  E_IS_LIGHTHOUSE);
        // v14: must be past the 30-day abandon window, not just past expires_at.
        assert!(now >= cast.expires_at + ABANDON_WINDOW_MS, E_NOT_EXPIRED);

        cast.state        = STATE_WRECKED;
        cast.content_blob = vector::empty();
        cast.media_blob   = option::none();

        event::emit(CastWrecked {
            cast_id:    object::id_to_address(&object::id(cast)),
            wrecked_at: now,
        });

        event::emit(CastBurned {
            cast_id:   object::id_to_address(&object::id(cast)),
            mode:      cast.mode,
            burned_at: now,
        });
    }

    // ─── Internal: check_tide() — v14: cumulative phases, no velocity gate ────
    //
    // v14 change: removed age_ms ≤ MS_24H constraints.
    //
    // Tides are now cumulative read segments, not velocity races:
    //   Tide 1: first tide_threshold reads total → TideSurvived(1)
    //   Tide 2: next tide_threshold reads total  → TideSurvived(2)
    //   Tide 3: next tide_threshold reads total  → LighthouseBorn (LH_PATH_TIDES)
    //
    // Direct path (unchanged): if read_count reaches lighthouse_threshold, the cast
    // becomes a Lighthouse immediately via LH_PATH_MILLION. Since threshold=1000
    // and each tide_threshold=500, the direct path (1000 reads) fires before
    // tidal path (1500 reads) if read velocity is consistent.
    //
    // v14: expires_at extension on tide transitions removed — expiry is a
    // visibility gate (leaves Drift), not a lifecycle gate (blocks reads).
    // Tides advance purely on read_count, independent of time.

    fun check_tide(cast: &mut Cast, config: &ProtocolConfig, clock: &Clock) {
        if (cast.is_lighthouse) return;

        let now            = clock::timestamp_ms(clock);
        let threshold      = config::lighthouse_threshold(config);
        let tide_threshold = config::tide_threshold(config);

        // Direct path: lighthouse_threshold reads total → instant Lighthouse.
        // No time constraint in v14.
        if (cast.read_count >= threshold) {
            become_lighthouse(cast, LH_PATH_MILLION, now);
            return
        };

        // Tidal path: cumulative read segments.
        // Tide 1 → Tide 2 → Tide 3 → Lighthouse.
        // No age_ms check — reads accumulate regardless of cast age or expiry status.
        if (cast.current_tide == 1) {
            if (cast.read_count >= tide_threshold) {
                cast.tide_1_count = cast.read_count;
                cast.current_tide = 2;
                // v14: no expires_at extension — expiry is visibility, not lifecycle.
                event::emit(TideSurvived {
                    cast_id:     object::id_to_address(&object::id(cast)),
                    tide:        1,
                    read_count:  cast.tide_1_count,
                    survived_at: now,
                });
            }
        } else if (cast.current_tide == 2) {
            let tide_2 = cast.read_count - cast.tide_1_count;
            if (tide_2 >= tide_threshold) {
                cast.tide_2_count = tide_2;
                cast.current_tide = 3;
                event::emit(TideSurvived {
                    cast_id:     object::id_to_address(&object::id(cast)),
                    tide:        2,
                    read_count:  cast.tide_2_count,
                    survived_at: now,
                });
            }
        } else if (cast.current_tide == 3) {
            let tide_3 = cast.read_count - cast.tide_1_count - cast.tide_2_count;
            if (tide_3 >= tide_threshold) {
                cast.tide_3_count = tide_3;
                become_lighthouse(cast, LH_PATH_TIDES, now);
            }
        }
    }

    fun become_lighthouse(cast: &mut Cast, path: u8, now: u64) {
        cast.is_lighthouse   = true;
        cast.lighthouse_path = path;
        cast.expires_at      = now + (100 * 365 * 24 * 60 * 60 * 1000);
        event::emit(LighthouseBorn {
            cast_id:    object::id_to_address(&object::id(cast)),
            birth_path: path,
            read_count: cast.read_count,
            born_at:    now,
        });
    }

    // ─── View helpers ─────────────────────────────────────────────────────────
    public fun hook(c: &Cast):             vector<u8> { c.hook }
    public fun mode(c: &Cast):             u8         { c.mode }
    public fun state(c: &Cast):            u8         { c.state }
    public fun read_count(c: &Cast):       u64        { c.read_count }
    public fun is_lighthouse(c: &Cast):    bool       { c.is_lighthouse }
    public fun current_tide(c: &Cast):     u8         { c.current_tide }
    public fun expires_at(c: &Cast):       u64        { c.expires_at }
    public fun vessel_id(c: &Cast):        ID         { c.vessel_id }
    public fun vessel_tier(c: &Cast):      u8         { c.vessel_tier }
    public fun author(c: &Cast):           address    { c.author }
    public fun max_claims(c: &Cast):       u64        { c.max_claims }
    public fun claims_used(c: &Cast):      u64        { c.claims_used }
    public fun lighthouse_path(c: &Cast):  u8         { c.lighthouse_path }
    public fun content_blob(c: &Cast):     vector<u8> { c.content_blob }
    public fun claims_remaining(c: &Cast): u64 {
        if (c.claims_used >= c.max_claims) 0
        else c.max_claims - c.claims_used
    }
    public fun fee_paid(c: &Cast):              u64  { c.fee_paid }  // v14: needed by tests + SDK
    public fun is_dock_full(c: &Cast):          bool { c.claims_used >= c.max_claims }
    public fun dock_description(c: &Cast):      vector<u8> { c.dock_description }
    public fun dock_upgrade_fee_paid(c: &Cast): u64  { c.dock_upgrade_fee_paid }

    /// v14: read on-chain synapse references (returns empty if never set).
    public fun references(cast: &Cast): vector<address> {
        if (dynamic_field::exists_(&cast.id, REFS_KEY)) {
            *dynamic_field::borrow<vector<u8>, vector<address>>(&cast.id, REFS_KEY)
        } else {
            vector::empty()
        }
    }

    /// v14: true if cast has been keeper-wrecked (state = STATE_WRECKED).
    public fun is_wrecked(c: &Cast): bool { c.state == STATE_WRECKED }

    /// v14: true if cast is past expires_at but not yet wrecked.
    /// These casts are still readable; they've just left the active Drift feed.
    public fun is_expired_not_wrecked(c: &Cast, clock: &Clock): bool {
        let now = clock::timestamp_ms(clock);
        !c.is_lighthouse && now >= c.expires_at && c.state == STATE_LIVE
    }

    // ─── Test helpers ─────────────────────────────────────────────────────────

    /// Create a Cast directly for unit testing, bypassing sound().
    /// Allows setting expires_at and fee_paid explicitly.
    #[test_only]
    public fun create_for_testing(
        vessel_id:  ID,
        author:     address,
        hook:       vector<u8>,
        mode:       u8,
        fee_paid:   u64,
        expires_at: u64,
        ctx:        &mut TxContext,
    ): Cast {
        Cast {
            id:                    object::new(ctx),
            vessel_id,
            vessel_tier:           0,
            hook,
            content_blob:          b"secret content",
            media_blob:            option::none(),
            mode,
            recipient:             author,
            state:                 STATE_LIVE,
            created_at:            0,
            expires_at,
            read_count:            0,
            tide_1_count:          0,
            tide_2_count:          0,
            tide_3_count:          0,
            current_tide:          1,
            is_lighthouse:         false,
            fee_paid,
            author,
            max_claims:            1,
            claims_used:           0,
            dock_upgrade_fee_paid: 0,
            dock_description:      b"",
            lighthouse_path:       0,
        }
    }

    #[test_only]
    public fun destroy_for_testing(cast: Cast) {
        let Cast {
            id, vessel_id: _, vessel_tier: _, hook: _, content_blob: _, media_blob: _,
            mode: _, recipient: _, state: _, created_at: _, expires_at: _, read_count: _,
            tide_1_count: _, tide_2_count: _, tide_3_count: _, current_tide: _,
            is_lighthouse: _, fee_paid: _, author: _, max_claims: _, claims_used: _,
            dock_upgrade_fee_paid: _, dock_description: _, lighthouse_path: _,
        } = cast;
        object::delete(id);
    }

    public fun mode_open():       u8 { MODE_OPEN }
    public fun mode_sealed():     u8 { MODE_SEALED }
    public fun mode_eyes_only():  u8 { MODE_EYES_ONLY }
    public fun mode_ghost():      u8 { MODE_GHOST }
    public fun lh_path_million(): u8 { LH_PATH_MILLION }
    public fun lh_path_tides():   u8 { LH_PATH_TIDES }
    public fun state_live():      u8 { STATE_LIVE }
    public fun state_burned():    u8 { STATE_BURNED }
    public fun state_wrecked():   u8 { STATE_WRECKED }   // v14
}
