import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutDashboard, ShoppingBag, Wallet, User, DollarSign, Clock, TrendingUp, LogOut, Mail, Lock, Eye, EyeOff, Sparkles, Tag, Link2, Copy, Check } from 'lucide-react';

export default function App() {
  // Authentication & View States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'products'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Form input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userCode, setUserCode] = useState('');

  // Products array state
  const [products, setProducts] = useState([]);

  // Dynamic profile status state
  const [affiliate, setAffiliate] = useState({
    name: "",
    email: "",
    affiliateCode: "",
    balance: { pendingBalance: 0, withdrawableBalance: 0, totalEarned: 0 }
  });

  // 🔄 CHECK FOR EXISTING SESSION ON LOAD
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchDashboardData(token);
    }
  }, []);

  // 🛍️ FETCH ALL MARKETPLACE PRODUCTS AFTER LOGIN
  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
    }
  }, [isLoggedIn]);

  const fetchDashboardData = async (token) => {
    try {
      const response = await axios.get('http://localhost:5000/api/affiliates/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAffiliate(response.data);
      setIsLoggedIn(true);
    } catch (err) {
      localStorage.removeItem('token');
      setIsLoggedIn(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data);
    } catch (err) {
      console.warn("Backend products endpoint error. Using fallback placeholder.");
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
        const token = loginResponse.data.token;
        localStorage.setItem('token', token);
        await fetchDashboardData(token);
      } else {
        const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        const token = response.data.token;
        localStorage.setItem('token', token);
        await fetchDashboardData(token);
      }
    } catch (err) {
      console.error("Full Backend Error Details:", err.response?.data);
      setErrorMessage(err.response?.data?.message || 'Authentication failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setActiveTab('dashboard');
    setName('');
    setEmail('');
    setPassword('');
    setUserCode('');
    setErrorMessage('');
  };

  const handleCopyLink = (product) => {
    // 🔗 Reads your specific URL field from the database entry
    const targetBaseUrl = product.productUrl || "https://your-shopify-store.com/products/default";
    const dynamicReferralLink = `${targetBaseUrl}?ref=${affiliate.affiliateCode}`;
    
    navigator.clipboard.writeText(dynamicReferralLink);
    setCopiedId(product._id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ==========================================
      RENDER BLOCK 1: AUTHENTICATION INTERFACE 
     ========================================== */
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
        
        {/* LEFT COLUMN: VISUAL BRANDING PANEL */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-neutral-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.15),transparent_50%)]" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="h-8 w-8 bg-white text-black flex items-center justify-center font-black rounded text-xs tracking-wider">B&F</div>
            <span className="font-bold tracking-tight text-sm uppercase">GlowAffiliate Studio</span>
          </div>
          <div className="max-w-md relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-xs text-amber-400 mb-6 font-medium">
              <Sparkles size={12} /> Beauty & Fashion Specialist Hub
            </div>
            <h2 className="text-4xl font-light tracking-tight leading-tight mb-4">
              Turn your aesthetic curation into <span className="font-serif italic text-amber-200">scalable revenue</span>.
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Join an elite network of digital creators tracking multi-tier storefront analytics, conversion loops, and automated payouts natively.
            </p>
          </div>
          <p className="text-xs text-neutral-600 relative z-10">&copy; 2026 GlowAffiliate Architecture.</p>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE FORM LAYOUT */}
        <div className="flex flex-col justify-center p-8 sm:p-16 lg:p-24 bg-white">
          <div className="w-full max-w-md mx-auto">
            
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {authMode === 'login' ? 'Sign in to your dashboard' : 'Create your creator account'}
              </h1>
              <p className="text-sm text-neutral-500 mt-2">
                {authMode === 'login' ? 'Welcome back! Enter your portal credentials.' : 'Start monetizing your traffic paths in under 2 minutes.'}
              </p>
            </div>

            {errorMessage && (
              <div className={`p-4 rounded-xl text-sm mb-4 font-medium ${errorMessage.includes('successfully') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Full Name</label>
                    <div className="relative">
                      <input 
                        type="text" required placeholder="e.g., Jisan Rahman" value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black bg-neutral-50/50"
                      />
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Desired Affiliate Code</label>
                    <div className="relative">
                      <input 
                        type="text" required placeholder="e.g., JISAN10, GLOWQUEEN" value={userCode}
                        onChange={(e) => setUserCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black bg-neutral-50/50 font-mono tracking-wide"
                      />
                      <Sparkles size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">Email Address</label>
                <div className="relative">
                  <input 
                    type="email" required placeholder="jisan@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black bg-neutral-50/50"
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">Password</label>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} required placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black bg-neutral-50/50"
                  />
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <button 
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" disabled={loading}
                className="w-full bg-neutral-950 hover:bg-black text-white py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all mt-2 disabled:opacity-50"
              >
                {loading ? 'Processing System Network...' : authMode === 'login' ? 'Access Dashboard' : 'Generate Creator Code'}
              </button>

            </form>

            <div className="text-center mt-6">
              <p className="text-sm text-neutral-500">
                {authMode === 'login' ? "Don't have an account? " : "Already tracking metrics? "}
                <button 
                  onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setErrorMessage(''); }}
                  className="font-bold text-neutral-900 hover:underline"
                >
                  {authMode === 'login' ? 'Register here' : 'Sign in'}
                </button>
              </p>
            </div>

          </div>
        </div>

      </div>
    );
  }

  /* ==========================================
      RENDER BLOCK 2: LIVE METRICS DASHBOARD
     ========================================== */
  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      
      {/* SIDEBAR NAVIGATION CONTROLS */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="h-9 w-9 bg-black flex items-center justify-center text-white font-bold rounded-lg tracking-wider text-sm">B&F</div>
            <span className="font-bold text-lg tracking-tight">GlowAffiliate</span>
          </div>
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg text-sm w-full text-left transition-all ${activeTab === 'dashboard' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('products')} 
              className={`flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg text-sm w-full text-left transition-all ${activeTab === 'products' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Tag size={18} /> Find Products
            </button>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 font-medium rounded-lg text-sm"><ShoppingBag size={18} /> Orders History</a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 font-medium rounded-lg text-sm"><Wallet size={18} /> Payouts</a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 font-medium rounded-lg text-sm"><User size={18} /> Settings</a>
          </nav>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-lg text-sm w-full"><LogOut size={18} /> Log Out</button>
      </aside>

      {/* MAIN VIEW COMPONENT GRID */}
      <main className="flex-1 p-10 max-w-7xl mx-auto w-full">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back, {affiliate.name} 👋</h1>
            <p className="text-sm text-gray-500 mt-1">Here is your boutique's referral performance overview today.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Your Code:</span>
            <span className="bg-amber-50 text-amber-800 font-mono font-bold px-2.5 py-1 rounded text-sm border border-amber-200/60">{affiliate.affiliateCode}</span>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          /* DASHBOARD ANALYTICS TRACKING OVERVIEW */
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Pending Balance</p>
                  <h3 className="text-3xl font-black tracking-tight text-gray-900">${Number(affiliate.balance?.pendingBalance || 0).toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100"><Clock size={20} /></div>
              </div>
              <p className="text-xs text-amber-600 font-medium mt-4">• Held safely during product return window</p>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Withdrawable Cash</p>
                  <h3 className="text-3xl font-black tracking-tight text-gray-900">${Number(affiliate.balance?.withdrawableBalance || 0).toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100"><DollarSign size={20} /></div>
              </div>
              <button className="mt-4 text-xs bg-gray-900 text-white px-3 py-1.5 font-semibold rounded-lg opacity-50 cursor-not-allowed" disabled>Request Payout</button>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Total Earnings</p>
                  <h3 className="text-3xl font-black tracking-tight text-gray-900">${Number(affiliate.balance?.totalEarned || 0).toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100"><TrendingUp size={20} /></div>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-4">All-time career revenue generated</p>
            </div>
          </section>
        ) : (
          /* PRODUCT CAMPAIGN MARKETPLACE VIEW */
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Affiliate Brand Marketplace</h2>
              <p className="text-sm text-gray-500 mt-1">Select highly curated items to promote on your social feeds and tracking channels.</p>
            </div>

            {products.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500">
                <Tag size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700">No storefront products found</p>
                <p className="text-xs text-gray-400 mt-1">Insert data records in MongoDB Compass to populate your hub grid.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {products.map((product) => (
                  <div key={product._id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-black transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 text-neutral-800 rounded-full">SKU: {product.sku || "N/A"}</span>
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                          Earn {product.commissionRate}%
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">{product.name}</h3>
                      <p className="text-sm font-medium text-gray-500 mb-4">Retail Price: <span className="text-gray-900 font-bold">${product.price}</span></p>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-2">
                      <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-3 flex justify-between items-center gap-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Link2 size={14} className="text-gray-400 shrink-0" />
                          <span className="text-xs font-mono text-gray-400 truncate select-all">
                            {`${product.productUrl || 'https://store.com/product'}?ref=${affiliate.affiliateCode}`}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleCopyLink(product)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all shrink-0 ${copiedId === product._id ? 'bg-emerald-600 text-white' : 'bg-black text-white hover:bg-neutral-800'}`}
                        >
                          {copiedId === product._id ? (
                            <><Check size={12} /> Copied!</>
                          ) : (
                            <><Copy size={12} /> Copy Link</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}