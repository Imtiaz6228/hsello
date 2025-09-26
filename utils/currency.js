// Currency conversion utilities for RUB-based system
// All internal calculations use RUB as base currency

const CURRENCY_CONFIG = {
  // Base exchange rates (RUB to other currencies)
  // These can be updated dynamically from external APIs
  USD_TO_RUB: 81, // 1 USD = 81 RUB
  EUR_TO_RUB: 87, // 1 EUR = 87 RUB
  BTC_TO_RUB: 4500000, // 1 BTC = 4,500,000 RUB (approximate)
  ETH_TO_RUB: 250000, // 1 ETH = 250,000 RUB (approximate)

  // Crypto withdrawal fees (in percentage)
  WITHDRAWAL_FEES: {
    BTC: 0.001, // 0.1% fee
    ETH: 0.005, // 0.5% fee
    USDT_TRC20: 0.002, // 0.2% fee
    USDT_ERC20: 0.003, // 0.3% fee
    USDT_BEP20: 0.002, // 0.2% fee
    BNB: 0.004, // 0.4% fee
    default: 0.005 // 0.5% default fee
  }
};

// Convert USD to RUB
function usdToRub(usdAmount) {
  return Math.round(usdAmount * CURRENCY_CONFIG.USD_TO_RUB * 100) / 100;
}

// Convert RUB to USD
function rubToUsd(rubAmount) {
  return Math.round((rubAmount / CURRENCY_CONFIG.USD_TO_RUB) * 100) / 100;
}

// Convert crypto amount to RUB (for deposits)
function cryptoToRub(cryptoAmount, cryptoCurrency) {
  // This would typically fetch real-time rates from an API
  // For now, using approximate rates
  const rates = {
    'BTC': CURRENCY_CONFIG.BTC_TO_RUB,
    'ETH': CURRENCY_CONFIG.ETH_TO_RUB,
    'USDT': CURRENCY_CONFIG.USD_TO_RUB,
    'USDC': CURRENCY_CONFIG.USD_TO_RUB,
    'BUSD': CURRENCY_CONFIG.USD_TO_RUB,
    'BNB': 15000, // Approximate
    'ADA': 15, // Approximate
    'SOL': 800, // Approximate
    'DOGE': 4, // Approximate
    'XRP': 20, // Approximate
    'LTC': 3000, // Approximate
    'DOT': 250, // Approximate
    'AVAX': 1200, // Approximate
    'SAND': 25, // Approximate
    'MANA': 20 // Approximate
  };

  const rate = rates[cryptoCurrency.toUpperCase()] || CURRENCY_CONFIG.USD_TO_RUB;
  return Math.round(cryptoAmount * rate * 100) / 100;
}

// Convert RUB to crypto (for withdrawals)
function rubToCrypto(rubAmount, cryptoCurrency) {
  // This would typically fetch real-time rates from an API
  const rates = {
    'BTC': CURRENCY_CONFIG.BTC_TO_RUB,
    'ETH': CURRENCY_CONFIG.ETH_TO_RUB,
    'USDT': CURRENCY_CONFIG.USD_TO_RUB,
    'USDC': CURRENCY_CONFIG.USD_TO_RUB,
    'BUSD': CURRENCY_CONFIG.USD_TO_RUB,
    'BNB': 15000,
    'ADA': 15,
    'SOL': 800,
    'DOGE': 4,
    'XRP': 20,
    'LTC': 3000,
    'DOT': 250,
    'AVAX': 1200,
    'SAND': 25,
    'MANA': 20
  };

  const rate = rates[cryptoCurrency.toUpperCase()] || CURRENCY_CONFIG.USD_TO_RUB;
  return Math.round((rubAmount / rate) * 100000000) / 100000000; // 8 decimal places for crypto
}

// Calculate withdrawal fee
function calculateWithdrawalFee(rubAmount, blockchain) {
  const feeRate = CURRENCY_CONFIG.WITHDRAWAL_FEES[blockchain] || CURRENCY_CONFIG.WITHDRAWAL_FEES.default;
  return Math.round(rubAmount * feeRate * 100) / 100;
}

// Get net withdrawal amount after fees
function getNetWithdrawalAmount(rubAmount, blockchain) {
  const fee = calculateWithdrawalFee(rubAmount, blockchain);
  return Math.round((rubAmount - fee) * 100) / 100;
}

// Format currency display
function formatRub(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatCrypto(amount, currency) {
  return `${amount.toFixed(8)} ${currency.toUpperCase()}`;
}

// Update exchange rates (would be called periodically)
async function updateExchangeRates() {
  try {
    // This would fetch real-time rates from external APIs
    // For now, keeping static rates
    console.log('Exchange rates updated (static rates in use)');
  } catch (error) {
    console.error('Failed to update exchange rates:', error);
  }
}

module.exports = {
  CURRENCY_CONFIG,
  usdToRub,
  rubToUsd,
  cryptoToRub,
  rubToCrypto,
  calculateWithdrawalFee,
  getNetWithdrawalAmount,
  formatRub,
  formatUsd,
  formatCrypto,
  updateExchangeRates
};
