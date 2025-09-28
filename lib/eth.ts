const HEX_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_REGEX = /^0x[a-fA-F0-9]{64}$/;

export function isValidAddress(address: string) {
  return HEX_REGEX.test(address);
}

export function isValidTxHash(txHash: string) {
  return TX_REGEX.test(txHash);
}

export interface PaymentSubmission {
  chainId: number;
  txHash: string;
  tokenAddress?: string | null;
  payerAddress: string;
  amountWei: string;
}

export function validatePaymentSubmission(payload: Partial<PaymentSubmission>) {
  if (typeof payload.chainId !== "number" || payload.chainId <= 0) {
    throw new Error("Invalid chainId provided");
  }

  if (typeof payload.txHash !== "string" || !isValidTxHash(payload.txHash)) {
    throw new Error("Invalid transaction hash");
  }

  if (typeof payload.payerAddress !== "string" || !isValidAddress(payload.payerAddress)) {
    throw new Error("Invalid payer address");
  }

  if (payload.tokenAddress) {
    if (typeof payload.tokenAddress !== "string" || !isValidAddress(payload.tokenAddress)) {
      throw new Error("Invalid token address");
    }
  }

  if (typeof payload.amountWei !== "string" || !/^\d+$/.test(payload.amountWei)) {
    throw new Error("Invalid payment amount");
  }

  return payload as PaymentSubmission;
}
