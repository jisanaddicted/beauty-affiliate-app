import Affiliate from '../models/Affiliate.js';
import AffiliateClick from '../models/AffiliateClick.js';

const DEFAULT_SAAS_APP_URL = 'https://videoomniverse.onrender.com';

export const trackAffiliateClick = async (req, res) => {
  let destination;

  try {
    destination = new URL(process.env.SAAS_APP_URL || DEFAULT_SAAS_APP_URL);
    if (!['http:', 'https:'].includes(destination.protocol)) {
      throw new Error('SAAS_APP_URL must use HTTP or HTTPS.');
    }
    destination.searchParams.delete('ref');
  } catch (error) {
    console.error('Invalid SAAS_APP_URL:', error.message);
    return res.status(500).send('Affiliate redirect is not configured.');
  }

  const requestedCode = typeof req.query.ref === 'string' ? req.query.ref.trim() : '';

  if (requestedCode) {
    try {
      const affiliate = await Affiliate.findOneAndUpdate(
        { affiliateCode: requestedCode.toUpperCase() },
        { $inc: { totalClicks: 1 } },
        { new: true }
      );

      if (affiliate) {
        destination.searchParams.set('ref', affiliate.affiliateCode);
        await AffiliateClick.create({
          affiliateId: affiliate._id,
          ipAddress: req.ip || '',
          userAgent: req.get('user-agent') || '',
          referer: req.get('referer') || '',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      // Analytics failures must never prevent the visitor from reaching the SaaS app.
      console.error('Affiliate click tracking failed:', error.message);
    }
  }

  return res.redirect(302, destination.toString());
};
