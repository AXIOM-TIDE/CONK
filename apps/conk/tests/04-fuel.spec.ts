import { test, expect } from '@playwright/test'
import { enterVessel, fuelVessel, goToDrift, unlockCast } from './helpers'

test.describe('Fuel System', () => {

  test('Vessel starts with zero fuel', async ({ page }) => {
    await enterVessel(page)
    await expect(page.getByTestId('fuel-value')).toContainText('$0.00')
  })

  test('Dry vessel shows warning indicator in topbar', async ({ page }) => {
    await enterVessel(page)
    await expect(page.getByTestId('fuel-dry-label')).toBeVisible()
  })

  test('Draw Fuel modal opens from fuel module click', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('fuel-module').first().click()
    await expect(page.getByTestId('draw-fuel-modal')).toBeVisible()
  })

  test('Draw Fuel updates vessel fuel balance', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await expect(page.getByTestId('fuel-value')).toContainText('$0.25')
  })

  test('Fuel debits after successful unlock', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    const fuelBefore = await page.getByTestId('fuel-value').textContent()
    await goToDrift(page)
    await unlockCast(page)
    const fuelAfter = await page.getByTestId('fuel-value').textContent()
    expect(fuelBefore).not.toEqual(fuelAfter)
  })

  test('Dry vessel blocks cast tab with fuel gate', async ({ page }) => {
    await enterVessel(page)
    // No fuel — tap cast tab
    await page.getByTestId('tab-cast').click()
    // Should open draw fuel modal (fuel gate triggers)
    await expect(page.getByTestId('draw-fuel-modal')).toBeVisible()
  })

  test('Autofuel toggle switches label', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    const before = await page.getByTestId('autofuel-label').textContent()
    await page.getByTestId('autofuel-toggle').click()
    const after = await page.getByTestId('autofuel-label').textContent()
    expect(before).not.toEqual(after)
  })

  test('Auto-burn toggle switches label', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    const before = await page.getByTestId('autoburn-label').textContent()
    await page.getByTestId('autoburn-toggle').click()
    const after = await page.getByTestId('autoburn-label').textContent()
    expect(before).not.toEqual(after)
  })

})
