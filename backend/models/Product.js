import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    commissionRate: {
      type: Number,
      required: [true, 'Commission rate percentage is required'],
      min: [0, 'Commission cannot be negative'],
      max: [100, 'Commission cannot exceed 100%'],
      default: 10,
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    productUrl: {
      type: String,
      required: [true, 'Target storefront destination URL is required'],
      trim: true,
    },
    // ✨ NEW DATA FIELDS FOR HIGH-CONVERSION LANDING PAGES
    description: {
      type: String,
      required: [true, 'Product description is required for the landing page'],
      trim: true,
    },
    category: {
      type: String,
      default: 'Skincare',
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, 'Stock count is required'],
      min: [0, 'Stock cannot be negative'],
      default: 50,
    },
    highlights: {
      type: [String], // Array of short benefit tags (e.g., ["Cruelty-Free", "Vegan", "10% Vit C"])
      default: [],
    },
    image: {
      type: String,
      default: '', // Main display image URL
    }
  },
  {
    timestamps: true,
    collection: 'products'
  }
);

const Product = mongoose.model('Product', productSchema);

export default Product;