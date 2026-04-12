/**
 * CONK Wallet Session Adapter
 * Connects any Sui-compatible wallet using the Sui Wallet Standard.
 * Slush, Sui Wallet, and any compliant wallet are detected automatically.
 * 
 * The wallet is a funding pipe only.
 * It never sees casts, vessels, or what was paid for.
 * Three Laws hold regardless of auth method.
 */

// Sui Wallet Standard — wallets register here
function getSuiStandardWallets(): { name: string; wallet: any }[] {
  const win = window as any
  const wallets: { name: string; wallet: any }[] = []

  // Sui Wallet Standard (Slush, Sui Wallet, and others register here)
  if (win.__suiWallets__) {
    for (const w of win.__suiWallets__) {
      wallets.push({ name: w.name, wallet: w })
    }
    return wallets
  }

  // Wallet standard event-based registration
  if (win.navigator?.wallets) {
    const registered = win.navigator.wallets.get?.() || []
    for (const w of registered) {
      if (w.chains?.some((c: string) => c.startsWith('sui:'))) {
        wallets.push({ name: w.name, wallet: w })
      }
    }
    if (wallets.length) return wallets
  }

  // Legacy fallbacks
  if (win.slush)     wallets.push({ name: 'Slush',      wallet: win.slush })
  if (win.suiWallet) wallets.push({ name: 'Sui Wallet', wallet: win.suiWallet })
  if (win.martian)   wallets.push({ name: 'Martian',    wallet: win.martian })
  if (win.suiet)     wallets.push({ name: 'Suiet',      wallet: win.suiet })

  return wallets
}

export function getAvailableWallets(): { name: string; wallet: any }[] {
  return getSuiStandardWallets()
}

export async function connectWallet(walletObj: any, walletName: string): Promise<string> {
  // Sui Wallet Standard connect
  let address: string | null = null

  try {
    // Standard API
    if (walletObj.features?.['standard:connect']) {
      const result = await walletObj.features['standard:connect'].connect()
      address = result?.accounts?.[0]?.address ?? null
    }
    // Legacy API
    else if (walletObj.connect) {
      await walletObj.connect()
      const raw = await walletObj.getAccounts?.()
      address = raw?.[0]?.address ?? raw?.[0] ?? null
    }
  } catch (e: any) {
    throw new Error('Wallet connection failed: ' + e.message)
  }

  if (!address) throw new Error('No account found in wallet')

  const session = {
    address,
    maxEpoch:    999999,
    salt:        address,
    proof:       undefined,
    addressSeed: undefined,
    authType:    'wallet',
    walletName,
  }

  sessionStorage.setItem('zklogin_session', JSON.stringify(session))
  sessionStorage.setItem('wallet_name', walletName)

  return address
}

export async function signWithWallet(txBytes: string): Promise<{ bytes: string; signature: string }> {
  const walletName = sessionStorage.getItem('wallet_name')
  const wallets    = getSuiStandardWallets()
  const walletObj  = wallets.find(w => w.name === walletName)?.wallet

  if (!walletObj) throw new Error('Wallet not found — please reconnect')

  // Sui Wallet Standard sign
  if (walletObj.features?.['sui:signTransaction']) {
    const result = await walletObj.features['sui:signTransaction'].signTransaction({
      transaction: txBytes,
      chain: 'sui:mainnet',
    })
    return {
      bytes:     result.bytes ?? txBytes,
      signature: result.signature,
    }
  }

  // Legacy sign
  if (walletObj.signTransactionBlock) {
    const result = await walletObj.signTransactionBlock({
      transactionBlock: txBytes,
      chain: 'sui:mainnet',
    })
    return {
      bytes:     result.transactionBlockBytes ?? txBytes,
      signature: result.signature,
    }
  }

  throw new Error('Wallet does not support transaction signing')
}

export function isWalletSession(): boolean {
  try {
    const raw = sessionStorage.getItem('zklogin_session')
    if (!raw) return false
    return JSON.parse(raw).authType === 'wallet'
  } catch { return false }
}

export function clearWalletSession(): void {
  sessionStorage.removeItem('zklogin_session')
  sessionStorage.removeItem('wallet_name')
}
