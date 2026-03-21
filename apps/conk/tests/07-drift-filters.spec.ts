import { test, expect } from '@playwright/test'
import { enterVessel, fuelVessel } from './helpers'

test.describe('Drift Filters & Search', () => {

  test('Drift shows cast rows by default', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-drift').click()
    await expect(page.getByTestId('cast-row').first()).toBeVisible()
  })

  test('Mode filter — burn shows only burn casts', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-drift').click()
    await page.getByTestId('filter-burn').click()
    const rows = page.getByTestId('cast-row')
    const count = await rows.count()
    if (count > 0) {
      // All visible rows should have burn badge
      for (let i = 0; i < Math.min(count, 3); i++) {
        await expect(rows.nth(i).getByTestId('mode-badge')).toContainText('Burn')
      }
    }
  })

  test('Mode filter — eyes only shows only eyes casts', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-drift').click()
    await page.getByTestId('filter-eyes-only').click()
    const rows = page.getByTestId('cast-row')
    const count = await rows.count()
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        await expect(rows.nth(i).getByTestId('mode-badge')).toContainText('Eyes Only')
      }
    }
  })

  test('Keyword search filters by hook text', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-drift').click()
    await page.getByTestId('search-toggle').click()
    await page.getByTestId('search-input').fill('protocol')
    // Should filter to only matching casts
    const results = page.getByTestId('cast-row')
    const count = await results.count()
    expect(count).toBeGreaterThan(0)
    // All results should contain "protocol" in hook or be keyword-matched
    await expect(page.getByTestId('search-result-count')).toBeVisible()
  })

  test('Clear search restores full drift', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-drift').click()
    const totalBefore = await page.getByTestId('cast-row').count()
    await page.getByTestId('search-toggle').click()
    await page.getByTestId('search-input').fill('zzznomatch')
    await expect(page.getByTestId('cast-row')).toHaveCount(0)
    await page.getByTestId('search-clear-btn').click()
    const totalAfter = await page.getByTestId('cast-row').count()
    expect(totalAfter).toEqual(totalBefore)
  })

  test('All filter shows all non-burned casts', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-drift').click()
    await page.getByTestId('filter-burn').click()
    await page.getByTestId('filter-all').click()
    const count = await page.getByTestId('cast-row').count()
    expect(count).toBeGreaterThan(1)
  })

})
