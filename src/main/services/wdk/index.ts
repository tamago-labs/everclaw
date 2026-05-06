// WDK Service exports
export { wdkService, WDKService } from './WDKService';
export type { AccountInfo, WalletStatus, ChainFamily } from './types';
export { 
  isEncryptionAvailable, 
  isSeedStored, 
  encryptAndStoreSeed, 
  decryptStoredSeed, 
  deleteStoredSeed,
  getStorageBackend 
} from './storage';
