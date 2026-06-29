import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutDashboard, ShoppingBag, Wallet, User, DollarSign, Clock, TrendingUp, LogOut, Mail, Lock, Eye, EyeOff, Sparkles, Tag, Link2, Copy, Check, Menu, X } from 'lucide-react';
import CreatorDashboard from './CreatorDashboard';
import PayoutsTab from './PayoutsTab';
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // NEW: Mobile Navigation Sidebar Drawer Toggle State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userCode, setUserCode] = useState('');
  const [products, setProducts] = useState([]);
  const [affiliate, setAffiliate] = useState({
    name: "",
    email: "",
    affiliateCode: "",
    balance: { pendingBalance: 0, withdrawableBalance: 0, totalEarned: 0 }
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) fetchDashboardData(token);
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchProducts();
  }, [isLoggedIn]);

  const fetchDashboardData = async (token) => {
    try {
      // 1. Fetch the base affiliate profile from your Node.js backend
      const response = await axios.get('http://localhost:5000/api/affiliates/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const affiliateData = response.data;
      const creatorCode = affiliateData.affiliateCode;

      if (creatorCode) {
        try {
          // 2. Fetch live sheet records from your Apps Script URL
          const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxj-tcfupCwXvdb4Mj26pzPmr51vyNMfUQnlSLHQZMU-tqeqYvn_0Fun0IrB-H7KxvLig/exec';
          const sheetResponse = await axios.get(`${GOOGLE_SHEET_URL}?ref=${creatorCode.trim()}`);

          if (sheetResponse.data.result === 'success') {
            const sheetOrders = sheetResponse.data.data;

            // 3. Calculate real-time revenues based on delivery status tags
            const pendingRevenue = sheetOrders
              .filter(order => (order.deliveryStatus || 'On Way').toLowerCase() === 'on way')
              .reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);

            const approvedRevenue = sheetOrders
              .filter(order => (order.deliveryStatus || '').toLowerCase() === 'delivered')
              .reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);

            // 4. Calculate 10% commission cuts
            const livePendingCommission = pendingRevenue * 0.10;
            const liveApprovedCommission = approvedRevenue * 0.10;

            // 5. Update data mapping: totalEarned now ONLY counts delivered orders
            affiliateData.balance = {
              ...affiliateData.balance,
              pendingBalance: livePendingCommission,
              withdrawableBalance: liveApprovedCommission - (affiliateData.balance.totalWithdrawn || 0),
              totalEarned: liveApprovedCommission // 💎 Only completed deliveries show up here now
            };
          }
        } catch (sheetErr) {
          console.error("Failed to sync real-time sheet metrics to main dashboard cards:", sheetErr);
        }
      }

      setAffiliate(affiliateData);
      setIsLoggedIn(true);
    } catch (err) {
      console.error(err);
      localStorage.removeItem('token');
      setIsLoggedIn(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data);
    } catch (err) {
      setProducts([]);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      if (authMode === 'signup') {
        await axios.post('http://localhost:5000/api/auth/register', { name, email, password, affiliateCode: userCode });
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        localStorage.setItem('token', loginResponse.data.token);
        await fetchDashboardData(loginResponse.data.token);
      } else {
        const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        localStorage.setItem('token', response.data.token);
        await fetchDashboardData(response.data.token);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setActiveTab('dashboard');
  };

  const handleCopyLink = (product) => {
    if (!product.productUrl) return;
    const baseUrl = product.productUrl.endsWith('/') ? product.productUrl : `${product.productUrl}/`;
    const fullTrackingLink = `${baseUrl}${product._id}?ref=${affiliate.affiliateCode}`;
    navigator.clipboard.writeText(fullTrackingLink);
    setCopiedId(product._id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
        <div className="hidden lg:flex flex-col justify-between p-12 bg-neutral-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.15),transparent_50%)]" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="h-8 w-8 bg-white text-black flex items-center justify-center font-black rounded text-xs">B&F</div>
            <span className="font-bold tracking-tight text-sm uppercase">GlowAffiliate Studio</span>
          </div>
          <div className="max-w-md relative z-10">
            <h2 className="text-4xl font-light tracking-tight leading-tight mb-4">
              Turn your aesthetic curation into <span className="font-serif italic text-amber-200">scalable revenue</span>.
            </h2>
          </div>
          <p className="text-xs text-neutral-600 relative z-10">&copy; 2026 GlowAffiliate.</p>
        </div>

        {/* AUTH COMPONENT PORTFOLIO (MOBILE OPTIMIZED PADDING) */}
        <div className="flex flex-col justify-center p-6 sm:p-16 lg:p-24 bg-white">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
                {authMode === 'login' ? 'Sign in to your dashboard' : 'Create your creator account'}
              </h1>
            </div>

            {errorMessage && <div className="p-4 rounded-xl text-xs bg-red-50 text-red-800 border border-red-100 mb-4">{errorMessage}</div>}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Full Name</label>
                    <input type="text" required placeholder="Jisan Rahman" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Desired Affiliate Code</label>
                    <input type="text" required placeholder="JISAN10" value={userCode} onChange={(e) => setUserCode(e.target.value.toUpperCase().replace(/\s+/g, ''))} className="w-full p-3 border rounded-xl text-sm font-mono" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Email</label>
                <input type="email" required placeholder="jisan@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Password</label>
                <input type={showPassword ? "text" : "password"} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-neutral-950 text-white py-3 rounded-xl text-sm font-semibold mt-2">
                {loading ? 'Processing...' : authMode === 'login' ? 'Access Dashboard' : 'Generate Code'}
              </button>
            </form>
            <div className="text-center mt-6">
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-xs font-bold text-neutral-900 underline">
                {authMode === 'login' ? 'Register here' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SHARED NAV LOGIC HELPERS FOR REUSE
  const NavLinks = () => (
    <>
      <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg text-sm w-full text-left transition-all ${activeTab === 'dashboard' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutDashboard size={18} /> Dashboard</button>
      <button onClick={() => { setActiveTab('products'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg text-sm w-full text-left transition-all ${activeTab === 'products' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Tag size={18} /> Find Products</button>
      <button onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg text-sm w-full text-left transition-all ${activeTab === 'orders' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}><ShoppingBag size={18} /> Orders History</button>
      <button onClick={() => { setActiveTab('payouts'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg text-sm w-full text-left transition-all ${activeTab === 'payouts' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Wallet size={18} /> Payouts</button>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAFA]">

      {/* MOBILE HEADER RESPONSIVE TOP BAR */}
      <header className="md:hidden w-full bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-black flex items-center justify-center text-white font-bold rounded text-xs">B&F</div>
          <span className="font-bold text-sm tracking-tight">GlowAffiliate</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 text-gray-600 hover:text-black focus:outline-none">
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* MOBILE DRAWER HUD OVERLAY */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-64 bg-white h-full p-6 flex flex-col justify-between shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="text-xs font-bold uppercase text-gray-400 tracking-wider">Navigation Menu</div>
              <nav className="space-y-1"><NavLinks /></nav>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-red-600 font-medium text-sm w-full"><LogOut size={18} /> Log Out</button>
          </aside>
        </div>
      )}

      {/* DESKTOP PERMANENT SIDEBAR VIEW */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col justify-between p-6 shrink-0 h-screen sticky top-0">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="h-9 w-9 bg-black flex items-center justify-center text-white font-bold rounded-lg text-sm">B&F</div>
            <span className="font-bold text-lg tracking-tight">GlowAffiliate</span>
          </div>
          <nav className="space-y-1"><NavLinks /></nav>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-lg text-sm w-full"><LogOut size={18} /> Log Out</button>
      </aside>

      {/* RE-ARCHITECTED FLEX CONTENT HOLDER */}
      <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
        {activeTab !== 'orders' && (
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-10">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back, {affiliate.name || 'Creator'} 👋</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Here is your referral performance overview today.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center justify-between sm:justify-start gap-3 shadow-sm self-stretch sm:self-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your Code:</span>
              <span className="bg-amber-50 text-amber-800 font-mono font-bold px-2 py-0.5 rounded text-xs border border-amber-200/60">{affiliate.affiliateCode || "N/A"}</span>
            </div>
          </header>
        )}

        {/* METRICS ROW (RESPONSIVE COLUMNS TRANSITION) */}
        {activeTab === 'dashboard' && (
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white border p-5 sm:p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Pending Balance</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900">${Number(affiliate.balance?.pendingBalance || 0).toFixed(2)}</h3>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><Clock size={18} /></div>
              </div>
            </div>

            <div className="bg-white border p-5 sm:p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Withdrawable Cash</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900">${Number(affiliate.balance?.withdrawableBalance || 0).toFixed(2)}</h3>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><DollarSign size={18} /></div>
              </div>
            </div>

            <div className="bg-white border p-5 sm:p-6 rounded-2xl shadow-sm sm:col-span-2 md:col-span-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Total Earnings</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900">${Number(affiliate.balance?.totalEarned || 0).toFixed(2)}</h3>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><TrendingUp size={18} /></div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'products' && (
          <section>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">Affiliate Brand Marketplace</h2>
              <p className="text-xs text-gray-500 mt-0.5">Promote highly curated items on your social channels.</p>
            </div>

            {products.length === 0 ? (
              <div className="bg-white border rounded-2xl p-8 text-center text-gray-400 text-xs font-medium">No marketplace products found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {products.map((product) => {
                  const cleanedBase = product.productUrl?.endsWith('/') ? product.productUrl : `${product.productUrl || ''}/`;
                  const previewLink = `${cleanedBase}${product._id}?ref=${affiliate.affiliateCode}`;
                  return (
                    <div key={product._id} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between hover:border-black transition-all">
                      <div>
                        <div className="w-full h-40 sm:h-44 bg-neutral-50 rounded-xl mb-3 overflow-hidden flex items-center justify-center relative border border-neutral-100">
                          {product.image || product.imageUrl ? (
                            <img src={product.image || product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Tag size={20} className="text-neutral-300" />
                          )}
                          <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 bg-white/90 rounded-full shadow-sm">SKU: {product.sku || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1">{product.name}</h3>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shrink-0">Earn {product.commissionRate}%</span>
                        </div>
                        <p className="text-xs font-medium text-gray-500 mb-3">Price: <span className="text-gray-900 font-bold">${product.price}</span></p>
                      </div>

                      <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                        <span className="text-[11px] font-mono text-gray-400 truncate bg-neutral-50 p-2 rounded-lg border border-neutral-200/40">{previewLink}</span>
                        <button onClick={() => handleCopyLink(product)} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${copiedId === product._id ? 'bg-emerald-600 text-white' : 'bg-black text-white'}`}>
                          {copiedId === product._id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'orders' && <CreatorDashboard defaultRefCode={affiliate.affiliateCode} />}
        {/* PLACE INSIDE YOUR APPS MAIN WRAPPER CONTAINER GRID SYSTEM */}
        {activeTab === 'payouts' && (
          <PayoutsTab
            affiliateBalance={affiliate.balance}
            onBalanceUpdate={(updatedBalance) => setAffiliate({ ...affiliate, balance: updatedBalance })}
          />
        )}
      </main>
    </div>
  );
}