const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  password: { type: String, required: true, minlength: 6 },
  isSeller: { type: Boolean, default: false },
  balance: { type: Number, default: 0, min: 0 }, // Balance in RUB (Russian Rubles)

  // Email confirmation fields
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpires: { type: Date },

  // Login tracking
  lastLoginAt: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  // Seller application status
  sellerApplication: {
    pending: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerApplication' }
  },

  // Store data (for approved sellers)
  store: {
    name: String,
    category: String,
    banner: String,
    logo: String,
    description: String,
    seoDescription: String,
    rules: String,
    contactEmail: String,
    contactPhone: String,
    items: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      seoTitle: String,
      metaDescription: String,

      // Product categorization
      directionCategory: String,
      itemCategory: String,
      subcategory: String,

      // Product specifications
      registrationMethod: String,
      profileFullness: String,
      yearOfRegistration: Number,
      countryOfRegistration: String,
      loginMethod: String,
      numberOfSubscribers: Number,

      // Pricing & Delivery
      price: { type: Number, required: true },
      itemType: String,
      completionTime: Number,

      // Descriptions
      shortDescription: String,
      fullDescription: String,

      // System fields
      isDigital: { type: Boolean, default: true },
      stockQuantity: { type: Number, default: 999999 },
      availableQuantity: { type: Number, default: 999999 },
      soldCount: { type: Number, default: 0 },
      status: { type: String, default: 'active' },
      moderationStatus: { type: String, default: 'pending' },

      // Meta data
      tags: [String],
      seoKeywords: [String],
      images: [String],
      files: [{
        filename: String,
        filepath: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      reviews: [{
        id: String,
        userId: Number,
        userName: String,
        rating: Number,
        comment: String,
        date: Date
      }],
      createdAt: { type: Date, default: Date.now }
    }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
