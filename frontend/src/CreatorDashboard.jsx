import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, ShoppingBag, Search, Calendar, User, Tag, Clock, TrendingUp } from 'lucide-react';

export default function CreatorDashboard({ defaultRefCode }) {
  const [refCodeInput, setRefCodeInput] = useState(defaultRefCode || '');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // Replace this with your exact Google Web App Deployment Executable URL
  const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxj-tcfupCwXvdb4Mj26pzPmr51vyNMfUQnlSLHQZMU-tqeqYvn_0Fun0IrB-H7KxvLig/exec';

  // Core Data Fetcher Function
  const fetchOrderHistory = async (targetCode) => {
    if (!targetCode.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      // Sending GET request matching the Apps Script 'e.parameter.ref' logic
      const response = await axios.get(`${GOOGLE_SHEET_URL}?ref=${targetCode.trim()}`);
      
      // Mirroring your script response structure: response.data.result
      if (response.data.result === 'success') {
        setOrders(response.data.data); // e.data.data is the filtered array
      } else {
        setError(response.data.error || 'Failed to extract records from system logs.');
      }
    } catch (err) {
      console.error("Fetch Execution Error:", err);
      setError('Network communication failed. Please verify configuration endpoints.');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Trigger automatically when the component mounts if the user is logged in
  useEffect(() => {
    if (defaultRefCode) {
      setRefCodeInput(defaultRefCode);
      fetchOrderHistory(defaultRefCode);
    }
  }, [defaultRefCode]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    fetchOrderHistory(refCodeInput);
  };

  // Analytics Math Helpers
  const totalSalesCount = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);
  const estimatedCommission = totalRevenue * 0.10; // Example: 10% commission rule

  return (
    <div className="space-y-8 text-neutral-900 font-sans">
      
      {/* INTERNAL BANNER NAVIGATION */}
      <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-950">Referral Sales Ledger</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Real-time sync containing verified tracking logs from Google Sheets.</p>
        </div>
         {/* MANUAL SEARCH HUD FOR ALTERNATIVE CODE TESTING */}
        <form onSubmit={handleManualSearch} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search code..."
              value={refCodeInput}
              onChange={(e) => setRefCodeInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-neutral-200 rounded-xl bg-neutral-50/50 focus:outline-none focus:border-black transition-all focus:bg-white"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-black text-white hover:bg-neutral-900 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0"
          >
            {loading ? 'Fetching...' : 'Query Code'}
          </button>
        </form>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs font-medium">{error}</div>
      ) : !searched ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center max-w-sm mx-auto">
          <Search size={24} className="mx-auto mb-2 text-neutral-300" />
          <p className="text-xs text-neutral-500 font-medium">Please verify or input an affiliate string to read transactions.</p>
        </div>
      ) : (
        <>
          {/* ANALYTICS CARD INTERFACES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-900"><ShoppingBag size={20} /></div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Orders Linked</span>
                <span className="text-2xl font-black text-neutral-950 mt-0.5 block">{totalSalesCount} conversions</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-900"><DollarSign size={20} /></div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Gross Sales Handled</span>
                <span className="text-2xl font-black text-neutral-950 mt-0.5 block">${totalRevenue.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-4 bg-gradient-to-br from-white to-amber-50/20 border-amber-200/40">
              <div className="p-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl"><Clock size={20} /></div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 block">Est. Commission (10%)</span>
                <span className="text-2xl font-black text-amber-600 mt-0.5 block">${estimatedCommission.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* TABLE MATRIX OUTLET */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-white">
              <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-wider">Itemized Sales Streams</h3>
              <span className="text-[9px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-bold uppercase border border-neutral-200/50">Filtered Data Matrix</span>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-400 font-medium">No sales logs have been written to the master sheet under this tracking code yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3">Customer Reference</th>
                      <th className="px-6 py-3">Paid Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs">
                    {orders.map((order, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/30 transition-colors">
                        <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                          {order.date ? new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                        </td>
                        <td className="px-6 py-4 font-bold text-neutral-950">
                          {order.productName}
                          <span className="text-[10px] text-neutral-400 font-mono block mt-0.5 font-normal">ID: {order.productId}</span>
                        </td>
                        <td className="px-6 py-4 text-neutral-600">
                          <div className="font-semibold text-neutral-800">{order.customerName}</div>
                          <div className="text-[11px] text-neutral-400">{order.customerEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-black text-neutral-950">${parseFloat(order.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}