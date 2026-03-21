import { test, expect } from '@playwright/test'
import { enterVessel, fuelVessel, goToDrift } from './helpers'

test.describe('Security Question Gate', () => {

  test('Security-gated cast shows gated badge', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    await expect(page.getByTestId('security-badge').first()).toBeVisible()
  })

  // Helper: navigate to seed_009 (security gated), complete paywall
  async function openGatedCast(page: any) {
    await goToDrift(page)
    // Find the cast with security badge - use text match for seed_009's hook
    const gatedRow = page.getByTestId('cast-row').filter({
      has: page.getByTestId('security-badge')
    }).first()
    await expect(gatedRow).toBeVisible({ timeout: 5000 })
    await gatedRow.click()
    await page.waitForSelector('[data-testid="cast-expanded"]', { timeout: 5000 })
    // Cross payway
    await page.getByTestId('cross-payway-btn').click()
    await page.waitForSelector('[data-testid="payway-modal"]', { timeout: 5000 })
    await page.getByTestId('payway-continue-btn').click()
    await page.waitForSelector('[data-testid="payway-step-confirm"]', { timeout: 5000 })
    await page.getByTestId('payway-confirm-btn').click()
    // Security modal should now appear
    await page.waitForSelector('[data-testid="security-modal"]', { timeout: 8000 })
  }

  test('Security modal appears after paywall confirmation', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await openGatedCast(page)
    await expect(page.getByTestId('security-modal')).toBeVisible()
    // Body not yet visible
    expect(await page.getByTestId('cast-body').count()).toBe(0)
  })

  test('Wrong answer shows error and blocks reveal', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    // Extra fuel for wrong answer penalty
    await page.getByTestId('fuel-module').first().click()
    await page.getByTestId('fuel-amount-25').click()
    await page.getByTestId('charge-vessel-btn').click()
    await page.waitForSelector('[data-testid="draw-fuel-modal"]', { state: 'hidden' })

    await openGatedCast(page)
    await page.getByTestId('security-answer-input').fill('wrong answer')
    await page.getByTestId('security-submit-btn').click()
    await expect(page.getByTestId('security-error')).toBeVisible()
    expect(await page.getByTestId('cast-body').count()).toBe(0)
  })

  test('Correct answer reveals content', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await page.getByTestId('fuel-module').first().click()
    await page.getByTestId('fuel-amount-25').click()
    await page.getByTestId('charge-vessel-btn').click()
    await page.waitForSelector('[data-testid="draw-fuel-modal"]', { state: 'hidden' })

    await openGatedCast(page)
    await page.getByTestId('security-answer-input').fill('a read')
    await page.getByTestId('security-submit-btn').click()
    await expect(page.getByTestId('cast-body')).toBeVisible({ timeout: 8000 })
  })

})
