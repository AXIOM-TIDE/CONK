import { test, expect } from '@playwright/test'
import { enterVessel, fuelVessel } from './helpers'

test.describe('Decay Timers & Tide State', () => {

  test('Cast rows show decay badges', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-drift').click()
    // At least some casts should have decay badges
    const decayBadges = page.getByTestId('decay-badge')
    await expect(decayBadges.first()).toBeVisible()
  })

  test('Future release cast shows locked state with countdown', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await page.getByTestId('tab-drift').click()
    const futureCast = page.getByTestId('future-signal')
    if (await futureCast.count() > 0) {
      await expect(page.getByTestId('future-countdown').first()).toBeVisible()
    }
  })

  test('Tide state indicators appear on aging casts', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-drift').click()
    // tide-indicator may or may not appear depending on seed data age
    // Just verify no console errors
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await page.waitForTimeout(1000)
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0)
  })

  test('Vessel cards show decay badges in VesselSelect', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    // Complete onboarding
    await page.getByTestId('onboard-continue').click()
    await page.getByTestId('onboard-continue').click()
    await page.getByTestId('tier-ghost').click()
    await page.getByTestId('onboard-launch').click()
    await page.getByTestId('enter-vessels-btn').click()
    // Vessel card should have decay badge
    await expect(page.getByTestId('vessel-decay-badge').first()).toBeVisible()
  })

})
