import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import Affiliate from '../models/Affiliate.js';
import TeamMember, { defaultTeamPermissions } from '../models/TeamMember.js';
import EmailIdentity from '../models/EmailIdentity.js';
import mongoose from 'mongoose';

const generateAffiliateCode = async (name) => {
  const namePrefix = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6) || 'CREATOR';

  let affiliateCode;
  do {
    affiliateCode = `${namePrefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
  } while (await Affiliate.exists({ affiliateCode }));

  return affiliateCode;
};

/**
 * @desc    Register a new affiliate account
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerAffiliate = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Enter a valid name and email, and a password between 8 and 128 characters.' });
    }

    // 1. Check if the affiliate email already exists
    const [emailExists, teamEmailExists] = await Promise.all([Affiliate.exists({ email }), TeamMember.exists({ email })]);
    if (emailExists || teamEmailExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // 2. Assign a unique tracking code automatically to the new account
    const affiliateCode = await generateAffiliateCode(name);

    // 3. Hash the plain text password for storage security
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Save the new affiliate to MongoDB
    let newAffiliate;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await EmailIdentity.create([{ email, role: 'affiliate' }], { session });
        [newAffiliate] = await Affiliate.create([{ name, email, password: hashedPassword, affiliateCode, status: 'pending' }], { session });
      });
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }

    return res.status(201).json({
      requiresApproval: true,
      message: 'Your affiliate application has been submitted and is pending admin approval.',
      affiliate: {
        id: newAffiliate._id,
        name: newAffiliate.name,
        email: newAffiliate.email,
        status: newAffiliate.status,
        role: 'affiliate',
      }
    });

  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
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
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    // 1. Check if the user account exists
    const affiliate = await Affiliate.findOne({ email }).lean();
    if (affiliate) {
      const isMatch = await bcrypt.compare(password, affiliate.password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });

      const status = affiliate.status || 'approved';
      if (status === 'pending') return res.status(403).json({ code: 'ACCOUNT_PENDING', message: 'Your account is awaiting admin approval.' });
      if (status === 'rejected') return res.status(403).json({ code: 'ACCOUNT_REJECTED', message: 'Your affiliate application was not approved.', reason: affiliate.rejectionReason || undefined });
      if (status === 'suspended') return res.status(403).json({ code: 'ACCOUNT_SUSPENDED', message: 'Your affiliate account has been suspended.' });
      if (status !== 'approved') return res.status(403).json({ message: 'This affiliate account is unavailable.' });

      const token = jwt.sign({ id: affiliate._id, role: 'affiliate' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ token, user: {
        id: affiliate._id, name: affiliate.name, email: affiliate.email, affiliateCode: affiliate.affiliateCode,
        role: 'affiliate',
        permissions: { canViewOverview: true, canViewAnalytics: true, canCreateSmartlinks: true, canViewOwnSmartlinksOnly: false, canViewEarnings: true, canManageTeam: true, canRequestPayouts: true },
      }, affiliate: { id: affiliate._id, name: affiliate.name, email: affiliate.email, affiliateCode: affiliate.affiliateCode, role: 'affiliate' } });
    }

    const matchingMembers = await TeamMember.find({ email }).select('+passwordHash').limit(2);
    if (matchingMembers.length > 1) return res.status(401).json({ message: 'Invalid email or password.' });
    const member = matchingMembers[0];
    if (!member || member.status !== 'active' || !member.passwordHash || !await bcrypt.compare(password, member.passwordHash)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const manager = await Affiliate.findById(member.managerAffiliateId).select('affiliateCode status').lean();
    if (!manager) return res.status(401).json({ message: 'This team member account is no longer connected to an affiliate.' });
    if ((manager.status || 'approved') !== 'approved') return res.status(403).json({ code: 'PARENT_ACCOUNT_UNAVAILABLE', message: 'Your team lead account is not currently approved.' });

    const permissions = { ...defaultTeamPermissions, ...(member.permissions?.toObject?.() || {}) };
    const token = jwt.sign(
      { id: member._id, role: 'team_member', managerAffiliateId: member.managerAffiliateId, permissions },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: member._id, name: member.name, email: member.email, affiliateCode: manager.affiliateCode,
        role: 'team_member', managerAffiliateId: member.managerAffiliateId, permissions,
      },
      affiliate: {
        id: member._id, name: member.name, email: member.email, affiliateCode: manager.affiliateCode, role: 'team_member',
      },
    });

  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'An account with this email already exists.' });
    return res.status(500).json({ message: 'Server login error', error: error.message });
  }
};
