// Generic Solana transaction execution service
// Can be used by any protocol (Sanctum, Solayer, Lulo, etc.)

import { 
  VersionedTransaction, 
  TransactionInstruction, 
  TransactionMessage, 
  Connection
} from '@solana/web3.js';
import { deriveSolanaKeypair } from './keypair';
import * as storage from '../wdk/storage';

// Execute any base64 encoded Solana transaction
export async function executeTransaction(
  transactionBase64: string
): Promise<{ signature: string }> {
  // Get seed from storage and derive keypair
  const seed = storage.decryptStoredSeed();
  const keypair = deriveSolanaKeypair(seed);
  
  // Get RPC connection
  const connection = new Connection(
    'https://solana-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
    { commitment: 'confirmed' }
  );
  
  // Deserialize the transaction
  const txBuffer = Buffer.from(transactionBase64, 'base64');
  const tx = VersionedTransaction.deserialize(txBuffer);
  
  // Get recent blockhash and recompile
  const { blockhash } = await connection.getLatestBlockhash();
  
  const messages = tx.message;
  
  // Convert compiled instructions back to TransactionInstructions
  const instructions = messages.compiledInstructions.map((ix) => {
    return new TransactionInstruction({
      programId: messages.staticAccountKeys[ix.programIdIndex],
      keys: ix.accountKeyIndexes.map((i) => ({
        pubkey: messages.staticAccountKeys[i],
        isSigner: messages.isAccountSigner(i),
        isWritable: messages.isAccountWritable(i),
      })),
      data: Buffer.from(ix.data as any, 'base64'),
    });
  });
  
  // Recompile with new blockhash
  const newMessage = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  
  // Create new transaction and sign
  const newTx = new VersionedTransaction(newMessage);
  newTx.sign([keypair]);
  
  // Send transaction
  const signature = await connection.sendRawTransaction(newTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  
  // Wait for confirmation
  const blockhashResult = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    blockhash: blockhashResult.blockhash,
    lastValidBlockHeight: blockhashResult.lastValidBlockHeight,
  }, 'confirmed');
  
  return { signature };
}