import jwt from 'jsonwebtoken';
import Affiliate from '../models/Affiliate.js';
import TeamMember, { defaultTeamPermissions } from '../models/TeamMember.js';

const affiliatePermissions = Object.freeze({
  canViewOverview: true,
  canViewAnalytics: true,
  canCreateSmartlinks: true,
  canViewOwnSmartlinksOnly: false,
  canViewEarnings: true,
  canManageTeam: true,
  canRequestPayouts: true,
});

export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'Not authorized, no token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'team_member') {
      const member = await TeamMember.findById(decoded.id).select('-passwordHash').lean();
      if (!member || member.status !== 'active' || String(member.managerAffiliateId) !== String(decoded.managerAffiliateId)) {
        return res.status(401).json({ message: 'Team member account is inactive or no longer exists.' });
      }
      if (!await Affiliate.exists({ _id: member.managerAffiliateId })) return res.status(401).json({ message: 'Team lead account no longer exists.' });
      const permissions = { ...defaultTeamPermissions, ...Object.fromEntries(Object.entries(member.permissions || {}).filter(([key]) => key !== '_id')) };
      req.user = { ...member, _id: member._id, id: member._id, role: 'team_member', managerAffiliateId: member.managerAffiliateId, permissions };
      return next();
    }
    if (decoded.role && decoded.role !== 'affiliate') return res.status(403).json({ message: 'This account role cannot access the affiliate dashboard.' });

    const affiliate = await Affiliate.findById(decoded.id).select('-password').lean();
    if (!affiliate) return res.status(401).json({ message: 'Affiliate account no longer exists.' });
    req.user = { ...affiliate, _id: affiliate._id, id: affiliate._id, role: 'affiliate', managerAffiliateId: affiliate._id, permissions: affiliatePermissions };
    return next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, token validation failed.' });
  }
};

export const protect = requireAuth;

export const requirePermission = (permissionKey) => (req, res, next) => {
  if (req.user?.role === 'affiliate' || req.user?.permissions?.[permissionKey] === true) return next();
  return res.status(403).json({ message: 'You do not have permission to perform this action.' });
};

export const protectAdmin = (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'Admin authentication required.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
    req.admin = { email: decoded.email };
    return next();
  } catch {
    return res.status(401).json({ message: 'Admin session is invalid or expired.' });
  }
};
