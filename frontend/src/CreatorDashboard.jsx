import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, ShoppingBag, Search, Calendar, User, Tag, Clock } from 'lucide-react';

export default function CreatorDashboard({ defaultRefCode }) {
  const [refCodeInput, setRefCodeInput] = useState(defaultRefCode || '');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxj-tcfupCwXvdb4Mj26pzPmr51vyNMfUQnlSLHQZMU-tqeqYvn_0Fun0IrB-H7KxvLig/exec';

  const fetchOrderHistory = async (targetCode) => {
    if (!targetCode.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const response = await axios.get(`${GOOGLE_SHEET_URL}?ref=${targetCode.trim()}`);
      if (response.data.result === 'success') {
        setOrders(response.data.data);
      } else {
        setError(response.data.error || 'Failed to extract records.');
      }
    } catch (err) {
      setError('Network communication failed.');
    } finally {
      setLoading(false);
    }
  };

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

  const totalSalesCount = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);
  const estimatedCommission = totalRevenue * 0.10;

  return (
    <div className="space-y-6 text-neutral-900 font-sans w-full overflow-x-hidden">
      
      {/* MANIFEST BANNER CONTROLS */}
      <div className="bg-white border border-neutral-200 p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-950">Referral Sales Ledger</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Real-time tracking logs synced from Google Sheets.</p>
        </div>
        
        <form onSubmit={handleManualSearch} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48 lg:w-64">
            <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" placeholder="Search code..." value={refCodeInput}
              onChange={(e) => setRefCodeInput(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-xl focus:outline-none focus:border-black bg-neutral-50/50"
            />
          </div>
          <button type="submit" disabled={loading} className="bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0">
            {loading ? '...' : 'Query'}
          </button>
        </form>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 text-red-800 rounded-xl text-xs font-medium">{error}</div>
      ) : !searched ? (
        <div className="bg-white border rounded-2xl p-8 text-center max-w-xs mx-auto">
          <Search size={20} className="mx-auto mb-2 text-neutral-300" />
          <p className="text-xs text-neutral-500">Input an affiliate tracking string to view transactions.</p>
        </div>
      ) : (
        <>
          {/* CARDS OVERVIEW LAYOUT ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-neutral-50 border rounded-lg text-neutral-900"><ShoppingBag size={16} /></div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block">Orders Linked</span>
                <span className="text-lg font-black text-neutral-950 block">{totalSalesCount} units</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-neutral-50 border rounded-lg text-neutral-900"><DollarSign size={16} /></div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block">Gross Revenue</span>
                <span className="text-lg font-black text-neutral-950 block">${totalRevenue.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex items-center gap-3 bg-gradient-to-br from-white to-amber-50/20 border-amber-200/40 sm:col-span-2 md:col-span-1">
              <div className="p-2.5 bg-amber-50 border rounded-lg text-amber-600"><Clock size={16} /></div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-600 block">Est. Payout (10%)</span>
                <span className="text-lg font-black text-amber-600 block">${estimatedCommission.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ITEMISED SALES LOG OUTLET CONTAINER */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3.5 border-b border-neutral-100 flex justify-between items-center bg-white">
              <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-wider">Sales Stream Records</h3>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 font-medium">No sales logs recorded matching this tracking parameters.</div>
            ) : (
              <div className="w-full">
                
                {/* 📱 MOBILE VIEW CARD STREAM (Visually replaces raw tables on smartphones) */}
                <div className="block sm:hidden divide-y divide-neutral-100">
                  {orders.map((order, idx) => (
                    <div key={idx} className="p-4 space-y-2 bg-white text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-neutral-950 text-sm">{order.productName}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">SKU / ID: {order.productId}</p>
                        </div>
                        <span className="font-black text-neutral-950 text-sm bg-neutral-50 border px-2 py-0.5 rounded-lg">${parseFloat(order.price).toFixed(2)}</span>
                      </div>
                      
                      <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-200/30 text-neutral-600 space-y-1">
                        <div className="flex justify-between"><span className="text-neutral-400 text-[10px]">Customer:</span> <span className="font-semibold text-neutral-800">{order.customerName}</span></div>
                        <div className="flex justify-between"><span className="text-neutral-400 text-[10px]">Email:</span> <span className="text-neutral-500">{order.customerEmail}</span></div>
                        <div className="flex justify-between"><span className="text-neutral-400 text-[10px]">Date Log:</span> <span className="text-neutral-500">{order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🖥️ DESKTOP VIEW VIEWPORT SHEET TABLE (Displays on table viewports and larger desktops) */}
                <div className="hidden sm:block overflow-x-auto">
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

              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}