const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  description: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'closed', 'auto-closed'],
    default: 'open'
  },
  openedAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  autoCloseAt: { type: Date, required: true },

  chat: [{
    id: String,
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fromName: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    type: { type: String, default: 'text' }
  }],

  evidence: [{
    id: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploaderName: String,
    filename: String,
    filepath: String,
    fileUrl: String,
    timestamp: { type: Date, default: Date.now },
    description: String
  }],

  resolution: {
    type: {
      type: String,
      enum: ['refund', 'closed_by_buyer', 'auto-closed']
    },
    amount: Number,
    processedAt: Date,
    processedBy: String, // 'seller' or 'buyer' or 'admin'
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // user ID
    loser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }   // user ID
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Dispute', disputeSchema);
