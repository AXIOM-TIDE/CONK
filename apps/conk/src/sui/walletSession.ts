/**
 * CONK Wallet Session Adapter
 * Uses @mysten/wallet-standard for proper wallet detection.
 * Slush, Sui Wallet, and any compliant wallet detected automatically.
 * 
 * The wallet is a funding pipe only.
 * It never sees casts, vessels, or what was paid for.
 * Three Laws hold regardless of auth method.
 */

import { getWallets } from '@mysten/wallet-standard'

export function getAvailableWallets(): { name: string; wallet: any }[] {
  try {
    const api     = getWallets()
    const all     = api.get()
    const suiOnly = all.filter(w =>
      w.chains?.some((c: string) => c.startsWith('sui:'))
    )
    if (suiOnly.length > 0) {
      return suiOnly.map(w => ({ name: w.name, wallet: w }))
    }
  } catch (e) {
    console.warn('wallet-standard detection failed:', e)
  }

  // Legacy fallbacks
  const win = window as any
  const wallets: { name: string; wallet: any }[] = []
  if (win.slush)     wallets.push({ name: 'Slush',      wallet: win.slush })
  if (win.suiWallet) wallets.push({ name: 'Sui Wallet', wallet: win.suiWallet })
  if (win.martian)   wallets.push({ name: 'Martian',    wallet: win.martian })
  if (win.suiet)     wallets.push({ name: 'Suiet',      wallet: win.suiet })
  return wallets
}

export async function connectWallet(walletObj: any, walletName: string): Promise<string> {
  let address: string | null = null

  try {
    // Wallet Standard API
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

  try {
    const api       = getWallets()
    const walletObj = api.get().find(w => w.name === walletName)

    if (!walletObj) throw new Error('Wallet not found — please reconnect')

    // Pass bytes directly to wallet
    const { fromB64 } = await import('@mysten/sui/utils')
    const txBytesUint8 = fromB64(txBytes)

    if (walletObj?.features?.['sui:signTransaction']) {
      const result = await (walletObj.features['sui:signTransaction'] as any).signTransaction({
        transaction: { kind: 'bytes', bytes: txBytesUint8 },
        chain: 'sui:mainnet',
      })
      return { bytes: result.bytes ?? txBytes, signature: result.signature }
    }

    if (walletObj?.features?.['sui:signTransactionBlock']) {
      const result = await (walletObj.features['sui:signTransactionBlock'] as any).signTransactionBlock({
        transactionBlock: txBytesUint8,
        chain: 'sui:mainnet',
      })
      return { bytes: result.transactionBlockBytes ?? txBytes, signature: result.signature }
    }
  } catch (e: any) {
    throw new Error('Wallet signing failed: ' + e.message)
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
