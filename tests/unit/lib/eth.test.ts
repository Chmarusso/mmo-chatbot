import { describe, it, expect } from 'vitest';
import { validatePaymentSubmission } from '@/lib/eth';

describe('validatePaymentSubmission', () => {
  it('returns a normalized submission when data is valid', () => {
    const payload = validatePaymentSubmission({
      chainId: 1,
      txHash: '0x'.padEnd(66, 'a'),
      tokenAddress: '0x'.padEnd(42, 'b'),
      payerAddress: '0x'.padEnd(42, 'c'),
      amountWei: '1000000000000000000',
    });

    expect(payload).toMatchObject({
      chainId: 1,
      txHash: '0x'.padEnd(66, 'a'),
      tokenAddress: '0x'.padEnd(42, 'b'),
      payerAddress: '0x'.padEnd(42, 'c'),
      amountWei: '1000000000000000000',
    });
  });

  it('throws when chainId is invalid', () => {
    expect(() =>
      validatePaymentSubmission({
        chainId: 0,
        txHash: '0x'.padEnd(66, 'a'),
        payerAddress: '0x'.padEnd(42, 'c'),
        amountWei: '1',
      })
    ).toThrowError('Invalid chainId provided');
  });

  it('throws when tx hash is malformed', () => {
    expect(() =>
      validatePaymentSubmission({
        chainId: 1,
        txHash: '0x123',
        payerAddress: '0x'.padEnd(42, 'c'),
        amountWei: '1',
      })
    ).toThrowError('Invalid transaction hash');
  });

  it('throws when payer address is invalid', () => {
    expect(() =>
      validatePaymentSubmission({
        chainId: 1,
        txHash: '0x'.padEnd(66, 'a'),
        payerAddress: 'foo',
        amountWei: '1',
      })
    ).toThrowError('Invalid payer address');
  });
});
