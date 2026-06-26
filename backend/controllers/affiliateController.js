/**
 * @desc    Get current logged-in affiliate profile & balances
 * @route   GET /api/affiliates/dashboard
 * @access  Private
 */
export const getAffiliateDashboard = async (req, res) => {
  try {
    // req.user is automatically populated by our protect middleware
    const affiliate = req.user;

    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate profile not found.' });
    }

    return res.status(200).json({
      id: affiliate._id,
      name: affiliate.name,
      email: affiliate.email,
      affiliateCode: affiliate.affiliateCode,
      balance: affiliate.balance,
      createdAt: affiliate.createdAt
    });
    
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching dashboard metrics', error: error.message });
  }
};