const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema({
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Affiliate',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [10, 'Minimum withdrawal amount is $10'] // 🛡️ Updated validation threshold down to 10
  },
  method: {
    type: String,
    enum: ['bKash', 'Nagad', 'Rocket', 'Upay'],
    required: true
  },
  accountType: {
    type: String,
    enum: ['Personal', 'Agent'],
    required: true
  },
  accountNumber: {
    type: String,
    required: true,
    match: [/^01[3-9]\d{8}$/, 'Please provide a valid Bangladeshi mobile number']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Withdrawal', WithdrawalSchema);