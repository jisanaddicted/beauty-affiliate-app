import Affiliate from '../models/Affiliate.js';
import AffiliateClick from '../models/AffiliateClick.js';
import SaasProduct from '../models/SaasProduct.js';

const redirectTo = (res, url) => res.redirect(302, url.toString());

export const trackAffiliateClick = async (req, res) => {
  let product;
  let destination;

  try {
    const slug = req.params.slug || req.query.product || req.query.app;
    product = slug
      ? await SaasProduct.findOne({ slug: String(slug).toLowerCase() })
      : await SaasProduct.findOne({ status: 'active' }).sort({ createdAt: 1 });

    if (!product) {
      if (process.env.SAAS_APP_URL) return redirectTo(res, new URL(process.env.SAAS_APP_URL));
      return res.status(404).send('SaaS product not found.');
    }

    destination = new URL(product.destinationUrl);
    destination.searchParams.delete(product.refParamKey || 'ref');
    if (product.refParamKey && product.refParamKey !== 'ref') destination.searchParams.delete('ref');
  } catch (error) {
    console.error('Affiliate tracking destination lookup failed:', error.message);
    if (process.env.SAAS_APP_URL) {
      try {
        return redirectTo(res, new URL(process.env.SAAS_APP_URL));
      } catch {
        // Return a generic error only when no safe redirect URL is configured.
      }
    }
    return res.status(503).send('Affiliate destination is temporarily unavailable.');
  }

  const refKey = product.refParamKey || 'ref';
  const requestedCode = typeof req.query[refKey] === 'string'
    ? req.query[refKey].trim()
    : (typeof req.query.ref === 'string' ? req.query.ref.trim() : '');

  if (requestedCode) {
    try {
      const affiliate = await Affiliate.findOneAndUpdate(
        { affiliateCode: requestedCode.toUpperCase(), $or: [{ status: 'approved' }, { status: { $exists: false } }, { status: null }] },
        { $inc: { totalClicks: 1 } },
        { new: true }
      );

      if (affiliate) {
        destination.searchParams.set(refKey, affiliate.affiliateCode);
        await AffiliateClick.create({
          affiliateId: affiliate._id,
          saasProductId: product._id,
          ipAddress: req.ip || '',
          userAgent: req.get('user-agent') || '',
          referer: req.get('referer') || '',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Affiliate click analytics failed:', error.message);
    }
  }

  return redirectTo(res, destination);
};
