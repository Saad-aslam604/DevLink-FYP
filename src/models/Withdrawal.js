const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema(
  {
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true }, // in cents (USD)
    currency: { type: String, default: 'usd' },
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed', 'rejected'], 
      default: 'pending' 
    },
    bankDetails: {
      accountHolderName: { type: String, required: true },
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true }, // Encrypted in production
      routingNumber: { type: String, default: '' }, // For US accounts
      iban: { type: String, default: '' }, // For international accounts
      swiftCode: { type: String, default: '' }, // For international transfers
    },
    stripeConnectId: { type: String, default: '' }, // Stripe Connect payout ID
    transactionId: { type: String, default: '' },
    failureReason: { type: String, default: '' },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Index for finding withdrawals for a specific mentor
WithdrawalSchema.index({ mentor: 1, createdAt: -1 });
WithdrawalSchema.index({ status: 1 });

module.exports = mongoose.model('Withdrawal', WithdrawalSchema);
