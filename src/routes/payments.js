const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const stripeLib = require('stripe');
// If STRIPE_SECRET_KEY is not provided, use an internal mock Stripe implementation for local/dev testing
let stripeClient;
const useMockStripe = !process.env.STRIPE_SECRET_KEY;
if (useMockStripe) {
  console.warn('STRIPE_SECRET_KEY not set — using mock Stripe implementation for development/testing');
  stripeClient = {
    paymentIntents: {
      create: async (opts) => {
        const id = `pi_mock_${Date.now()}`;
        return {
          id,
          client_secret: `cs_mock_${Date.now()}`,
          status: 'requires_payment_method',
          amount: opts.amount,
          currency: opts.currency,
          metadata: opts.metadata || {},
        };
      },
      retrieve: async (id) => {
        // Simulate a succeeded payment intent for testing by default
        return {
          id,
          status: 'succeeded',
          charges: { data: [{ id: `ch_mock_${Date.now()}` }] },
        };
      },
    },
    refunds: {
      create: async (opts) => ({ id: `re_mock_${Date.now()}`, ...opts }),
    },
    webhooks: {
      constructEvent: (body, sig, secret) => {
        // In mock mode, body is already parsed JSON
        return body;
      },
    },
  };
} else {
  stripeClient = stripeLib(process.env.STRIPE_SECRET_KEY);
}
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Create a PaymentIntent for a booking
router.post(
  '/create-intent',
  protect,
  [body('bookingId').isMongoId().withMessage('bookingId is required')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = req.user;
      const { bookingId } = req.body;

      const booking = await Booking.findById(bookingId).populate('mentor student');
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

      // Only the student who owns the booking can create payment for it
      if (!booking.student._id.equals(user._id)) {
        return res.status(403).json({ success: false, message: 'Only the booking student can pay for this booking' });
      }

      // Amount in cents
      const amount = Math.round((booking.price || 0) * 100);
      const currency = process.env.DEFAULT_CURRENCY || 'usd';

      // Calculate platform commission (15%) and mentor share (85%) — amounts in cents
      const platformFee = Math.round(amount * 0.15);
      const mentorAmount = Math.max(0, amount - platformFee);

      const intent = await stripeClient.paymentIntents.create({
        amount,
        currency,
        metadata: {
          bookingId: booking._id.toString(),
          studentId: user._id.toString(),
          mentorId: booking.mentor._id.toString(),
          platformFee: String(platformFee),
          mentorAmount: String(mentorAmount),
          currency: String(currency || 'usd')
        },
      });

      // Create Payment record in DB
      const payment = await Payment.create({
        booking: booking._id,
        payer: user._id,
        amount,
        currency,
        status: intent.status,
        stripePaymentIntentId: intent.id,
        metadata: Object.assign({}, intent.metadata || {}, { platformFee: platformFee, mentorAmount: mentorAmount }),
      });

  return res.json({ success: true, data: { clientSecret: intent.client_secret, paymentId: payment._id, stripePaymentIntentId: intent.id } });
    } catch (err) {
      console.error('POST /payments/create-intent error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Confirm payment server-side (optional) - fetch payment intent and update DB
router.post('/confirm', protect, [body('paymentIntentId').notEmpty()], handleValidationErrors, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
  const intent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

    // Update Payment record if exists
    const payment = await Payment.findOneAndUpdate({ stripePaymentIntentId: paymentIntentId }, { status: intent.status }, { new: true });

    // If succeeded, mark booking as confirmed
    if (intent.status === 'succeeded' && payment && payment.booking) {
      await Booking.findByIdAndUpdate(payment.booking, { status: 'confirmed' });
    }

    return res.json({ success: true, data: { intent, payment } });
  } catch (err) {
    console.error('POST /payments/confirm error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/payments/my - payment history
router.get('/my', protect, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
    const filter = { payer: req.user._id };
    const total = await Payment.countDocuments(filter);
    const items = await Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec();
    return res.json({ success: true, data: { total, page, limit, results: items } });
  } catch (err) {
    console.error('GET /payments/my error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Refund a payment (admin only)
router.post('/refund', protect, authorize('admin'), [body('paymentId').optional().isMongoId(), body('paymentIntentId').optional().isString()], handleValidationErrors, async (req, res) => {
  try {
    const { paymentId, paymentIntentId } = req.body;
    let payment = null;
    if (paymentId) payment = await Payment.findById(paymentId);
    else if (paymentIntentId) payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Create refund via Stripe
  const refunds = await stripeClient.refunds.create({ payment_intent: payment.stripePaymentIntentId });

    payment.status = 'refunded';
    await payment.save();

    return res.json({ success: true, data: { refund: refunds, payment } });
  } catch (err) {
    console.error('POST /payments/refund error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Stripe webhook handler (exported for raw body handling in index.js)
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    if (!webhookSecret) {
      // If no webhook secret provided, try to parse body directly (less secure)
      event = req.body;
    } else {
      event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event types
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        // Update Payment record
        const payment = await Payment.findOneAndUpdate({ stripePaymentIntentId: intent.id }, { status: 'succeeded', stripeChargeId: intent.charges && intent.charges.data[0] && intent.charges.data[0].id, metadata: Object.assign({}, intent.metadata || {}, { stripeChargeId: intent.charges && intent.charges.data[0] && intent.charges.data[0].id }) }, { new: true });
        if (payment && payment.booking) {
          await Booking.findByIdAndUpdate(payment.booking, { status: 'confirmed' });
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        await Payment.findOneAndUpdate({ stripePaymentIntentId: intent.id }, { status: 'failed' });
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        // find payments by charge id
        await Payment.findOneAndUpdate({ stripeChargeId: charge.id }, { status: 'refunded' });
        break;
      }
      default:
        // Unhandled events
        break;
    }
  } catch (err) {
    console.error('Error handling Stripe webhook event:', err);
    return res.status(500).send();
  }

  res.json({ received: true });
}

module.exports = router;
module.exports.handleStripeWebhook = handleStripeWebhook;
