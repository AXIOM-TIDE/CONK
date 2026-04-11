import { test, expect } from '@playwright/test'
import { enterVessel, fuelVessel } from './helpers'

test.describe('Cast Types', () => {
  test('Cast type selector shows Standard Subscription Time-Locked', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await page.getByTestId('tab-cast').click()
    await page.waitForTimeout(1000)
    const body = await page.textContent('body')
    expect(body).toContain('Standard')
    expect(body).toContain('Subscription')
    expect(body).toContain('Time-Locked')
  })

  test('Subscription interval options appear', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await page.getByTestId('tab-cast').click()
    await page.waitForTimeout(500)
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent()
      if (text && text.includes('Subscription')) {
        await buttons.nth(i).click({ force: true })
        break
      }
    }
    await page.waitForTimeout(500)
    const body = await page.textContent('body')
    expect(body).toContain('daily')
    expect(body).toContain('weekly')
  })

  test('Time-lock hours appear when selected', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await page.getByTestId('tab-cast').click()
    await page.waitForTimeout(500)
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent()
      if (text && text.includes('Time-Locked')) {
        await buttons.nth(i).click({ force: true })
        break
      }
    }
    await page.waitForTimeout(500)
    const body = await page.textContent('body')
    expect(body).toContain('Unlock After')
  })

  test('Price selector visible in cast panel', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await page.getByTestId('tab-cast').click()
    await page.waitForTimeout(1000)
    const body = await page.textContent('body')
    expect(body).toContain('Read Price')
    expect(body).toContain('$0.001')
  })

  test('Cast type section renders in cast panel', async ({ page }) => {
    await enterVessel(page)
    await fuelVessel(page)
    await page.getByTestId('tab-cast').click()
    await page.waitForTimeout(1000)
    const body = await page.textContent('body')
    expect(body).toContain('Cast Type')
  })
})
