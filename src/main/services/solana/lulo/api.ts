// Lulo lending API service

import { LULO_API_URI, FLEXLEND_API_KEY } from './constants';

// Get deposit transaction from Lulo via flexlend API
export async function getLuloDepositTransaction(
  mintAddress: string,
  amount: string,
  walletAddress: string
): Promise<string> {
  const response = await fetch(
    `${LULO_API_URI}/generate/account/deposit?priorityFee=50000`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-pubkey': walletAddress,
        'x-api-key': FLEXLEND_API_KEY,
      },
      body: JSON.stringify({
        owner: walletAddress,
        mintAddress,
        depositAmount: amount,
      }),
    }
  );

  const data = await response.json();
  return data.data.transactionMeta[0].transaction;
}

// Get withdraw transaction from Lulo via dial.to API (like agent-kit)
export async function getLuloWithdrawTransaction(
  mintAddress: string,
  amount: string,
  walletAddress: string
): Promise<string> {
  const response = await fetch(
    `https://lulo.dial.to/api/actions/withdraw/${mintAddress}/${amount}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: walletAddress,
      }),
    }
  );

  const data = await response.json();
  return data.transaction;
}