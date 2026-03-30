const fs = require('fs')
let c = fs.readFileSync('./tests/05-security.spec.ts', 'utf8')
c = c.replace(
  /    await page\.waitForTimeout\(2000\)\n    \/\/ Extra fuel for wrong answer penalty\n    await page\.getByTestId\('fuel-module'\)\.first\(\)\.click\(\)\n    await page\.waitForSelector\('\[data-testid="draw-fuel-modal"\]', \{ timeout: 5000 \}\)\n    await page\.getByTestId\('fuel-amount-25'\)\.click\(\)\n    await page\.getByTestId\('charge-vessel-btn'\)\.click\(\)\n    await page\.waitForSelector\('\[data-testid="draw-fuel-modal"\]', \{ state: 'hidden' \}\)\n\n    await openGatedCast/g,
  '    await openGatedCast'
)
fs.writeFileSync('./tests/05-security.spec.ts', c)
console.log('Done:', c.includes('Extra fuel') ? 'STILL HAS IT' : 'REMOVED')
