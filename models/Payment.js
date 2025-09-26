const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amountUSD: {
    type: Number,
    required: true,
    min: 3,
    max: 20000
  },
  amountRUB: {
    type: Number,
    required: true
  },
  amountCrypto: {
    type: Number,
    required: true
  },
  cryptoCurrency: {
    type: String,
    required: true
  },
  blockchain: {
    type: String,
    required: true
  },

  // NOWPayments API data
  paymentId: {
    type: String,
    required: true // NOWPayments payment ID
  },
  paymentAddress: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    required: true
  },

  // Payment status
  status: {
    type: String,
    enum: ['waiting_for_payment', 'partially_paid', 'paid', 'expired', 'failed'],
    default: 'waiting_for_payment'
  },

  // Payment tracking
  payUrl: String,
  priceAmount: Number,
  priceCurrency: String,
  payAmount: Number,
  payCurrency: String,
  actuallyPaid: Number,
  receivedAmount: Number,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: Date,
  expiredAt: Date,

  // Transaction details
  txHash: String,
  paymentRequestId: String,
  incomingTxHash: String,
  fee: Number,

  // Webhook tracking
  webhooksReceived: [{
    id: String,
    timestamp: Date,
    data: mongoose.Schema.Types.Mixed
  }],

  // User balance updated flag
  balanceUpdated: {
    type: Boolean,
    default: false
  }
});

// Indexes for better performance
paymentSchema.index({ paymentId: 1 }, { unique: true });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

// Update the updatedAt field on save
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
