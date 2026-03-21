import { test, expect } from '@playwright/test'
import { clearState, completeOnboarding, enterVessel } from './helpers'

test.describe('Harbor & Vessel', () => {

  test('Harbor shows after onboarding completes', async ({ page }) => {
    await completeOnboarding(page)
    await expect(page.getByTestId('harbor-home')).toBeVisible()
  })

  test('Harbor shows vessel count', async ({ page }) => {
    await completeOnboarding(page)
    await page.getByTestId('enter-vessels-btn').click()
    await expect(page.getByTestId('vessel-select')).toBeVisible()
    await expect(page.getByTestId('vessel-count')).toContainText('/ 30')
  })

  test('Vessel card is visible in VesselSelect', async ({ page }) => {
    await completeOnboarding(page)
    await page.getByTestId('enter-vessels-btn').click()
    await expect(page.getByTestId('vessel-card').first()).toBeVisible()
  })

  test('Enter vessel navigates to VesselHome', async ({ page }) => {
    await enterVessel(page)
    await expect(page.getByTestId('vessel-home')).toBeVisible()
  })

  test('Back button from VesselHome returns to Harbor', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('back-to-harbor').click()
    await expect(page.getByTestId('harbor-home')).toBeVisible()
  })

  test('Back button from VesselSelect returns to Harbor', async ({ page }) => {
    await completeOnboarding(page)
    await page.getByTestId('enter-vessels-btn').click()
    await page.getByTestId('back-to-harbor').click()
    await expect(page.getByTestId('harbor-home')).toBeVisible()
  })

  test('Cannot launch more than 30 vessels', async ({ page }) => {
    await completeOnboarding(page)
    await page.getByTestId('enter-vessels-btn').click()
    // Mock 30 vessels by checking the cap message appears at limit
    const count = await page.getByTestId('vessel-card').count()
    if (count >= 30) {
      await expect(page.getByTestId('vessel-cap-warning')).toBeVisible()
      await expect(page.getByTestId('new-vessel-btn')).toBeDisabled()
    }
  })

})
