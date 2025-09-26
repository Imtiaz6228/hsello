const mongoose = require('mongoose');

const sellerApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },

  // Store details
  storeName: { type: String, required: true },
  category: { type: String, required: true },
  contactEmail: String,
  contactPhone: String,
  rules: String,
  storeDescription: { type: String, required: true },
  seoDescription: String,

  // File paths
  bannerPath: String,
  logoPath: String,

  // Application status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  reviewedAt: Date,
  reviewNotes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('SellerApplication', sellerApplicationSchema);
