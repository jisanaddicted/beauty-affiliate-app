import jwt from 'jsonwebtoken';
import Affiliate from '../models/Affiliate.js';

/**
 * @desc    Middleware to protect routes and verify the affiliate's JWT token
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Check if the Authorization header exists and starts with "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the raw token string from the header (splits "Bearer <token>" into an array)
      token = req.headers.authorization.split(' ')[1];

      // 2. Decode and verify the token signature using your JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Fetch the affiliate from the database using the ID from the token
      // .select('-password') ensures we do NOT attach the hashed password to the request object
      req.user = await Affiliate.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Affiliate account no longer exists.' });
      }

      // 4. Move to the next middleware or controller function down the line
      return next();

    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token validation failed.' });
    }
  }

  // If no token was found at all in the headers
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

export const protectAdmin = (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'Admin authentication required.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    req.admin = { email: decoded.email };
    return next();
  } catch {
    return res.status(401).json({ message: 'Admin session is invalid or expired.' });
  }
};
