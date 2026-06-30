import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, PlusCircle, LogOut, Package, 
  Truck, CheckCircle2, RefreshCw, Search, ShoppingBag, Menu, X 
} from 'lucide-react';

export default function AdminPanel() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Tab Controller Engine ('products' vs 'orders')
  const [activeTab, setActiveTab] = useState('products');

  // Mobile Drawer Toggle State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Order Tracking States
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxj-tcfupCwXvdb4Mj26pzPmr51vyNMfUQnlSLHQZMU-tqeqYvn_0Fun0IrB-H7KxvLig/exec';

  // Form Fields for Adding Product
  const [formData, setFormData] = useState({
    name: '', price: '', commissionRate: '', sku: '',
    productUrl: '', description: '', category: 'Premium Skincare',
    stock: '', highlights: '', image: ''
  });

  // Fetch all orders from Google Sheet
  const fetchAllOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await axios.get(GOOGLE_SHEET_URL);
      if (response.data.result === 'success') {
        setOrders(response.data.data);
      }
    } catch (err) {
      console.error("Spreadsheet Sync Error:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Run fetch loop when moving into the order manager layout tab
  useEffect(() => {
    if (isAdminLoggedIn && activeTab === 'orders') {
      fetchAllOrders();
    }
  }, [isAdminLoggedIn, activeTab]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await axios.post('https://beauty-affiliate-app.onrender.com/api/admin/login', { email, password });
      if (response.data) {
        setIsAdminLoggedIn(true);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Access Denied');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await axios.post('https://beauty-affiliate-app.onrender.com/api/admin/products', formData);
      setSuccessMsg('✨ Product pushed to MongoDB live marketplace successfully!');
      setFormData({
        name: '', price: '', commissionRate: '', sku: '',
        productUrl: '', description: '', category: 'Premium Skincare',
        stock: '', highlights: '', image: ''
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed saving document configuration.');
    }
  };

  const handleMarkAsDelivered = async (order, index) => {
    setUpdatingId(index);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // Packaged cleanly to bypass strict preflight timeouts
      const response = await axios.post(GOOGLE_SHEET_URL, {
        action: "updateStatus",
        customerEmail: order.customerEmail,
        productId: order.productId,
        status: "Delivered"
      });

      if (response.data.result === 'success') {
        const updatedOrders = [...orders];
        updatedOrders[index].deliveryStatus = 'Delivered';
        setOrders(updatedOrders);
        setSuccessMsg(`🚀 Marked order from ${order.customerName} as Delivered successfully.`);
      } else {
        setErrorMsg(response.data.message || "Could not update sheet cell tracking parameters.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network transmission fallback timeout error.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Compute Live Metrics from orders array
  const totalOrders = orders.length;
  const onWayCount = orders.filter(o => (o.deliveryStatus || 'On Way').toLowerCase() === 'on way').length;
  const deliveredCount = orders.filter(o => (o.deliveryStatus || '').toLowerCase() === 'delivered').length;

  // Filter and search computation rule mapping
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.referralCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const status = (order.deliveryStatus || 'On Way').toLowerCase();
    if (statusFilter === 'On Way') return matchesSearch && status === 'on way';
    if (statusFilter === 'Delivered') return matchesSearch && status === 'delivered';
    return matchesSearch;
  });

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 sm:p-6">
        <form onSubmit={handleAdminLogin} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-neutral-800 rounded-xl text-amber-400 mb-2"><Shield size={24} /></div>
            <h2 className="text-xl font-bold text-white tracking-tight">System Infrastructure Login</h2>
            <p className="text-xs text-neutral-500 mt-1">Manual MongoDB Credential Matching Only</p>
          </div>
          {errorMsg && <div className="p-3.5 bg-red-950 border border-red-900 text-red-400 text-xs rounded-xl mb-4">{errorMsg}</div>}
          <div className="space-y-4">
            <input type="email" placeholder="Admin Email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-white rounded-xl text-sm focus:outline-none focus:border-neutral-700"/>
            <input type="password" placeholder="Root Password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-white rounded-xl text-sm focus:outline-none focus:border-neutral-700"/>
            <button type="submit" className="w-full bg-white hover:bg-neutral-200 text-black py-3 rounded-xl font-semibold text-sm transition-all">Authenticate Node</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-50 text-neutral-900 relative">
      
      {/* 📱 MOBILE NAVIGATION BAR */}
      <header className="md:hidden w-full bg-white border-b border-neutral-200 p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-neutral-950 rounded-lg text-white"><Shield size={14} /></div>
          <span className="font-bold text-sm tracking-tight">Glow Control</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* 🖥️ SLIDE-OUT SIDEBAR CONTROLLER */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 p-6 flex flex-col justify-between shrink-0 transform transition-transform duration-300 ease-in-out
        md:relative md:transform-none md:flex
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          <div className="hidden md:flex items-center gap-3 mb-8 px-2">
            <div className="p-2 bg-neutral-950 rounded-lg text-white"><Shield size={16} /></div>
            <span className="font-bold text-base tracking-tight">Glow Core Control</span>
          </div>
          <nav className="space-y-1 mt-14 md:mt-0">
            <button 
              type="button"
              onClick={() => { setActiveTab('products'); setIsMobileMenuOpen(false); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-colors ${activeTab === 'products' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <PlusCircle size={18} /> Add New Product
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-colors ${activeTab === 'orders' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <Package size={18} /> Order Sync Log
            </button>
          </nav>
        </div>
        <button onClick={() => setIsAdminLoggedIn(false)} className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-lg text-sm w-full mt-6"><LogOut size={18} /> Exit Console</button>
      </aside>

      {/* Drawer Overlay for Mobile Screen Dimming */}
      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/20 z-30 md:hidden" />
      )}

      {/* CORE DISPLAY WINDOW VIEWPORTS */}
      <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-5xl w-full mx-auto overflow-x-hidden">
        
        {successMsg && <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-medium mb-6">{successMsg}</div>}
        {errorMsg && <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm font-medium mb-6">{errorMsg}</div>}

        {/* CONDITION 1: INVENTORY TAB ENGINE RENDER */}
        {activeTab === 'products' && (
          <>
            <header className="mb-6 md:mb-8">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Marketplace Inventory Control</h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">Inject dynamic product metadata fields straight into your application cluster collections.</p>
            </header>

            <form onSubmit={handleCreateProduct} className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-8 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Product Title / Name</label>
                <input type="text" required placeholder="e.g., Hydra Glow Vitamin C Balm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Retail Price ($)</label>
                <input type="number" required placeholder="48" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Affiliate Commission Rate (%)</label>
                <input type="number" required placeholder="15" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Unique SKU Code</label>
                <input type="text" required placeholder="GLOW-BALM-01" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Initial Inventory Stock Count</label>
                <input type="number" required placeholder="100" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Target Landing Page Base URL</label>
                <input type="text" required placeholder="https://beauty-affiliate-app.onrender.com/product/LEAVE_BLANK_OR_ADD_BASE" value={formData.productUrl} onChange={e => setFormData({...formData, productUrl: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Display Image Cover URL</label>
                <input type="text" placeholder="https://images.unsplash.com/..." value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Highlights / Selling Badges (Comma Separated)</label>
                <input type="text" placeholder="100% Vegan, Cruelty Free, Paraben Free" value={formData.highlights} onChange={e => setFormData({...formData, highlights: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Marketing Copy Description</label>
                <textarea rows="4" required placeholder="Describe the high conversion metrics and formulation benefits..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none" />
              </div>

              <button type="submit" className="sm:col-span-2 w-full bg-neutral-950 hover:bg-black text-white font-bold text-sm tracking-wide py-3.5 rounded-xl transition-all shadow-md mt-2">Publish Item to Database</button>
            </form>
          </>
        )}

        {/* CONDITION 2: GOOGLE SHEET ORDER MANAGEMENT MATRIX VIEWPORT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">Order Synchronization Desk</h1>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">Cross-reference active creator pipelines and release balances.</p>
              </div>
              <button 
                type="button" onClick={fetchAllOrders} disabled={loadingOrders}
                className="flex items-center justify-center gap-1.5 bg-neutral-200/70 hover:bg-neutral-200 text-neutral-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 self-start sm:self-auto shrink-0"
              >
                <RefreshCw size={13} className={loadingOrders ? 'animate-spin' : ''} /> Sync Pipeline
              </button>
            </header>

            {/* LIVE METRICS TRACKER HUD ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-neutral-200 p-4 rounded-xl flex items-center gap-3 shadow-sm">
                <div className="p-2 bg-neutral-100 rounded-lg text-neutral-900"><ShoppingBag size={15}/></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Total Rows</span>
                  <span className="text-base font-black text-neutral-950">{totalOrders} Rows</span>
                </div>
              </div>
              <div className="bg-white border border-amber-200 p-4 rounded-xl flex items-center gap-3 shadow-sm bg-amber-50/5">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><Truck size={15}/></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">In Transit</span>
                  <span className="text-base font-black text-amber-600">{onWayCount} Packages</span>
                </div>
              </div>
              <div className="bg-white border border-emerald-200 p-4 rounded-xl flex items-center gap-3 shadow-sm bg-emerald-50/5">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 size={15}/></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Delivered Complete</span>
                  <span className="text-base font-black text-emerald-700">{deliveredCount} Cleared</span>
                </div>
              </div>
            </div>

            {/* MAIN FILTERABLE DATA SHEET OVERLAY */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
              
              {/* TOOLBAR */}
              <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-neutral-50/30">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="text" placeholder="Search customer, item, or code..." value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-black font-medium"
                  />
                </div>

                <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto overflow-x-auto">
                  {['All', 'On Way', 'Delivered'].map((filter) => (
                    <button
                      key={filter} type="button" onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${statusFilter === filter ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* SHEET MATRIX TABLE ENTRY CONTAINER */}
              {loadingOrders ? (
                <div className="p-12 text-center text-xs text-neutral-400 font-bold tracking-wide animate-pulse">Pulling live Google Sheet entries...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-400 font-semibold">No order rows matched your filter query.</div>
              ) : (
                <div className="w-full">
                  
                  {/* 📱 MOBILE CARDS GRID VIEW (Visible on small/tablet devices) */}
                  <div className="block lg:hidden divide-y divide-neutral-100">
                    {filteredOrders.map((order, idx) => {
                      const isDelivered = (order.deliveryStatus || 'On Way').toLowerCase() === 'delivered';
                      return (
                        <div key={idx} className="p-4 space-y-3 bg-white text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-neutral-950 text-sm leading-tight">{order.productName}</h4>
                              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {order.productId}</p>
                            </div>
                            <span className="font-black text-neutral-950 text-sm">${parseFloat(order.price).toFixed(2)}</span>
                          </div>

                          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 space-y-1 text-neutral-600">
                            <p><b>Customer:</b> {order.customerName}</p>
                            <p className="font-mono text-[11px] text-neutral-500">{order.customerEmail}</p>
                            <p className="text-neutral-500 text-[11px] pt-1 border-t border-neutral-200/40 mt-1"><b>Address:</b> {order.shippingAddress}</p>
                          </div>

                          <div className="flex justify-between items-center gap-2 pt-1">
                            <span className="bg-neutral-100 text-neutral-800 font-mono font-bold px-2 py-0.5 rounded text-[10px] border">
                              Code: {order.referralCode}
                            </span>
                            {isDelivered ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 size={12}/> Complete
                              </span>
                            ) : (
                              <button
                                type="button" onClick={() => handleMarkAsDelivered(order, idx)} disabled={updatingId !== null}
                                className="bg-black hover:bg-neutral-900 text-white font-bold px-3 py-1.5 rounded-xl transition-all text-[11px] disabled:opacity-40 shadow-sm"
                              >
                                {updatingId === idx ? 'Syncing...' : 'Mark Delivered'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 🖥️ DESKTOP MASTER TABLE VIEW (Visible on desktop screens) */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
                          <th className="px-6 py-4">Customer Info</th>
                          <th className="px-6 py-4">Item Details</th>
                          <th className="px-6 py-4">Tracking Code</th>
                          <th className="px-6 py-4">Volume</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-xs">
                        {filteredOrders.map((order, idx) => {
                          const isDelivered = (order.deliveryStatus || 'On Way').toLowerCase() === 'delivered';
                          return (
                            <tr key={idx} className="hover:bg-neutral-50/30 transition-colors">
                              <td className="px-6 py-4 max-w-[220px]">
                                <div className="font-bold text-neutral-950">{order.customerName}</div>
                                <div className="text-neutral-400 text-[11px] font-mono mt-0.5">{order.customerEmail}</div>
                                <div className="text-neutral-500 text-[11px] truncate mt-1" title={order.shippingAddress}>{order.shippingAddress}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-semibold text-neutral-900 leading-tight">{order.productName}</div>
                                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {order.productId}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="bg-neutral-100 text-neutral-800 font-mono font-bold px-2 py-0.5 rounded text-[11px] border">
                                  {order.referralCode}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-black text-neutral-950">${parseFloat(order.price).toFixed(2)}</td>
                              <td className="px-6 py-4 text-right">
                                {isDelivered ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                                    <CheckCircle2 size={12}/> Complete
                                  </span>
                                ) : (
                                  <button
                                    type="button" onClick={() => handleMarkAsDelivered(order, idx)} disabled={updatingId !== null}
                                    className="bg-black hover:bg-neutral-900 text-white font-bold px-3 py-1.5 rounded-xl transition-all text-[11px] inline-flex items-center gap-1 shadow-sm disabled:opacity-40"
                                  >
                                    {updatingId === idx ? 'Syncing...' : 'Mark Delivered'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}