const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true }, // Amount in RUB
  netAmount: { type: Number, required: true }, // Amount after fee in RUB
  cryptoAmount: { type: Number, required: true }, // Amount to send in crypto
  fee: { type: Number, required: true }, // Fee in RUB
  cryptoWalletAddress: { type: String, required: true },
  blockchain: {
    type: String,
    enum: ['BTC', 'ETH', 'USDT_TR20', 'USDT_ERC20', 'USDT_TRC20', 'BNB', 'ADA', 'SOL', 'DOGE', 'USDT_BEP20'],
    default: 'USDT_TRC20'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: { type: Date, default: Date.now },
  processedAt: Date,
  transactionId: String
}, {
  timestamps: true
});

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
