const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: false },
    payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true }, // cents
    currency: { type: String, default: 'usd' },
    status: { type: String, enum: ['requires_payment_method','requires_confirmation','processing','succeeded','failed','refunded'], default: 'requires_payment_method' },
    stripePaymentIntentId: { type: String, index: true },
    stripeChargeId: { type: String, index: true },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

PaymentSchema.index({ payer: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
