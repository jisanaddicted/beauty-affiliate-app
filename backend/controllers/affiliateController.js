/**
 * @desc    Sync affiliate balances based on order delivery status from Google Sheets
 * @route   POST /api/affiliates/sync-balances
 * @access  Private
 */
export const syncAffiliateBalances = async (req, res) => {
  try {
    const affiliate = req.user;
    const { deliveredOrders, pendingOrders } = req.body;

    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate profile not found.' });
    }

    // Calculate totals from delivered and pending orders
    const deliveredTotal = deliveredOrders?.reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0) || 0;
    const pendingTotal = pendingOrders?.reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0) || 0;

    // Calculate commissions (10% rate)
    const deliveredCommission = deliveredTotal * 0.10;
    const pendingCommission = pendingTotal * 0.10;

    // Calculate total withdrawn amount from withdrawal history
    const withdrawals = await import('../models/Withdrawal.js').then(m => 
      m.default.find({ affiliateId: affiliate._id, status: 'Approved' })
    );
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    // Update balances
    // withdrawableBalance = total delivered commissions - total withdrawn
    // pendingBalance = pending commissions (orders not yet delivered)
    // totalEarned = total delivered commissions (lifetime)
    affiliate.balance = {
      pendingBalance: pendingCommission,
      withdrawableBalance: Math.max(0, deliveredCommission - totalWithdrawn),
      totalEarned: deliveredCommission
    };

    await affiliate.save();

    return res.status(200).json({
      message: 'Balances synced successfully',
      balance: affiliate.balance
    });

  } catch (error) {
    return res.status(500).json({ message: 'Server error syncing balances', error: error.message });
  }
};

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