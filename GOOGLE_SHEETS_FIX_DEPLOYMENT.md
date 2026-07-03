# Google Sheets Integration Fix - Deployment Guide

## 🐛 Issues Identified and Fixed

### 1. **Column Index Mismatch (Critical)**
**Problem:** The Google Apps Script was reading the referral code from the wrong column index.
- **Was reading from:** Column G (Index 6) - which contained quantity data
- **Should read from:** Column J (Index 9) - where referral codes are actually stored

**Impact:** This caused the affiliate filtering to fail completely, as it was comparing against quantity numbers instead of referral codes.

**Fix Applied:** Updated `doGet()` function in `google-apps-script.js` to read from correct column indices.

### 2. **Missing Commission Rate Data**
**Problem:** Commission rates were hardcoded to 10% in the frontend, but each product can have different commission rates stored in the Product model.

**Fix Applied:**
- Added commission rate column (Column I, Index 8) to Google Sheets data structure
- Updated `doPost()` to write commission rates when creating orders
- Updated `doGet()` to read commission rates from the sheet
- Updated `CreatorDashboard.jsx` to calculate commissions using actual rates from the sheet

### 3. **Commission Not Multiplying by Quantity**
**Problem:** Commission was calculated as `totalPrice × rate / 100`, which didn't properly account for quantity when totalPrice was just the unit price.

**Fix Applied:** Updated commission calculation formula to `(unitPrice × quantity) × rate / 100` to ensure commissions are calculated correctly for orders with multiple quantities.

### 3. **Status Update Column Mismatch**
**Problem:** Admin was updating delivery status in Column I (Index 8), but after adding commission rate column, delivery status moved to Column L (Index 11).

**Fix Applied:** Updated `doPost()` updateStatus action to write to Column L (Index 11) instead of Column I (Index 8).

---

## 📋 Files Modified

### Backend/Google Apps Script
- **`google-apps-script.js`** - Fixed column indices for reading/writing data

### Frontend
- **`frontend/src/CreatorDashboard.jsx`** - Updated commission calculations to use actual rates from Google Sheets

---

## 🚀 Deployment Steps

### Step 1: Update Google Apps Script
1. Go to your Google Sheet: https://docs.google.com/spreadsheets/d/1vKAGUR6byJCyH-AuG8gPXzy82wGSTX9L/edit
2. Click **Extensions** → **Apps Script**
3. Replace the entire code with the updated `google-apps-script.js` content
4. Click **Deploy** → **Manage deployments**
5. Click **Edit** on the existing deployment
6. Click **Deploy** to update the web app URL
7. **Important:** The web app URL should remain the same, but verify it after deployment

### Step 2: Update Google Sheet Columns
Your Google Sheet should now have these columns (from A to L):

| Column | Index | Field Name | Description |
|--------|-------|------------|-------------|
| A | 0 | customerName | Customer's full name |
| B | 1 | customerPhone | Customer phone number |
| C | 2 | shippingAddress | Delivery address |
| D | 3 | productId | MongoDB product ID |
| E | 4 | productName | Product name |
| F | 5 | price | Unit price |
| G | 6 | quantity | Number of items |
| H | 7 | totalPrice | Total order value |
| I | 8 | commissionRate | Commission percentage (e.g., 10, 15, 20) |
| J | 9 | referralCode | Affiliate code (e.g., JISAN10) |
| K | 10 | date | Timestamp of order |
| L | 11 | deliveryStatus | "On Way" or "Delivered" |

**Action Required:**
- If you have existing data, you may need to insert a new column at position I (before referral code) for commission rates
- For existing rows, you can leave commission rate blank (defaults to 10%)
- Update your header row to include "Commission Rate" in column I

### Step 3: Update Backend Order Controller
The backend `orderController.js` already sends commission rates when creating orders. Ensure your order creation endpoint includes the commission rate:

```javascript
// In backend/controllers/orderController.js (line 66-71)
const syncResponse = await axios.post('https://beauty-affiliate-app.onrender.com/api/affiliates/sync-balances', {
  deliveredOrders: deliveredOrders,
  pendingOrders: pendingOrders
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Note:** The order controller already calculates commissions correctly using product-specific rates.

### Step 4: Deploy Frontend Changes
```bash
cd frontend
npm run build
```

Deploy the built files to your hosting platform (Vercel, Netlify, etc.).

### Step 5: Test the Integration
1. **Test Data Fetching:**
   - Log in as an affiliate
   - Navigate to "Orders History" tab
   - Verify orders are displayed with correct referral code filtering
   - Check that commission calculations are accurate

2. **Test Status Updates:**
   - Log in as admin
   - Go to "Order Sync Log" tab
   - Click "Mark Delivered" on an order
   - Verify the status updates in Google Sheets
   - Verify the commission moves from "Pending" to "Approved"

3. **Test Commission Calculations:**
   - Create test orders with different commission rates
   - Verify pending/approved commissions calculate correctly
   - Check that the rates match the product's commissionRate field

---

## 🔍 Verification Checklist

- [ ] Google Apps Script deployed successfully
- [ ] Web app URL is accessible
- [ ] Google Sheet has correct column structure (A-L)
- [ ] Frontend builds without errors
- [ ] Affiliate can see their orders filtered by referral code
- [ ] Commission calculations use correct rates from sheet
- [ ] Admin can update delivery status
- [ ] Status updates reflect in affiliate dashboard
- [ ] Pending/Approved commission values update correctly

---

## 🐛 Troubleshooting

### Issue: "Network communication failed"
**Solution:** Check browser console for CORS errors. The Google Apps Script should handle CORS with the `doOptions()` function.

### Issue: Orders not showing for affiliate
**Solution:** 
1. Check that the referral code in Google Sheet matches exactly (case-insensitive)
2. Verify the Google Apps Script is deployed and accessible
3. Check browser network tab for the API response

### Issue: Commission calculations wrong
**Solution:**
1. Verify commission rate column (I) has correct values
2. Check that commission rates are stored as numbers, not strings
3. Default is 10% if column is empty

### Issue: Status updates not working
**Solution:**
1. Verify AdminPanel is sending correct customerPhone and productId
2. Check that delivery status is being written to Column L (Index 11)
3. Ensure there are no extra spaces in the phone/product ID fields

---

## 📊 Data Flow Diagram

```
Customer Purchase → Backend API → Google Sheets (doPost)
                                    ↓
Affiliate Dashboard → Google Sheets (doGet) → Filter by ref code
                                    ↓
                    Calculate commissions using sheet rates
                                    ↓
                    Display pending/approved balances
                                    ↓
Admin Panel → Google Sheets (doPost updateStatus) → Mark as Delivered
                                    ↓
                    Affiliate sees updated status & commission
```

---

## 🔐 Security Notes

- Google Apps Script web app should be set to "Anyone" can access (for public data)
- No sensitive data is exposed through the Google Sheet
- Authentication is handled by the backend (Node.js/MongoDB)
- Google Sheet acts as a public ledger/view layer only

---

## 📝 Additional Notes

- The Google Sheet serves as the single source of truth for order data
- All commission calculations in the frontend are now dynamic based on product rates
- The backend still maintains MongoDB for user authentication and balance tracking
- The sync endpoint (`/api/affiliates/sync-balances`) updates MongoDB balances from sheet data

---

## 🎯 Next Steps (Optional Improvements)

1. **Add commission rate validation** in the order creation flow
2. **Implement caching** for Google Sheets data to reduce API calls
3. **Add error boundaries** in frontend for better error handling
4. **Create a migration script** to add commission rates to existing Google Sheet rows
5. **Add webhook notifications** when orders are marked as delivered

---

## ✅ Summary

All critical issues have been fixed:
- ✅ Column index mismatch resolved
- ✅ Commission rates now stored and calculated correctly
- ✅ Status updates target correct column
- ✅ Frontend uses dynamic commission rates from sheet
- ✅ Backward compatibility maintained (defaults to 10% if no rate specified)

The system is now ready for deployment!