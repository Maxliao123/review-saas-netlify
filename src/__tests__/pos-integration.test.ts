import { describe, it, expect } from 'vitest';
import {
  POS_PROVIDERS,
  shouldTriggerInvite,
  normalizeTransaction,
  type PosTransaction,
  type PosIntegrationConfig,
  type PosProvider,
} from '../lib/pos-integration';

// --------------- POS_PROVIDERS ---------------

describe('POS_PROVIDERS', () => {
  it('should have 6 providers', () => {
    expect(Object.keys(POS_PROVIDERS)).toHaveLength(6);
  });

  it('should include all expected providers', () => {
    const providers: PosProvider[] = ['toast', 'clover', 'square', 'lightspeed', 'shopify', 'custom'];
    for (const p of providers) {
      expect(POS_PROVIDERS[p]).toBeDefined();
      expect(POS_PROVIDERS[p].label).toBeTruthy();
      expect(POS_PROVIDERS[p].icon).toBeTruthy();
      expect(POS_PROVIDERS[p].webhookPath).toMatch(/^\/api\/pos\//);
    }
  });
});

// --------------- shouldTriggerInvite ---------------

describe('shouldTriggerInvite', () => {
  const baseTx: PosTransaction = {
    transactionId: 'tx_001',
    provider: 'toast',
    amount: 50,
    currency: 'USD',
    customerEmail: 'john@example.com',
    customerPhone: '+15551234567',
    completedAt: new Date().toISOString(),
  };

  const baseConfig: PosIntegrationConfig = {
    provider: 'toast',
    autoInviteEnabled: true,
    autoInviteDelayMinutes: 60,
    autoInviteChannel: 'sms',
    minTransactionAmount: 10,
  };

  it('should not invite when auto-invite is disabled', () => {
    const result = shouldTriggerInvite(baseTx, { ...baseConfig, autoInviteEnabled: false });
    expect(result.shouldInvite).toBe(false);
    expect(result.reason).toContain('disabled');
  });

  it('should not invite when amount is below minimum', () => {
    const result = shouldTriggerInvite({ ...baseTx, amount: 5 }, { ...baseConfig, minTransactionAmount: 10 });
    expect(result.shouldInvite).toBe(false);
    expect(result.reason).toContain('below minimum');
  });

  it('should not invite via SMS when no phone is available', () => {
    const result = shouldTriggerInvite(
      { ...baseTx, customerPhone: undefined },
      { ...baseConfig, autoInviteChannel: 'sms' }
    );
    expect(result.shouldInvite).toBe(false);
    expect(result.reason).toContain('phone');
  });

  it('should not invite via email when no email is available', () => {
    const result = shouldTriggerInvite(
      { ...baseTx, customerEmail: undefined },
      { ...baseConfig, autoInviteChannel: 'email' }
    );
    expect(result.shouldInvite).toBe(false);
    expect(result.reason).toContain('email');
  });

  it('should not invite via both when no contact info at all', () => {
    const result = shouldTriggerInvite(
      { ...baseTx, customerEmail: undefined, customerPhone: undefined },
      { ...baseConfig, autoInviteChannel: 'both' }
    );
    expect(result.shouldInvite).toBe(false);
    expect(result.reason).toContain('contact info');
  });

  it('should invite via SMS when conditions are met', () => {
    const result = shouldTriggerInvite(baseTx, baseConfig);
    expect(result.shouldInvite).toBe(true);
    expect(result.channel).toBe('sms');
    expect(result.delayMinutes).toBe(60);
  });

  it('should invite via email when configured', () => {
    const result = shouldTriggerInvite(baseTx, { ...baseConfig, autoInviteChannel: 'email' });
    expect(result.shouldInvite).toBe(true);
    expect(result.channel).toBe('email');
  });

  it('should invite via both when both contacts available', () => {
    const result = shouldTriggerInvite(baseTx, { ...baseConfig, autoInviteChannel: 'both' });
    expect(result.shouldInvite).toBe(true);
    expect(result.channel).toBe('both');
  });

  it('should fallback to SMS if channel is both but no email', () => {
    const result = shouldTriggerInvite(
      { ...baseTx, customerEmail: undefined },
      { ...baseConfig, autoInviteChannel: 'both' }
    );
    expect(result.shouldInvite).toBe(true);
    expect(result.channel).toBe('sms');
  });

  it('should fallback to email if channel is both but no phone', () => {
    const result = shouldTriggerInvite(
      { ...baseTx, customerPhone: undefined },
      { ...baseConfig, autoInviteChannel: 'both' }
    );
    expect(result.shouldInvite).toBe(true);
    expect(result.channel).toBe('email');
  });

  it('should invite when amount equals minimum exactly', () => {
    const result = shouldTriggerInvite(
      { ...baseTx, amount: 10 },
      { ...baseConfig, minTransactionAmount: 10 }
    );
    expect(result.shouldInvite).toBe(true);
  });

  it('should use configured delay', () => {
    const result = shouldTriggerInvite(baseTx, { ...baseConfig, autoInviteDelayMinutes: 120 });
    expect(result.delayMinutes).toBe(120);
  });
});

// --------------- normalizeTransaction ---------------

describe('normalizeTransaction', () => {
  it('should normalize Toast transaction', () => {
    const raw = {
      guid: 'toast-123',
      totalAmount: 45.50,
      customer: { firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '+1555' },
      closedDate: '2026-01-15T12:00:00Z',
    };
    const result = normalizeTransaction('toast', raw);
    expect(result).not.toBeNull();
    expect(result!.transactionId).toBe('toast-123');
    expect(result!.provider).toBe('toast');
    expect(result!.amount).toBe(45.50);
    expect(result!.customerName).toBe('John Doe');
    expect(result!.customerEmail).toBe('john@test.com');
    expect(result!.customerPhone).toBe('+1555');
  });

  it('should normalize Square transaction (amount in cents)', () => {
    const raw = {
      payment: {
        id: 'sq-456',
        amount_money: { amount: 3000, currency: 'USD' },
        buyer_email_address: 'jane@test.com',
        buyer_phone_number: '+1999',
        created_at: '2026-01-15T14:00:00Z',
      },
    };
    const result = normalizeTransaction('square', raw);
    expect(result).not.toBeNull();
    expect(result!.transactionId).toBe('sq-456');
    expect(result!.provider).toBe('square');
    expect(result!.amount).toBe(30); // 3000 / 100
    expect(result!.customerEmail).toBe('jane@test.com');
  });

  it('should normalize Clover transaction (amount in cents)', () => {
    const raw = {
      id: 'clover-789',
      total: 2500,
      customers: [{
        firstName: 'Bob',
        emailAddresses: [{ emailAddress: 'bob@test.com' }],
        phoneNumbers: [{ phoneNumber: '+1888' }],
      }],
      createdTime: 1705312800000,
    };
    const result = normalizeTransaction('clover', raw);
    expect(result).not.toBeNull();
    expect(result!.transactionId).toBe('clover-789');
    expect(result!.provider).toBe('clover');
    expect(result!.amount).toBe(25); // 2500 / 100
    expect(result!.customerName).toBe('Bob');
    expect(result!.customerEmail).toBe('bob@test.com');
  });

  it('should normalize custom/generic transaction', () => {
    const raw = {
      transaction_id: 'custom-001',
      amount: 99.99,
      currency: 'EUR',
      customer_name: 'Alice',
      customer_email: 'alice@test.com',
      completed_at: '2026-02-01T10:00:00Z',
    };
    const result = normalizeTransaction('custom', raw);
    expect(result).not.toBeNull();
    expect(result!.transactionId).toBe('custom-001');
    expect(result!.amount).toBe(99.99);
    expect(result!.currency).toBe('EUR');
    expect(result!.customerName).toBe('Alice');
  });

  it('should handle missing Toast customer data gracefully', () => {
    const raw = { id: 'toast-no-customer', amount: 20 };
    const result = normalizeTransaction('toast', raw);
    expect(result).not.toBeNull();
    expect(result!.transactionId).toBe('toast-no-customer');
    expect(result!.customerName).toBeUndefined();
    expect(result!.customerEmail).toBeUndefined();
  });

  it('should handle unknown provider as custom', () => {
    const raw = { id: 'any-123', amount: 15 };
    const result = normalizeTransaction('lightspeed' as PosProvider, raw);
    // lightspeed falls through to custom/default
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('lightspeed');
  });

  it('should default currency to USD for Toast', () => {
    const raw = { guid: 'toast-usd', totalAmount: 10 };
    const result = normalizeTransaction('toast', raw);
    expect(result!.currency).toBe('USD');
  });
});
