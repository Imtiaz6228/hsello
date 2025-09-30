// SEO Utility Functions for Hsello
const mongoose = require('mongoose');

/**
 * Generate SEO-friendly slug from text
 * @param {string} text - Text to convert to slug
 * @returns {string} SEO-friendly slug
 */
function generateSlug(text) {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[\s\W-]+/g, '-')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate unique slug by checking database
 * @param {string} baseSlug - Base slug to make unique
 * @param {string} collection - MongoDB collection name
 * @param {string} field - Field name to check for uniqueness
 * @param {string} excludeId - ID to exclude from uniqueness check (for updates)
 * @returns {Promise<string>} Unique slug
 */
async function generateUniqueSlug(baseSlug, collection, field, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { [field]: slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await mongoose.connection.db.collection(collection).findOne(query);
    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Generate store slug from store name
 * @param {string} storeName - Store name
 * @param {string} excludeId - User ID to exclude (for updates)
 * @returns {Promise<string>} Unique store slug
 */
async function generateStoreSlug(storeName, excludeId = null) {
  const baseSlug = generateSlug(storeName);
  return await generateUniqueSlug(baseSlug, 'users', 'store.slug', excludeId);
}

/**
 * Generate product slug from product name
 * @param {string} productName - Product name
 * @param {string} sellerId - Seller ID
 * @param {string} excludeProductId - Product ID to exclude (for updates)
 * @returns {Promise<string>} Unique product slug
 */
async function generateProductSlug(productName, sellerId, excludeProductId = null) {
  const baseSlug = generateSlug(productName);

  // Find user and check if product slug exists within their store
  const user = await mongoose.model('User').findById(sellerId);
  if (!user || !user.store || !user.store.items) {
    return baseSlug;
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingProduct = user.store.items.find(item => {
      return item.slug === slug && (!excludeProductId || item.id !== excludeProductId);
    });

    if (!existingProduct) {
      break;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Find user by store slug
 * @param {string} slug - Store slug
 * @returns {Promise<Object|null>} User document or null
 */
async function findUserByStoreSlug(slug) {
  return await mongoose.model('User').findOne({
    'store.slug': slug,
    isSeller: true,
    'store.name': { $exists: true, $ne: null }
  });
}

/**
 * Find product by slug within a store
 * @param {string} storeSlug - Store slug
 * @param {string} productSlug - Product slug
 * @returns {Promise<Object|null>} Product object or null
 */
async function findProductBySlug(storeSlug, productSlug) {
  const user = await findUserByStoreSlug(storeSlug);
  if (!user || !user.store || !user.store.items) {
    return null;
  }

  return user.store.items.find(item => item.slug === productSlug && item.status === 'active') || null;
}

module.exports = {
  generateSlug,
  generateUniqueSlug,
  generateStoreSlug,
  generateProductSlug,
  findUserByStoreSlug,
  findProductBySlug
};