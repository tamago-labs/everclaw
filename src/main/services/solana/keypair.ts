// Solana keypair utilities

// @ts-ignore - HDKey is an ESM module
import HDKey from 'micro-key-producer/slip10.js'

// @ts-ignore - bip39 is an ESM module
import * as bip39 from 'bip39'

// @ts-ignore - Solana libraries
import { Keypair } from '@solana/web3.js'

/**
 * Derive a Solana keypair from a BIP-39 seed phrase
 * Uses SLIP-0010 derivation path for Solana
 * 
 * @param seedPhrase - BIP-39 mnemonic seed phrase
 * @param accountIndex - Account index (default: 0)
 * @returns Solana Keypair
 */
export function deriveSolanaKeypair(seedPhrase: string, accountIndex: number = 0): Keypair {
  // Validate the seed phrase
  if (!bip39.validateMnemonic(seedPhrase)) {
    throw new Error('Invalid seed phrase')
  }

  // Convert mnemonic to seed (512 bits)
  const seed = bip39.mnemonicToSeedSync(seedPhrase)

  // Create HDKey from seed
  const hdKey = HDKey.fromMasterSeed(seed)

  // Build the path with account index: m/44'/501'/account'/0'
  // Note: v1.0.0-beta.4+ changed to 4 levels (not 5)
  const path = `m/44'/501'/${accountIndex}'/0'`

  // Derive the private key using SLIP-0010 path for Solana
  const derivedKey = hdKey.derive(path, true)
 

  const privateKey = derivedKey.privateKey
 

  if (!privateKey || privateKey.length !== 32) {
    throw new Error('Invalid private key')
  }

  return Keypair.fromSeed(privateKey)
}

/**
 * Get the public key address from a seed phrase
 * 
 * @param seedPhrase - BIP-39 mnemonic seed phrase
 * @returns Base58 encoded public key address
 */
export function getSolanaAddressFromSeed(seedPhrase: string): string {
  const keypair = deriveSolanaKeypair(seedPhrase)
  return keypair.publicKey.toBase58()
}