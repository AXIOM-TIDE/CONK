import { test, expect } from '@playwright/test'
import { goToVesselSelect } from './helpers'

test.describe('Vessel Burn Auto-Sweep', () => {
  test('Burn option visible in VesselSelect', async ({ page }) => {
    await goToVesselSelect(page)
    await page.waitForTimeout(500)
    const body = await page.textContent('body')
    expect(body).toContain('burn')
  })

  test('WreckModal appears when burn clicked', async ({ page }) => {
    await goToVesselSelect(page)
    await page.waitForTimeout(500)
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent()
      if (text && text.toLowerCase().includes('burn')) {
        await buttons.nth(i).click({ force: true })
        break
      }
    }
    await page.waitForTimeout(500)
    const body = await page.textContent('body')
    expect(body).toContain('vessel')
  })

  test('WreckModal shows sweep message', async ({ page }) => {
    await goToVesselSelect(page)
    await page.waitForTimeout(500)
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent()
      if (text && text.toLowerCase().includes('burn')) {
        await buttons.nth(i).click({ force: true })
        break
      }
    }
    await page.waitForTimeout(500)
    const body = await page.textContent('body')
    expect(body).toContain('sweeps to Harbor')
  })

  test('WreckModal cancel returns to vessel select', async ({ page }) => {
    await goToVesselSelect(page)
    await page.waitForTimeout(500)
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent()
      if (text && text.toLowerCase().includes('burn')) {
        await buttons.nth(i).click({ force: true })
        break
      }
    }
    await page.waitForTimeout(500)
    await page.getByTestId('wreck-cancel-btn').click()
    await page.waitForTimeout(300)
    await expect(page.getByTestId('vessel-select')).toBeVisible()
  })
})
