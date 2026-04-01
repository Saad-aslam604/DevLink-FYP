const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect middleware: verifies JWT and attaches user to req.user
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if user needs to re-authenticate (optional security feature)
    if (user.lastLogin && decoded.iat) {
      const tokenIssuedAt = decoded.iat * 1000; // Convert to milliseconds
      if (user.lastLogin > tokenIssuedAt) {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.'
        });
      }
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    // Generic error
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Please try again.'
    });
  }
};

// Optional: Admin authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized to access this resource.`
      });
    }

    next();
  };
};

// Optional: Soft check - attaches user if token exists, but doesn't require it
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't block the request on token errors
    next();
  }
};

module.exports = {
  protect,
  authorize,
  optionalAuth
};