const adminAuth = (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && String(authHeader).startsWith('Bearer ')) {
      token = String(authHeader).substring(7).trim();
    }

    // Check cookie (optional)
    else if (req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    }

    // Check query param for development convenience
    else if (req.query && req.query.adminToken && process.env.NODE_ENV === 'development') {
      token = String(req.query.adminToken);
    }

    const adminToken = process.env.ADMIN_TOKEN || 'admintoken123';

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Admin token missing. Please provide Authorization: Bearer <token>'
      });
    }

    if (token !== adminToken) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Invalid admin token. Access denied.'
      });
    }

    req.admin = { authenticated: true };
    return next();
  } catch (e) {
    console.error('adminAuth error', e && e.message ? e.message : e);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

module.exports = adminAuth;
