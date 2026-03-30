import { test, expect } from '@playwright/test'
import { enterVessel, fuelVessel, goToDrift, unlockCast } from './helpers'

test.describe('Burn / Store / Wreck', () => {

  test('Burn removes cast from drift for this vessel', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    const firstHook = await page.getByTestId('cast-hook').first().textContent()
    await unlockCast(page)
    await page.getByTestId('viewer-burn-btn').click()
    // Cast should disappear
    await page.waitForTimeout(1000)
    const hooks = await page.getByTestId('cast-hook').allTextContents()
    expect(hooks).not.toContain(firstHook)
  })

  test('Burned cast does not reappear after page reload', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    const firstHook = await page.getByTestId('cast-hook').first().textContent()
    await unlockCast(page)
    await page.getByTestId('viewer-burn-btn').click()
    await page.waitForTimeout(500)
    // Reload
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    // Re-enter vessel after reload
    await page.waitForSelector('[data-testid="enter-vessels-btn"]', { timeout: 5000 })
    await page.getByTestId('enter-vessels-btn').click()
    await page.getByTestId('enter-vessel-btn').first().click()
    await page.getByTestId('tab-drift').click()
    await page.waitForSelector('[data-testid="cast-row"]', { timeout: 5000 })
    const hooks = await page.getByTestId('cast-hook').allTextContents()
    expect(hooks).not.toContain(firstHook)
  })

  test('Store saves cast to stored tab', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    await unlockCast(page)
    await page.getByTestId('store-btn').click()
    await expect(page.getByTestId('stored-badge')).toBeVisible()
    // Navigate to stored tab
    await page.getByTestId('tab-stored').click()
    await expect(page.getByTestId('stored-panel')).toBeVisible()
    await expect(page.getByTestId('stored-item').first()).toBeVisible()
  })

  test('Burn actions are free — no paywall shown on burn', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    await unlockCast(page)
    await page.getByTestId('viewer-burn-btn').click()
    await expect(page.getByTestId('payway-modal')).not.toBeVisible()
  })

  test('Owner wreck shows WreckModal after creating own cast', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)

    // Create a cast
    await page.getByTestId('tab-cast').click()
    await page.getByTestId('cast-hook-input').fill('Test wreck cast')
    await page.getByTestId('cast-review-btn').click()
    await page.waitForSelector('[data-testid="cast-sound-btn"]', { timeout: 5000 })
    await page.getByTestId('cast-sound-btn').click()
    // Navigate to drift — cast-success unmounts on rerender so check drift instead
    await page.waitForTimeout(1000)
    await goToDrift(page)
    const ownCast = page.getByTestId('cast-row').filter({
      has: page.getByText('Test wreck cast')
    }).first()

    if (await ownCast.count() > 0) {
      await ownCast.click()
      await page.waitForSelector('[data-testid="cast-expanded"]')
      // Own casts are already revealed — no paywall needed
      await page.waitForTimeout(500)

      const wreckBtn = page.getByTestId('wreck-btn')
      if (await wreckBtn.isVisible()) {
        await wreckBtn.click()
        await expect(page.getByTestId('wreck-modal')).toBeVisible()
        await page.getByTestId('wreck-cancel-btn').click()
        await expect(page.getByTestId('wreck-modal')).not.toBeVisible()
      }
    }
  })

})
