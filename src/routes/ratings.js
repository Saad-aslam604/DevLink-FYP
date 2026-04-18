const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const Rating = require('../models/Rating');
const Booking = require('../models/Booking');
const User = require('../models/User');

// POST /api/ratings - Create a new rating (student rating mentor)
router.post(
  '/',
  protect,
  [
    body('mentorId').isMongoId().withMessage('Invalid mentor ID'),
    body('bookingId').isMongoId().withMessage('Invalid booking ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString().trim().isLength({ max: 1000 }),
    body('categories.communication').optional().isInt({ min: 1, max: 5 }),
    body('categories.expertise').optional().isInt({ min: 1, max: 5 }),
    body('categories.punctuality').optional().isInt({ min: 1, max: 5 }),
    body('categories.helpfulness').optional().isInt({ min: 1, max: 5 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { mentorId, bookingId, rating, comment, categories } = req.body;

      // Verify booking exists and user is a participant
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (String(booking.student._id) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'Only booking student can rate this session' });
      }

      // Check if already rated
      const existingRating = await Rating.findOne({ booking: bookingId, reviewer: userId });
      if (existingRating) {
        return res.status(400).json({ success: false, message: 'You have already rated this session' });
      }

      // Create rating
      const newRating = new Rating({
        reviewer: userId,
        mentor: mentorId,
        booking: bookingId,
        rating,
        comment,
        categories: categories || {},
      });

      await newRating.save();

      // Update mentor's average rating
      const mentorRatings = await Rating.find({ mentor: mentorId });
      const avgRating = mentorRatings.reduce((sum, r) => sum + r.rating, 0) / mentorRatings.length;
      
      const mentor = await User.findById(mentorId);
      mentor.rating = Number(avgRating.toFixed(1));
      await mentor.save();

      res.status(201).json({
        success: true,
        message: 'Rating submitted successfully',
        data: { rating: newRating },
      });
    } catch (err) {
      console.error('Rating creation error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/ratings/mentor/:mentorId - Get all ratings for a mentor
router.get(
  '/mentor/:mentorId',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { mentorId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const ratings = await Rating.find({ mentor: mentorId })
        .populate('reviewer', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Rating.countDocuments({ mentor: mentorId });

      // Calculate statistics
      const allRatings = await Rating.find({ mentor: mentorId });
      const avgRating = allRatings.length > 0 
        ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1)
        : 0;
      
      const distribution = {
        5: allRatings.filter(r => r.rating === 5).length,
        4: allRatings.filter(r => r.rating === 4).length,
        3: allRatings.filter(r => r.rating === 3).length,
        2: allRatings.filter(r => r.rating === 2).length,
        1: allRatings.filter(r => r.rating === 1).length,
      };

      res.json({
        success: true,
        data: {
          ratings,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          stats: { avgRating, distribution, totalRatings: total },
        },
      });
    } catch (err) {
      console.error('Fetch ratings error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/ratings/my - Get logged-in user's ratings they gave
router.get('/my', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const ratings = await Rating.find({ reviewer: userId })
      .populate('mentor', 'firstName lastName avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { ratings } });
  } catch (err) {
    console.error('Fetch user ratings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/ratings/:ratingId - Update a rating (only by reviewer)
router.put(
  '/:ratingId',
  protect,
  [
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('comment').optional().isString().trim().isLength({ max: 1000 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { ratingId } = req.params;
      const { rating, comment } = req.body;

      const ratingDoc = await Rating.findById(ratingId);
      if (!ratingDoc) {
        return res.status(404).json({ success: false, message: 'Rating not found' });
      }

      if (String(ratingDoc.reviewer._id) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'Only reviewer can update this rating' });
      }

      if (rating) ratingDoc.rating = rating;
      if (comment !== undefined) ratingDoc.comment = comment;

      await ratingDoc.save();

      // Recalculate mentor's average
      const mentorRatings = await Rating.find({ mentor: ratingDoc.mentor });
      const avgRating = mentorRatings.reduce((sum, r) => sum + r.rating, 0) / mentorRatings.length;
      
      const mentor = await User.findById(ratingDoc.mentor);
      mentor.rating = Number(avgRating.toFixed(1));
      await mentor.save();

      res.json({ success: true, message: 'Rating updated', data: { rating: ratingDoc } });
    } catch (err) {
      console.error('Update rating error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /api/ratings/:ratingId - Delete a rating
router.delete('/:ratingId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { ratingId } = req.params;

    const rating = await Rating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({ success: false, message: 'Rating not found' });
    }

    if (String(rating.reviewer._id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only reviewer can delete this rating' });
    }

    const mentorId = rating.mentor;
    await Rating.deleteOne({ _id: ratingId });

    // Recalculate mentor's average
    const mentorRatings = await Rating.find({ mentor: mentorId });
    const avgRating = mentorRatings.length > 0
      ? (mentorRatings.reduce((sum, r) => sum + r.rating, 0) / mentorRatings.length).toFixed(1)
      : 0;
    
    const mentor = await User.findById(mentorId);
    mentor.rating = Number(avgRating);
    await mentor.save();

    res.json({ success: true, message: 'Rating deleted' });
  } catch (err) {
    console.error('Delete rating error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
