import { test, expect } from '@playwright/test'
import { enterVessel, fuelVessel, goToDrift, openPayway } from './helpers'

test.describe('Paywall Flow', () => {

  test('Payway modal shows two steps', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    await openPayway(page)

    await expect(page.getByTestId('payway-step-preview')).toBeVisible()
    expect(await page.getByTestId('payway-step-confirm').count()).toBe(0)

    await page.getByTestId('payway-continue-btn').click()
    await expect(page.getByTestId('payway-step-confirm')).toBeVisible()
    expect(await page.getByTestId('payway-step-preview').count()).toBe(0)
  })

  test('Step 2 shows vessel name and fuel summary', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    await openPayway(page)
    await page.getByTestId('payway-continue-btn').click()
    await expect(page.getByTestId('payway-vessel-name')).toBeVisible()
    await expect(page.getByTestId('payway-fuel-summary')).toBeVisible()
    await expect(page.getByTestId('payway-confirm-btn')).toContainText('Open Signal')
  })

  test('Back button on step 2 returns to step 1', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    await openPayway(page)
    await page.getByTestId('payway-continue-btn').click()
    await page.getByTestId('payway-back-btn').click()
    await expect(page.getByTestId('payway-step-preview')).toBeVisible()
  })

  test('Cancel closes payway modal', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await goToDrift(page)
    await openPayway(page)
    await page.getByTestId('payway-cancel-btn').click()
    await expect(page.getByTestId('payway-modal')).not.toBeVisible()
  })

  test('Payway shows insufficient fuel state when vessel is dry', async ({ page }) => {
    await enterVessel(page)
    // Do NOT fuel — vessel is dry
    await goToDrift(page)
    await page.getByTestId('cast-row').first().click()
    await page.waitForSelector('[data-testid="cast-expanded"]')
    await page.getByTestId('cross-payway-btn').click()
    await expect(page.getByTestId('payway-modal')).toBeVisible()
    await expect(page.getByTestId('payway-no-fuel')).toBeVisible()
    // Continue button should be disabled
    await expect(page.getByTestId('payway-continue-btn')).toBeDisabled()
  })

})
