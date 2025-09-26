const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'cancelled'],
    default: 'completed'
  },
  orderDate: { type: Date, default: Date.now },
  isDigital: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
