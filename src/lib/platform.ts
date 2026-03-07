import type { CryptoType, SiteConfig } from '@/types';

export const DEMO_MODE_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

export const DEFAULT_PLATFORM_CONFIG = {
  usdToRubRate: 92,
  globalCommissionPercent: 10,
  minWithdrawalRub: 500,
} as const;

export const CRYPTO_USD_RATES: Record<CryptoType, number> = {
  BTC: 65000,
  ETH: 3500,
  USDT: 1,
  TRX: 0.11,
};

export function getUsdToRubRate(siteConfig?: SiteConfig | null): number {
  const rate = siteConfig?.usdToRubRate;
  if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
    return rate;
  }
  return DEFAULT_PLATFORM_CONFIG.usdToRubRate;
}

export function getCommissionPercent(siteConfig?: SiteConfig | null): number {
  const commission = siteConfig?.globalCommission;
  if (typeof commission === 'number' && Number.isFinite(commission) && commission >= 0) {
    return commission;
  }
  return DEFAULT_PLATFORM_CONFIG.globalCommissionPercent;
}

export function getCommissionRate(siteConfig?: SiteConfig | null): number {
  return getCommissionPercent(siteConfig) / 100;
}

export function getMinWithdrawalRub(siteConfig?: SiteConfig | null): number {
  const min = siteConfig?.minWithdrawalRub;
  if (typeof min === 'number' && Number.isFinite(min) && min > 0) {
    return min;
  }
  return DEFAULT_PLATFORM_CONFIG.minWithdrawalRub;
}

export function convertUsdToRub(usd: number, siteConfig?: SiteConfig | null): number {
  return Math.round(usd * getUsdToRubRate(siteConfig));
}

export function convertRubToUsd(rub: number, siteConfig?: SiteConfig | null): number {
  return rub / getUsdToRubRate(siteConfig);
}

export function getCryptoUsdValue(cryptoType: CryptoType, amountCrypto: number): number {
  return amountCrypto * CRYPTO_USD_RATES[cryptoType];
}

export function calculatePlatformFee(subtotalRub: number, subtotalUsd: number, siteConfig?: SiteConfig | null) {
  const commissionRate = getCommissionRate(siteConfig);
  return {
    commissionRate,
    commissionPercent: getCommissionPercent(siteConfig),
    feeRub: Math.round(subtotalRub * commissionRate),
    feeUsd: subtotalUsd * commissionRate,
  };
}
