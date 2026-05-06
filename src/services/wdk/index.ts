// WDK Service - Exports
export { WDKService, wdkService } from './WDKService';
export { 
  isEncryptionAvailable, 
  isSeedStored, 
  encryptAndStoreSeed, 
  decryptStoredSeed, 
  deleteStoredSeed,
  getStorageBackend 
} from './storage';
export * from './types';