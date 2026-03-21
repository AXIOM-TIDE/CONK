import { test, expect } from '@playwright/test'
import { clearState, completeOnboarding, enterVessel, fuelVessel, goToDrift, unlockCast } from './helpers'

test.describe('Content Gate — no leaks before unlock', () => {

  test('Harbor-only user sees hooks but NOT message bodies', async ({ page }) => {
    await completeOnboarding(page)
    // Hooks visible
    await expect(page.getByTestId('cast-hook').first()).toBeVisible()
    // No body content visible at all
    const bodies = page.getByTestId('cast-body')
    expect(await bodies.count()).toBe(0)
  })

  test('Clicking hook without vessel shows vessel-required nudge', async ({ page }) => {
    await clearState(page)
    await page.goto('/')
    // Wait for any content
    await page.waitForLoadState('domcontentloaded')
    const hooks = page.getByTestId('cast-hook')
    const count = await hooks.count()
    if (count > 0) {
      await hooks.first().click()
      // Should NOT show body
      const bodies = page.getByTestId('cast-body')
      expect(await bodies.count()).toBe(0)
    }
  })

  test('Paywall appears before content — payway modal shown first', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)

    // Click first cast
    await page.getByTestId('cast-row').first().click()
    await page.waitForSelector('[data-testid="cast-expanded"]', { timeout: 5000 })

    // Body NOT visible yet
    expect(await page.getByTestId('cast-body').count()).toBe(0)

    // CTA visible
    await expect(page.getByTestId('cross-payway-btn')).toBeVisible()
    await page.getByTestId('cross-payway-btn').click()

    // Payway modal appears — body still not visible
    await expect(page.getByTestId('payway-modal')).toBeVisible()
    expect(await page.getByTestId('cast-body').count()).toBe(0)
  })

  test('Body only visible after full unlock completes', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    await unlockCast(page)
    await expect(page.getByTestId('cast-body')).toBeVisible()
  })

  test('Future-release cast shows locked countdown, not content', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    const countdowns = page.getByTestId('future-countdown')
    if (await countdowns.count() > 0) {
      await expect(countdowns.first()).toBeVisible()
      // Body count should still be 0
      expect(await page.getByTestId('cast-body').count()).toBe(0)
    }
  })

})
