import { Page, expect } from '@playwright/test'

// ── Clear all persisted state and reload ──────────────────────
export async function clearState(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('conk')) localStorage.removeItem(k)
    })
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
}

// ── Complete 3-step onboarding → lands on HarborHome ─────────
export async function completeOnboarding(page: Page) {
  await clearState(page)

  // Should show onboarding since no state
  // Step 1 — Welcome: click "Get started"
  await page.waitForSelector('[data-testid="onboard-continue"]', { timeout: 8000 })
  await page.getByTestId('onboard-continue').first().click()

  // Step 2 — Harbor: click "Harbor ready → next"
  await page.waitForSelector('[data-testid="onboard-continue"]', { timeout: 5000 })
  await page.getByTestId('onboard-continue').first().click()

  // Step 3 — Vessel: select ghost tier and launch
  await page.waitForSelector('[data-testid="tier-ghost"]', { timeout: 5000 })
  await page.getByTestId('tier-ghost').click()
  await page.getByTestId('onboard-launch').click()

  // Wait for harbor screen
  await page.waitForSelector('[data-testid="harbor-home"]', { timeout: 10000 })
}

// ── Navigate to VesselSelect ──────────────────────────────────
export async function goToVesselSelect(page: Page) {
  await completeOnboarding(page)
  await page.getByTestId('enter-vessels-btn').first().click()
  await page.waitForSelector('[data-testid="vessel-select"]', { timeout: 5000 })
}

// ── Enter the active vessel → VesselHome ─────────────────────
export async function enterVessel(page: Page) {
  await goToVesselSelect(page)
  await page.getByTestId('enter-vessel-btn').first().click()
  await page.waitForSelector('[data-testid="vessel-home"]', { timeout: 5000 })
}

// ── Draw $0.25 fuel from Harbor into vessel ───────────────────
export async function fuelVessel(page: Page) {
  // Click the fuel module to open draw fuel modal
  await page.getByTestId('fuel-module').first().click()
  await page.waitForSelector('[data-testid="draw-fuel-modal"]', { timeout: 5000 })

  // Select $0.25
  await page.getByTestId('fuel-amount-25').click()

  // Charge
  await page.getByTestId('charge-vessel-btn').click()

  // Wait for modal to close
  await page.waitForSelector('[data-testid="draw-fuel-modal"]', { state: 'hidden', timeout: 5000 })

  // Verify fuel updated
  await expect(page.getByTestId('fuel-value')).not.toContainText('$0.00')
}

// ── Navigate to drift tab ─────────────────────────────────────
export async function goToDrift(page: Page) {
  await page.getByTestId('tab-drift').click()
  await page.waitForSelector('[data-testid="cast-row"]', { timeout: 5000 })
}

// ── Open paywall on first open-mode cast ─────────────────────
export async function openPayway(page: Page) {
  // Find first non-future, non-burn, non-eyes cast
  const rows = page.getByTestId('cast-row')
  const count = await rows.count()

  for (let i = 0; i < count; i++) {
    const row = rows.nth(i)
    // Skip future signals
    const isFuture = await row.locator('[data-testid="future-countdown"]').count()
    if (isFuture > 0) continue

    await row.click()

    const expanded = await page.waitForSelector('[data-testid="cast-expanded"]', { timeout: 3000 }).catch(() => null)
    if (!expanded) continue

    const cta = page.getByTestId('cross-payway-btn')
    const ctaVisible = await cta.isVisible().catch(() => false)
    if (ctaVisible) {
      await cta.click()
      await page.waitForSelector('[data-testid="payway-modal"]', { timeout: 5000 })
      return
    }
  }
  throw new Error('Could not find a cast to open payway on')
}

// ── Complete full paywall → unlock → content visible ─────────
export async function unlockCast(page: Page) {
  await openPayway(page)

  // Step 1 — preview: click Continue
  await page.waitForSelector('[data-testid="payway-step-preview"]', { timeout: 5000 })
  await page.getByTestId('payway-continue-btn').click()

  // Step 2 — confirm: click Open Signal
  await page.waitForSelector('[data-testid="payway-step-confirm"]', { timeout: 5000 })
  await page.getByTestId('payway-confirm-btn').click()

  // Wait for content
  await page.waitForSelector('[data-testid="cast-body"]', { timeout: 8000 })
}
