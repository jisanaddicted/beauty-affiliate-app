import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, ShoppingBag, Search, Tag, Clock, CheckCircle2, Truck, Filter } from 'lucide-react';

export default function CreatorDashboard({ defaultRefCode }) {
  const [refCodeInput, setRefCodeInput] = useState(defaultRefCode || '');
  const [orders, setOrders] = useState([]);
  const [deliveryFilter, setDeliveryFilter] = useState('All'); // 'All', 'On Way', 'Delivered'
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

  // 🧮 LIVE BALANCES CALCULATIONS BASED ON GOOGLE SHEET ROW STATUS (Assuming Column I / row[8] contains 'On Way' or 'Delivered')
  // Note: If no status exists in row, it defaults gracefully to 'On Way'
  const pendingRevenue = orders
    .filter(order => (order.deliveryStatus || 'On Way').toLowerCase() === 'on way')
    .reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);

  const approvedRevenue = orders
    .filter(order => (order.deliveryStatus || '').toLowerCase() === 'delivered')
    .reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);

  // Commission Calculations (Assuming 10% rate)
  const pendingCommission = pendingRevenue * 0.10;
  const approvedCommission = approvedRevenue * 0.10;

  // Frontend Filtering Array Logic
  const filteredOrders = orders.filter(order => {
    const status = (order.deliveryStatus || 'On Way').toLowerCase();
    if (deliveryFilter === 'On Way') return status === 'on way';
    if (deliveryFilter === 'Delivered') return status === 'delivered';
    return true; // 'All'
  });

  return (
    <div className="space-y-6 text-neutral-900 font-sans w-full overflow-x-hidden">
      
      {/* MANIFEST CONTROL PANEL BANNER */}
      <div className="bg-white border border-neutral-200 p-4 sm:p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-950">Referral Sales Ledger</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Real-time status updates tracked from Google Sheets.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* DELIVERY STATUS BADGE SELECTOR FILTER */}
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/40 text-xs font-semibold">
            {['All', 'On Way', 'Delivered'].map((tab) => (
              <button
                key={tab} type="button" onClick={() => setDeliveryFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition-all ${deliveryFilter === tab ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                {tab === 'On Way' && '🚚 '}
                {tab === 'Delivered' && '✅ '}
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleManualSearch} className="flex items-center gap-2 flex-1 sm:flex-initial">
            <div className="relative flex-1 sm:w-44 lg:w-56">
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
          {/* TRACKING PIPELINE METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-neutral-50 border rounded-lg text-neutral-900"><ShoppingBag size={16} /></div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block">Total Conversions</span>
                <span className="text-lg font-black text-neutral-950 block">{orders.length} units</span>
              </div>
            </div>

            <div className="bg-white border border-amber-200/70 p-4 rounded-xl shadow-sm flex items-center gap-3 bg-amber-50/10">
              <div className="p-2.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg"><Clock size={16} /></div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-600 block">Pending Payout (On Way)</span>
                <span className="text-lg font-black text-amber-600 block">৳{pendingCommission.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white border border-emerald-200/70 p-4 rounded-xl shadow-sm flex items-center gap-3 bg-emerald-50/10">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg"><CheckCircle2 size={16} /></div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-700 block">Approved Payout (Done)</span>
                <span className="text-lg font-black text-emerald-700 block">৳{approvedCommission.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ITEMISED SALES RECORD MATRIX CONTAINER */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3.5 border-b border-neutral-100 flex justify-between items-center bg-white">
              <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-wider">Filtered Pipeline Stream</h3>
              <span className="text-[9px] font-bold text-neutral-400 font-mono bg-neutral-50 px-2 py-0.5 rounded border">Viewing: {deliveryFilter}</span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 font-medium">No sales logs match the selected delivery status filter.</div>
            ) : (
              <div className="w-full">
                
                {/* 📱 MOBILE INSTANCE STRUCT CARD LAYOUT */}
                <div className="block sm:hidden divide-y divide-neutral-100">
                  {filteredOrders.map((order, idx) => {
                    const isDone = (order.deliveryStatus || '').toLowerCase() === 'delivered';
                    return (
                      <div key={idx} className="p-4 space-y-2 bg-white text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-neutral-950 text-sm">{order.productName}</p>
                            <p className="text-[10px] text-neutral-400 font-mono">ID: {order.productId}</p>
                          </div>
                          <span className={`font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 ${isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {isDone ? <CheckCircle2 size={10}/> : <Truck size={10}/>}
                            {order.deliveryStatus || 'On Way'}
                          </span>
                        </div>
                        
                        <div className="bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-200/30 text-neutral-600 space-y-1">
                          <div className="flex justify-between"><span className="text-neutral-400 text-[10px]">Customer:</span> <span className="font-semibold text-neutral-800">{order.customerName}</span></div>
                          <div className="flex justify-between"><span className="text-neutral-400 text-[10px]">Total Bill:</span> <span className="font-bold text-neutral-950">${parseFloat(order.price).toFixed(2)}</span></div>
                          <div className="flex justify-between"><span className="text-neutral-400 text-[10px]">Date Log:</span> <span className="text-neutral-500">{order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 🖥️ DESKTOP VIEW DATA SHEET SHEET TABLE */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3">Product Name</th>
                        <th className="px-6 py-3">Customer Reference</th>
                        <th className="px-6 py-3">Delivery Status</th>
                        <th className="px-6 py-3">Paid Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {filteredOrders.map((order, idx) => {
                        const isDone = (order.deliveryStatus || '').toLowerCase() === 'delivered';
                        return (
                          <tr key={idx} className="hover:bg-neutral-50/30 transition-colors">
                            <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                              {order.date ? new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Pending'}
                            </td>
                            <td className="px-6 py-4 font-bold text-neutral-950">
                              {order.productName}
                              <span className="text-[10px] text-neutral-400 font-mono block mt-0.5 font-normal">ID: {order.productId}</span>
                            </td>
                            <td className="px-6 py-4 text-neutral-600">
                              <div className="font-semibold text-neutral-800">{order.customerName}</div>
                              <div className="text-[11px] text-neutral-400">{order.customerEmail}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 border ${isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                {isDone ? <CheckCircle2 size={11}/> : <Truck size={11}/>}
                                {order.deliveryStatus || 'On Way'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-black text-neutral-950">${parseFloat(order.price).toFixed(2)}</td>
                          </tr>
                        );
                      })}
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