// WDK Storage Service - Uses Electron's safeStorage for secure seed phrase storage

import { safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const ENCRYPTED_SEED_PATH = 'wdk-seed.enc';

function getSeedPath(): string {
  return path.join(app.getPath('userData'), ENCRYPTED_SEED_PATH);
}

/**
 * Check if safeStorage encryption is available on this system
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

/**
 * Check if a seed phrase is already stored
 */
export function isSeedStored(): boolean {
  const seedPath = getSeedPath();
  return fs.existsSync(seedPath);
}

/**
 * Encrypt and store a seed phrase using OS-level encryption (Keychain on macOS, DPAPI on Windows, etc.)
 */
export function encryptAndStoreSeed(seedPhrase: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  const encryptedBuffer = safeStorage.encryptString(seedPhrase);
  const seedPath = getSeedPath();
  
  fs.writeFileSync(seedPath, encryptedBuffer);
}

/**
 * Retrieve and decrypt the stored seed phrase
 */
export function decryptStoredSeed(): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system');
  }

  const seedPath = getSeedPath();
  
  if (!fs.existsSync(seedPath)) {
    throw new Error('No seed phrase found. Please create or restore a wallet first.');
  }

  const encryptedBuffer = fs.readFileSync(seedPath);
  return safeStorage.decryptString(encryptedBuffer);
}

/**
 * Delete the stored seed phrase (for wallet reset)
 */
export function deleteStoredSeed(): void {
  const seedPath = getSeedPath();
  
  if (fs.existsSync(seedPath)) {
    fs.unlinkSync(seedPath);
  }
}

/**
 * Get the storage backend name (for debugging/display purposes)
 * Returns: 'gnome_libsecret', 'kwallet5', 'basic_text', etc.
 */
export function getStorageBackend(): string {
  return safeStorage.getSelectedStorageBackend();
}