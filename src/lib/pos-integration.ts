/**
 * POS Integration Engine
 *
 * Connects with Point-of-Sale systems to auto-trigger
 * review invites after customer transactions.
 *
 * Supported providers: Toast, Clover, Square, Lightspeed, Shopify
 *
 * Flow: Customer pays → POS webhook → delay → auto-invite (SMS/email)
 */

export type PosProvider = 'toast' | 'clover' | 'square' | 'lightspeed' | 'shopify' | 'custom';

export interface PosTransaction {
  transactionId: string;
  provider: PosProvider;
  amount: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: string[];
  completedAt: string;       // ISO timestamp
}

export interface PosIntegrationConfig {
  provider: PosProvider;
  autoInviteEnabled: boolean;
  autoInviteDelayMinutes: number;
  autoInviteChannel: 'sms' | 'email' | 'both';
  minTransactionAmount: number;
}

export interface InviteTriggerResult {
  shouldInvite: boolean;
  channel: 'sms' | 'email' | 'both' | null;
  delayMinutes: number;
  reason?: string;
}

/**
 * Provider display configuration.
 */
export const POS_PROVIDERS: Record<PosProvider, {
  label: string;
  icon: string;
  description: string;
  webhookPath: string;
}> = {
  toast: {
    label: 'Toast',
    icon: '🍞',
    description: 'Restaurant POS — auto-invite diners after meals',
    webhookPath: '/api/pos/toast',
  },
  clover: {
    label: 'Clover',
    icon: '🍀',
    description: 'Multi-industry POS — retail, restaurants, services',
    webhookPath: '/api/pos/clover',
  },
  square: {
    label: 'Square',
    icon: '⬜',
    description: 'Universal POS — works with any business type',
    webhookPath: '/api/pos/square',
  },
  lightspeed: {
    label: 'Lightspeed',
    icon: '⚡',
    description: 'Hospitality & retail POS platform',
    webhookPath: '/api/pos/lightspeed',
  },
  shopify: {
    label: 'Shopify POS',
    icon: '🛍️',
    description: 'E-commerce + in-store POS',
    webhookPath: '/api/pos/shopify',
  },
  custom: {
    label: 'Custom Webhook',
    icon: '🔧',
    description: 'Any POS that supports webhooks',
    webhookPath: '/api/pos/custom',
  },
};

/**
 * Determine if a transaction should trigger a review invite.
 */
export function shouldTriggerInvite(
  transaction: PosTransaction,
  config: PosIntegrationConfig
): InviteTriggerResult {
  if (!config.autoInviteEnabled) {
    return { shouldInvite: false, channel: null, delayMinutes: 0, reason: 'Auto-invite disabled' };
  }

  // Check minimum amount
  if (transaction.amount < config.minTransactionAmount) {
    return {
      shouldInvite: false,
      channel: null,
      delayMinutes: 0,
      reason: `Transaction $${transaction.amount} below minimum $${config.minTransactionAmount}`,
    };
  }

  // Check if we have contact info
  const hasEmail = !!transaction.customerEmail;
  const hasPhone = !!transaction.customerPhone;

  if (config.autoInviteChannel === 'email' && !hasEmail) {
    return { shouldInvite: false, channel: null, delayMinutes: 0, reason: 'No customer email available' };
  }

  if (config.autoInviteChannel === 'sms' && !hasPhone) {
    return { shouldInvite: false, channel: null, delayMinutes: 0, reason: 'No customer phone available' };
  }

  if (config.autoInviteChannel === 'both' && !hasEmail && !hasPhone) {
    return { shouldInvite: false, channel: null, delayMinutes: 0, reason: 'No customer contact info available' };
  }

  // Determine actual channel based on available data
  let channel: 'sms' | 'email' | 'both' = config.autoInviteChannel;
  if (channel === 'both') {
    if (!hasEmail) channel = 'sms';
    else if (!hasPhone) channel = 'email';
  }

  return {
    shouldInvite: true,
    channel,
    delayMinutes: config.autoInviteDelayMinutes,
  };
}

/**
 * Normalize transaction data from different POS providers.
 */
export function normalizeTransaction(
  provider: PosProvider,
  rawPayload: Record<string, any>
): PosTransaction | null {
  try {
    switch (provider) {
      case 'toast':
        return {
          transactionId: rawPayload.guid || rawPayload.id,
          provider: 'toast',
          amount: rawPayload.totalAmount || rawPayload.amount || 0,
          currency: 'USD',
          customerName: rawPayload.customer?.firstName
            ? `${rawPayload.customer.firstName} ${rawPayload.customer.lastName || ''}`
            : undefined,
          customerEmail: rawPayload.customer?.email,
          customerPhone: rawPayload.customer?.phone,
          completedAt: rawPayload.closedDate || new Date().toISOString(),
        };

      case 'square':
        return {
          transactionId: rawPayload.payment?.id || rawPayload.id,
          provider: 'square',
          amount: (rawPayload.payment?.amount_money?.amount || 0) / 100,
          currency: rawPayload.payment?.amount_money?.currency || 'USD',
          customerEmail: rawPayload.payment?.buyer_email_address,
          customerPhone: rawPayload.payment?.buyer_phone_number,
          completedAt: rawPayload.payment?.created_at || new Date().toISOString(),
        };

      case 'clover':
        return {
          transactionId: rawPayload.id,
          provider: 'clover',
          amount: (rawPayload.total || 0) / 100,
          currency: 'USD',
          customerName: rawPayload.customers?.[0]?.firstName,
          customerEmail: rawPayload.customers?.[0]?.emailAddresses?.[0]?.emailAddress,
          customerPhone: rawPayload.customers?.[0]?.phoneNumbers?.[0]?.phoneNumber,
          completedAt: rawPayload.createdTime
            ? new Date(rawPayload.createdTime).toISOString()
            : new Date().toISOString(),
        };

      case 'custom':
      default:
        return {
          transactionId: rawPayload.transaction_id || rawPayload.id || `custom_${Date.now()}`,
          provider,
          amount: rawPayload.amount || rawPayload.total || 0,
          currency: rawPayload.currency || 'USD',
          customerName: rawPayload.customer_name || rawPayload.name,
          customerEmail: rawPayload.customer_email || rawPayload.email,
          customerPhone: rawPayload.customer_phone || rawPayload.phone,
          completedAt: rawPayload.completed_at || rawPayload.timestamp || new Date().toISOString(),
        };
    }
  } catch {
    return null;
  }
}
