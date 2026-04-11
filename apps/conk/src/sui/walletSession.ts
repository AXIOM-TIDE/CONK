/**
 * CONK Wallet Session Adapter
 * Connects any Sui-compatible wallet (Slush, Sui Wallet, etc.)
 * Writes a compatible session into zklogin_session storage.
 * The rest of the app sees no difference.
 * 
 * The wallet is a funding pipe only.
 * It never sees casts, vessels, or what was paid for.
 * Three Laws hold regardless of auth method.
 */

export function getAvailableWallets(): { name: string; wallet: any }[] {
  const win = window as any
  const wallets: { name: string; wallet: any }[] = []
  if (win.slush)      wallets.push({ name: 'Slush',      wallet: win.slush })
  if (win.suiWallet)  wallets.push({ name: 'Sui Wallet', wallet: win.suiWallet })
  if (win.martian)    wallets.push({ name: 'Martian',    wallet: win.martian })
  if (win.suiet)      wallets.push({ name: 'Suiet',      wallet: win.suiet })
  return wallets
}

export async function connectWallet(walletObj: any, walletName: string): Promise<string> {
  await walletObj.connect()

  const raw      = await walletObj.getAccounts()
  const address  = raw?.[0]?.address ?? raw?.[0]
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
  const win        = window as any

  const walletMap: Record<string, any> = {
    'Slush':      win.slush,
    'Sui Wallet': win.suiWallet,
    'Martian':    win.martian,
    'Suiet':      win.suiet,
  }

  const walletObj = walletName ? walletMap[walletName] : null
  if (!walletObj) throw new Error('Wallet not found — please reconnect')

  const result = await walletObj.signTransactionBlock({
    transactionBlock: txBytes,
    chain: 'sui:testnet',
  })

  return {
    bytes:     result.transactionBlockBytes ?? txBytes,
    signature: result.signature,
  }
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
