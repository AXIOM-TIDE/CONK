import { test, expect } from '@playwright/test'
import { enterVessel } from './helpers'

test.describe('Protocol Panel', () => {
  test('Protocol tab visible', async ({ page }) => {
    await enterVessel(page)
    await expect(page.getByTestId('tab-protocol')).toBeVisible()
  })

  test('Protocol panel opens showing Tide Index by default', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-protocol').click()
    await page.waitForTimeout(800)
    const body = await page.textContent('body')
    expect(body).toContain('Tide Index')
  })

  test('Protocol panel shows all sub-tab labels', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-protocol').click()
    await page.waitForTimeout(800)
    const body = await page.textContent('body')
    expect(body).toContain('Futures')
    expect(body).toContain('Switch')
    expect(body).toContain('Inherit')
    expect(body).toContain('Receipts')
  })

  test('Signal Futures sub-tab button exists', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-protocol').click()
    await page.waitForTimeout(800)
    await expect(page.getByTestId('subtab-futures')).toBeVisible()
  })

  test('Harbor Inheritance sub-tab button exists', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-protocol').click()
    await page.waitForTimeout(800)
    await expect(page.getByTestId('subtab-inheritance')).toBeVisible()
  })

  test('Dead Mans Switch sub-tab button exists', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-protocol').click()
    await page.waitForTimeout(800)
    await expect(page.getByTestId('subtab-deadmans')).toBeVisible()
  })

  test('Tide sub-tab button exists', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-protocol').click()
    await page.waitForTimeout(800)
    await expect(page.getByTestId('subtab-tide')).toBeVisible()
  })

  test('Void receipts sub-tab button exists', async ({ page }) => {
    await enterVessel(page)
    await page.getByTestId('tab-protocol').click()
    await page.waitForTimeout(800)
    await expect(page.getByTestId('subtab-void')).toBeVisible()
  })
})
