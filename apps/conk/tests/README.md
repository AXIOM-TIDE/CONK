# CONK E2E Test Suite

Playwright end-to-end tests covering all launch-critical flows.

## Setup

```bash
# Install dependencies (first time only)
npm install
npx playwright install chromium
```

## Running Tests

```bash
# Run all tests (starts dev server automatically)
npm test

# Run with interactive UI
npm run test:ui

# Run specific file
npx playwright test tests/02-content-gate.spec.ts

# Run specific test
npx playwright test --grep "Body only visible after full unlock"

# View last report
npm run test:report
```

## Test Files

| File | Coverage |
|------|----------|
| `01-harbor-vessel.spec.ts` | Harbor, vessel select, 30-cap, back buttons |
| `02-content-gate.spec.ts` | No content leaks, paywall before body |
| `03-paywall.spec.ts` | Two-step paywall modal, Open Signal confirmation |
| `04-fuel.spec.ts` | Fuel display, Draw Fuel, debit on unlock, autofuel/autoburn toggles |
| `05-security.spec.ts` | Security question gate, wrong/correct answer flows |
| `06-burn-store.spec.ts` | Burn (viewer), Store, Wreck (owner), burn is free |
| `07-drift-filters.spec.ts` | Mode filters, keyword search, clear |
| `08-decay-timers.spec.ts` | Decay badges, future release, tide indicators |

## Launch-Critical Tests (run these first)

```bash
npx playwright test --grep "Body only visible|Paywall appears|Fuel debits|Correct answer reveals|Burn removes"
```

## Key data-testid Reference

| testid | Component | Notes |
|--------|-----------|-------|
| `harbor-home` | HarborHome | Main harbor screen |
| `vessel-select` | VesselSelect | Vessel list screen |
| `vessel-home` | VesselHome | Active vessel screen |
| `cast-row` | DriftFeed | Each cast in drift |
| `cast-hook` | DriftFeed | Hook text |
| `cast-body` | DriftFeed | Revealed body — must NOT appear before unlock |
| `cast-expanded` | DriftFeed | Expanded cast panel |
| `cross-payway-btn` | DriftFeed | Opens paywall |
| `payway-modal` | PaywayModal | Full paywall modal |
| `payway-step-preview` | PaywayModal | Step 1 |
| `payway-step-confirm` | PaywayModal | Step 2 — "Open Signal" |
| `payway-continue-btn` | PaywayModal | Step 1 → Step 2 |
| `payway-confirm-btn` | PaywayModal | Final "Open Signal" |
| `payway-cancel-btn` | PaywayModal | Cancel |
| `payway-back-btn` | PaywayModal | Step 2 → Step 1 |
| `payway-no-fuel` | PaywayModal | Insufficient fuel state |
| `security-modal` | SecurityModal | Security question modal |
| `security-answer-input` | SecurityModal | Answer field |
| `security-submit-btn` | SecurityModal | Submit answer |
| `security-error` | SecurityModal | Wrong answer error |
| `security-badge` | DriftFeed | 🔐 gated badge on cast |
| `fuel-module` | VesselHome | Clickable fuel bar in topbar |
| `fuel-value` | VesselHome | Current fuel amount |
| `fuel-dry-label` | VesselHome | Shown when vessel is dry |
| `fuel-gate` | VesselHome | Shown when no-fuel blocks tab |
| `draw-fuel-modal` | DrawFuelModal | Draw fuel modal |
| `fuel-amount-{N}` | DrawFuelModal | Amount buttons (10/25/50/100) |
| `charge-vessel-btn` | DrawFuelModal | Confirm draw |
| `autofuel-toggle` | VesselHome | Autofuel ON/OFF toggle |
| `autoburn-toggle` | VesselHome | Auto-burn ON/OFF toggle |
| `store-btn` | DriftFeed | Store signal to vessel |
| `stored-badge` | DriftFeed | Shown after storing |
| `viewer-burn-btn` | DriftFeed | Viewer burn (free, local only) |
| `wreck-btn` | DriftFeed | Owner wreck (global) |
| `wreck-modal` | WreckModal | Wreck confirmation modal |
| `wreck-cancel-btn` | WreckModal | Cancel wreck |
| `stored-panel` | VesselHome | Stored signals tab |
| `stored-item` | VesselHome | Each stored signal |
| `future-signal` | DriftFeed | Hidden marker on future casts |
| `future-countdown` | DriftFeed | Unlock countdown display |
| `mode-badge` | DriftFeed | Open/Burn/Eyes Only badge |
| `decay-badge` | DecayBadge | Time remaining badge |
| `search-toggle` | DriftFeed | ⌕ search toggle |
| `search-input` | DriftFeed | Search field |
| `search-clear-btn` | DriftFeed | Clear search |
| `search-result-count` | DriftFeed | Result count |
| `filter-all` | DriftFeed | All filter chip |
| `filter-burn` | DriftFeed | Burn filter chip |
| `filter-eyes-only` | DriftFeed | Eyes Only filter chip |
| `vessel-card` | VesselSelect | Each vessel card |
| `vessel-count` | VesselSelect | "X / 30" count |
| `vessel-cap-warning` | VesselSelect | Cap reached message |
| `new-vessel-btn` | VesselSelect | Launch new vessel |
| `enter-vessel-btn` | VesselSelect | Enter/Switch vessel |
| `vessel-decay-badge` | VesselSelect | Vessel expiry badge |
| `back-to-harbor` | VesselHome | Back to Harbor button |
| `enter-vessels-btn` | HarborHome | Enter vessel flow |
| `onboard-continue` | Onboarding | Continue button |
| `onboard-launch` | Onboarding | Launch vessel button |
| `tier-ghost` | Onboarding | Ghost tier selector |
| `tier-shadow` | Onboarding | Shadow tier selector |
| `tier-open` | Onboarding | Open tier selector |
| `cast-hook-input` | CastPanel | Hook textarea |
| `cast-review-btn` | CastPanel | Review → button |
| `cast-sound-btn` | CastPanel | Sound it button |
| `cast-success` | CastPanel | Success state |
