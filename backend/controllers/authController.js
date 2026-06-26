import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Affiliate from '../models/Affiliate.js';

/**
 * @desc    Register a new affiliate account
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerAffiliate = async (req, res) => {
  try {
    const { name, email, password, affiliateCode } = req.body;

    // 1. Check if the affiliate email already exists
    const emailExists = await Affiliate.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // 2. Check if the custom tracking code is already claimed
    const codeExists = await Affiliate.findOne({ affiliateCode: affiliateCode.toUpperCase() });
    if (codeExists) {
      return res.status(400).json({ message: 'This affiliate code is already taken.' });
    }

    // 3. Hash the plain text password for storage security
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Save the new affiliate to MongoDB
    const newAffiliate = await Affiliate.create({
      name,
      email,
      password: hashedPassword,
      affiliateCode
    });

    // 5. Generate a secure session JWT token
    const token = jwt.sign(
      { id: newAffiliate._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Session stays valid for 7 days
    );

    // 6. Respond with profile metrics and token
    return res.status(201).json({
      token,
      affiliate: {
        id: newAffiliate._id,
        name: newAffiliate.name,
        email: newAffiliate.email,
        affiliateCode: newAffiliate.affiliateCode,
        balance: newAffiliate.balance
      }
    });

  } catch (error) {
    return res.status(500).json({ message: 'Server registration error', error: error.message });
  }
};

/**
 * @desc    Authenticate returning affiliate & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginAffiliate = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if the user account exists
    const affiliate = await Affiliate.findOne({ email });
    if (!affiliate) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 2. Compare incoming plain text password against database hash
    const isMatch = await bcrypt.compare(password, affiliate.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 3. Issue a fresh session token
    const token = jwt.sign(
      { id: affiliate._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Return profile metrics
    return res.status(200).json({
      token,
      affiliate: {
        id: affiliate._id,
        name: affiliate.name,
        email: affiliate.email,
        affiliateCode: affiliate.affiliateCode,
        balance: affiliate.balance
      }
    });

  } catch (error) {
    return res.status(500).json({ message: 'Server login error', error: error.message });
  }
};