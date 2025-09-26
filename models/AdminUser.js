const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, default: 'admin' },
  balance: { type: Number, default: 0 } // Balance for commission earnings
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminUser', adminUserSchema);
