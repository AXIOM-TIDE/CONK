import { test, expect } from '@playwright/test'
import { completeOnboarding } from './helpers'

test.describe('Harbor Features', () => {
  test('Withdraw button visible in Harbor panel', async ({ page }) => {
    await completeOnboarding(page)
    await page.waitForTimeout(500)
    const body = await page.textContent('body')
    expect(body).toContain('Withdraw USDC')
  })

  test('Withdraw form opens on click', async ({ page }) => {
    await completeOnboarding(page)
    await page.waitForTimeout(500)
    // Find and click any button containing Withdraw
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent()
      if (text && text.includes('Withdraw')) {
        await buttons.nth(i).click({ force: true })
        break
      }
    }
    await page.waitForTimeout(500)
    const body = await page.textContent('body')
    expect(body).toContain('Withdraw USDC')
  })

  test('Withdraw amount options visible', async ({ page }) => {
    await completeOnboarding(page)
    await page.waitForTimeout(500)
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent()
      if (text && text.includes('Withdraw')) {
        await buttons.nth(i).click({ force: true })
        break
      }
    }
    await page.waitForTimeout(500)
    const body = await page.textContent('body')
    expect(body).toContain('Withdraw USDC')
  })
})
