const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  page: { type: String, required: true },
  ip: { type: String, required: true },
  userAgent: { type: String },
  sessionId: { type: String },
  method: { type: String, default: 'GET' },
  statusCode: { type: Number, default: 200 },
  responseTime: { type: Number }, // in milliseconds
  referrer: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
  date: { type: String, index: true }, // YYYY-MM-DD format for daily aggregation
  hour: { type: Number, index: true }, // hour of day for hourly stats
  isBot: { type: Boolean, default: false },
  country: { type: String },
  city: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // if logged in
  isLoggedIn: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Index for efficient queries
analyticsSchema.index({ date: 1, page: 1 });
analyticsSchema.index({ timestamp: -1 });
analyticsSchema.index({ ip: 1, date: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);