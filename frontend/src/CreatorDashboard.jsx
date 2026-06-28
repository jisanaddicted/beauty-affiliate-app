import React, { useState } from 'react';
import axios from 'axios';
import { DollarSign, ShoppingBag, Search, Calendar, User, Tag, ArrowLeft } from 'lucide-react';

export default function CreatorDashboard() {
  const [refCodeInput, setRefCodeInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxj-tcfupCwXvdb4Mj26pzPmr51vyNMfUQnlSLHQZMU-tqeqYvn_0Fun0IrB-H7KxvLig/exec';

  const handleFetchHistory = async (e) => {
    e.preventDefault();
    if (!refCodeInput.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      // Fetch directly from Google Sheet passing the specific ref parameter
      const response = await axios.get(`${GOOGLE_SHEET_URL}?ref=${refCodeInput.trim()}`);
      
      if (response.data.result === 'success') {
        setOrders(response.data.data);
      } else {
        setError('Failed to extract records from system logs.');
      }
    } catch (err) {
      console.error(err);
      setError('Network communication failed. Please verify configuration endpoints.');
    } finally {
      setLoading(false);
    }
  };

  // Analytics Math Helpers
  const totalSalesCount = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
  const estimatedCommission = totalRevenue * 0.10; // 10% sample commission payout logic

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-black selection:text-white">
      {/* HEADER PORTAL BANNER */}
      <header className="bg-white border-b border-neutral-200/80 px-6 py-5 sm:px-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">Creator Performance Console</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Track your live community referrals & commissions instantly.</p>
        </div>
        
        {/* CODE SEARCH FORM HUD */}
        <form onSubmit={handleFetchHistory} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              placeholder="Enter Referral Code (e.g., Jisan10)"
              value={refCodeInput}
              onChange={(e) => setRefCodeInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-neutral-200 rounded-xl bg-white focus:outline-none focus:border-black transition-all"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-black text-white hover:bg-neutral-900 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Search size={13} /> {loading ? 'Loading...' : 'Fetch Metrics'}
          </button>
        </form>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {!searched ? (
          /* INITIAL BLANK VIEW STATE */
          <div className="bg-white border border-neutral-200 rounded-3xl p-12 text-center max-w-md mx-auto mt-12 shadow-sm">
            <div className="h-12 w-12 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-center text-neutral-400 mx-auto mb-4">
              <Search size={20} className="stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-bold text-neutral-950 uppercase tracking-wider mb-1">Lookup Creator Allocation</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Input your unique affiliate tracking string in the upper header console to fetch live order tracking logs and commission calculations directly from our distribution inventory sheet.
            </p>
          </div>
        ) : error ? (
          /* ERROR HANDLING STATE */
          <div className="text-center py-10 font-semibold text-red-600 text-sm bg-red-50 rounded-2xl border border-red-100 max-w-md mx-auto">{error}</div>
        ) : (
          /* ACTIVE ANALYTICS CONSOLE DASHBOARD VIEW */
          <div className="space-y-8">
            
            {/* CORE ANALYTICS CARD METRICS HIGHLIGHT ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-neutral-50 text-neutral-950 border border-neutral-100 rounded-xl"><ShoppingBag size={20} /></div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Total Referrals Captured</span>
                  <span className="text-2xl font-black text-neutral-950 mt-0.5 block">{totalSalesCount} units</span>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                <div className="p-3 bg-neutral-50 text-neutral-950 border border-neutral-100 rounded-xl"><DollarSign size={20} /></div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">Gross Sales Value</span>
                  <span className="text-2xl font-black text-neutral-950 mt-0.5 block">${totalRevenue.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 p-6 rounded-2xl shadow-sm flex items-center gap-4 bg-gradient-to-br from-white to-amber-50/20 border-amber-200/40">
                <div className="p-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl"><Sparkles size={20} fill="currentColor" /></div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600/80 block">Your Est. Payout (10%)</span>
                  <span className="text-2xl font-black text-amber-600 mt-0.5 block">${estimatedCommission.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* LOWER PORTION: DETAILED TRANSACTIONS SHEET LOG */}
            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-white">
                <h3 className="text-sm font-bold text-neutral-950 uppercase tracking-wider">Itemized Sales Ledger</h3>
                <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-neutral-200/40">Live Realtime Feed</span>
              </div>

              {orders.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-400 font-medium">No valid affiliate transaction logs linked to this code profile yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
                        <th className="px-6 py-3.5">Timestamp</th>
                        <th className="px-6 py-3.5">Product Profile</th>
                        <th className="px-6 py-3.5">Customer Identity</th>
                        <th className="px-6 py-3.5">Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {orders.map((order, index) => (
                        <tr key={index} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-neutral-500 whitespace-nowrap flex items-center gap-1.5">
                            <Calendar size={13} className="text-neutral-400" />
                            {new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 font-bold text-neutral-950">{order.productName} <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">ID: {order.productId}</span></td>
                          <td className="px-6 py-4 text-neutral-600">
                            <div className="font-semibold text-neutral-800 flex items-center gap-1"><User size={12} className="text-neutral-400" /> {order.customerName}</div>
                            <div className="text-[11px] text-neutral-400 mt-0.5">{order.customerEmail}</div>
                          </td>
                          <td className="px-6 py-4 font-black text-neutral-950">${Number(order.price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}