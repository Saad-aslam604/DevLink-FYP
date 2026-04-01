const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user authentication
 * @param {string} id - User ID
 * @param {string} role - User role (optional, for role-specific tokens)
 * @param {object} additionalPayload - Additional data to include in token (optional)
 * @returns {string} JWT token
 */
function generateToken(id, role = null, additionalPayload = {}) {
  // Validate environment variables (allow dev fallback)
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret' : null)
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }

  if (!id) {
    throw new Error('User ID is required to generate token');
  }

  // Base payload
  const payload = {
    id,
    iat: Math.floor(Date.now() / 1000), // Issued at time
    ...additionalPayload
  };

  // Add role to payload if provided
  if (role) {
    payload.role = role;
  }

  // Token options
  const options = {
    expiresIn: process.env.JWT_EXPIRE || '30d',
    issuer: 'devlink-api',
    audience: 'devlink-client'
  };

  try {
  const token = jwt.sign(payload, secret, options);
    
    // Log token generation in development (never in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Token generated for user: ${id}`);
    }
    
    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 */
function verifyToken(token) {
  if (!token) {
    throw new Error('Token is required for verification');
  }

  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret' : null)
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'devlink-api',
      audience: 'devlink-client'
    });
    
    return decoded;
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    
    if (error.name === 'NotBeforeError') {
      throw new Error('Token not yet active');
    }
    
    console.error('Token verification error:', error);
    throw new Error('Token verification failed');
  }
}

/**
 * Generate refresh token (for future implementation)
 * @param {string} id - User ID
 * @returns {string} Refresh token
 */
function generateRefreshToken(id) {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not set in environment variables');
  }

  const payload = {
    id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  const options = {
    expiresIn: '90d', // Longer expiration for refresh tokens
    issuer: 'devlink-api',
    audience: 'devlink-client'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, options);
}

/**
 * Decode token without verification (for inspection only)
 * @param {string} token - JWT token
 * @returns {object} Decoded token without verification
 */
function decodeToken(token) {
  if (!token) {
    throw new Error('Token is required for decoding');
  }

  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decoding error:', error);
    throw new Error('Failed to decode token');
  }
}

/**
 * Check if token is about to expire (for proactive renewal)
 * @param {string} token - JWT token
 * @param {number} thresholdMs - Threshold in milliseconds (default: 1 hour)
 * @returns {boolean} True if token is about to expire
 */
function isTokenExpiringSoon(token, thresholdMs = 60 * 60 * 1000) {
  try {
    const decoded = decodeToken(token);
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return (expirationTime - currentTime) < thresholdMs;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Assume expired if we can't check
  }
}

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  decodeToken,
  isTokenExpiringSoon
};