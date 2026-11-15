import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, LayoutDashboard, Link2, LogOut, LockKeyhole, Mail, Store, UserRound, Users, Wallet } from 'lucide-react';
import MarketplaceTab from './MarketplaceTab.jsx';
import PayoutsTab from './PayoutsTab.jsx';
import AnalyticsTab from './AnalyticsTab.jsx';
import SmartlinksTab from './SmartlinksTab.jsx';
import TeamTab from './TeamTab.jsx';
import TeamProfileTab from './TeamProfileTab.jsx';
import SmartlinkAssignmentModal from './SmartlinkAssignmentModal.jsx';

const emptySummary = { lockedBalance: 0, pendingClearance: 0, availableBalance: 0, totalPaid: 0, totalEarned: 0 };

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [applicationMessage, setApplicationMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [showProfileSmartlink, setShowProfileSmartlink] = useState(false);
  const [affiliate, setAffiliate] = useState({ name: '', email: '', affiliateCode: '', totalClicks: 0 });
  const [summary, setSummary] = useState(emptySummary);

  const fetchDashboardData = useCallback(async (token) => {
    try {
      const response = await axios.get('/api/affiliates/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      setAffiliate(response.data);
      setIsLoggedIn(true);
    } catch {
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setErrorMessage('Your session expired. Please sign in again.');
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await axios.get('/api/affiliates/summary', { headers: { Authorization: `Bearer ${token}` } });
      setSummary(response.data);
    } catch (error) {
      console.error('Could not load commission summary:', error.message);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/saas-products', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setProducts(response.data);
    } catch (error) {
      console.error('Could not load SaaS marketplace:', error.message);
      setProducts([]);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setTeamLoading(true);
    try {
      const response = await axios.get('/api/affiliates/team', { headers: { Authorization: `Bearer ${token}` } });
      setTeamMembers(response.data.items || []);
      setTeamError('');
    } catch (error) {
      setTeamError(error.response?.data?.message || 'Could not load your team.');
    } finally { setTeamLoading(false); }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) fetchDashboardData(token);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if ((activeTab === 'dashboard' || activeTab === 'payouts') && affiliate.permissions?.canViewEarnings !== false) fetchSummary();
    if (activeTab === 'marketplace' || activeTab === 'smartlinks' || (activeTab === 'team' && affiliate.permissions?.canCreateSmartlinks) || (activeTab === 'dashboard' && affiliate.role === 'team_member' && affiliate.permissions?.canCreateSmartlinks) || activeTab === 'profile') fetchProducts();
    if (activeTab === 'team' || (activeTab === 'smartlinks' && (affiliate.role !== 'team_member' || affiliate.permissions?.canManageTeam))) fetchTeamMembers();
  }, [isLoggedIn, activeTab, fetchProducts, fetchSummary, fetchTeamMembers, affiliate.role, affiliate.permissions]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setApplicationMessage('');
    try {
      const isSignup = authMode === 'signup';
      const response = isSignup
        ? await axios.post('/api/auth/register', { name, email, password })
        : await axios.post('/api/auth/login', { email, password });
      if (response.data.requiresApproval) {
        setApplicationMessage(response.data.message || 'Your affiliate application is pending admin approval.');
        setAuthMode('login');
        setPassword('');
        return;
      }
      localStorage.setItem('token', response.data.token);
      await fetchDashboardData(response.data.token);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setActiveTab('dashboard');
    setSummary(emptySummary);
    setAffiliate({ name: '', email: '', affiliateCode: '', totalClicks: 0 });
    setTeamMembers([]);
    setTeamError('');
    setShowProfileSmartlink(false);
  };

  const role = affiliate.role || 'affiliate';
  const permissions = affiliate.permissions || { canViewOverview: true, canViewAnalytics: true, canCreateSmartlinks: true, canViewOwnSmartlinksOnly: false, canViewEarnings: true, canManageTeam: true, canRequestPayouts: true };
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, visible: role === 'affiliate' || permissions.canViewOverview },
    { id: 'marketplace', label: 'SaaS marketplace', icon: Store, visible: role === 'affiliate' },
    { id: 'analytics', label: 'SaaS analytics', icon: Activity, visible: role === 'affiliate' || permissions.canViewAnalytics },
      { id: 'smartlinks', label: 'Smartlinks', icon: Link2, visible: role === 'affiliate' || permissions.canViewAnalytics },
    { id: 'profile', label: 'My profile', icon: UserRound, visible: role === 'team_member' && permissions.canCreateSmartlinks },
    { id: 'team', label: 'My team', icon: Users, visible: role === 'affiliate' || permissions.canManageTeam },
    { id: 'payouts', label: 'Payouts', icon: Wallet, visible: role === 'affiliate' || permissions.canRequestPayouts },
  ].filter((item) => item.visible);

  useEffect(() => {
    if (isLoggedIn && navItems.length && !navItems.some((item) => item.id === activeTab)) setActiveTab(navItems[0].id);
  }, [isLoggedIn, activeTab, affiliate.role, affiliate.permissions]);

  if (!isLoggedIn) {
    return <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl overflow-hidden rounded-3xl border border-neutral-800 bg-white text-neutral-950 lg:grid-cols-2">
        <section className="hidden flex-col justify-between bg-neutral-950 p-10 text-white lg:flex">
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">GlowAffiliate SaaS</div>
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Partner platform</p><h1 className="max-w-md text-4xl font-light leading-tight">Build recurring income by sharing the software you trust.</h1></div>
          <p className="text-xs text-neutral-500">Locked referral rewards. Transparent commission ledger.</p>
        </section>
        <section className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Affiliate account</p><h2 className="mt-2 text-2xl font-bold">{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2></div>
            {applicationMessage && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{applicationMessage}</p>}
            {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</p>}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && <label className="block text-xs font-semibold text-neutral-600">Full name<input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm text-neutral-950 outline-none focus:border-neutral-500" placeholder="Your name" /></label>}
              <label className="block text-xs font-semibold text-neutral-600">Email<div className="relative mt-1.5"><Mail size={16} className="absolute left-3 top-3.5 text-neutral-400" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="w-full rounded-xl border border-neutral-200 py-3 pl-9 pr-3 text-sm text-neutral-950 outline-none focus:border-neutral-500" placeholder="you@example.com" /></div></label>
              <label className="block text-xs font-semibold text-neutral-600">Password<div className="relative mt-1.5"><LockKeyhole size={16} className="absolute left-3 top-3.5 text-neutral-400" /><input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} className="w-full rounded-xl border border-neutral-200 py-3 pl-9 pr-3 text-sm text-neutral-950 outline-none focus:border-neutral-500" placeholder="At least 8 characters" /></div></label>
              <button disabled={loading} className="w-full rounded-xl bg-neutral-950 py-3 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50">{loading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button>
            </form>
            <p className="mt-6 text-center text-sm text-neutral-500">{authMode === 'login' ? 'New to the platform?' : 'Already registered?'} <button onClick={() => { setErrorMessage(''); setApplicationMessage(''); setAuthMode(authMode === 'login' ? 'signup' : 'login'); }} className="font-bold text-neutral-950 underline underline-offset-2">{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
          </div>
        </section>
      </div>
    </main>;
  }

  return <div className="min-h-screen bg-[#f7f7f5] text-neutral-950 md:flex">
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r md:p-6">
      <div className="mb-5 flex items-center justify-between md:mb-10"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">GlowAffiliate</div><div className="mt-1 text-sm font-semibold">Partner workspace</div></div><button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 md:hidden"><LogOut size={15} /> Sign out</button></div>
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-1">{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${activeTab === id ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}><Icon size={17} />{label}</button>)}</nav>
      <button onClick={handleLogout} className="mt-auto hidden items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 md:flex"><LogOut size={17} /> Sign out</button>
    </aside>

    <main className="mx-auto w-full max-w-7xl p-4 sm:p-7 lg:p-10">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">{navItems.find((item) => item.id === activeTab)?.label}</p><h1 className="mt-1 text-2xl font-bold">Hello, {affiliate.name || 'Creator'}</h1></div>
        <div className="flex flex-wrap items-center gap-2">{role === 'team_member' && <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">Logged in as Team Member</span>}<div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{role === 'team_member' ? 'Your team tracking code' : 'Your referral code'}</span><span className="rounded-md bg-amber-50 px-2 py-1 font-mono text-xs font-bold text-amber-900">{role === 'team_member' ? `${affiliate.affiliateCode}.${affiliate.subAffiliateCode}` : affiliate.affiliateCode}</span></div></div>
      </header>

      {!navItems.length && <section className="rounded-2xl border border-neutral-200 bg-white p-8 text-center"><h2 className="font-bold">No dashboard sections are enabled</h2><p className="mt-2 text-sm text-neutral-500">Ask your team lead to grant access to a dashboard section.</p></section>}

      {activeTab === 'dashboard' && (role === 'affiliate' || permissions.canViewOverview) && <>
        {permissions.canViewEarnings ? <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <BalanceCard title="Locked balance" amount={summary.lockedBalance} detail="Unlocks automatically when your referred users purchase a paid plan." tone="amber" />
          <BalanceCard title="Pending clearance" amount={summary.pendingClearance} detail="Waiting for the SaaS product's refund holding period to finish." tone="blue" />
          <BalanceCard title="Available to withdraw" amount={summary.availableBalance} detail="Available commissions, less withdrawal requests awaiting approval." tone="green" />
        </section> : <section className="mb-6 grid gap-4 sm:grid-cols-3"><CountCard title="Clicks" value={affiliate.totalClicks} /><CountCard title="Signups" value={affiliate.stats?.signups} /><CountCard title="Conversions" value={affiliate.stats?.conversions} /></section>}
      </>}
      {activeTab === 'marketplace' && <MarketplaceTab products={products} affiliateCode={affiliate.affiliateCode} />}
      {activeTab === 'analytics' && <AnalyticsTab token={localStorage.getItem('token')} canViewEarnings={permissions.canViewEarnings} />}
      {activeTab === 'smartlinks' && <SmartlinksTab token={localStorage.getItem('token')} canViewEarnings={permissions.canViewEarnings} canFilterTeam={role === 'affiliate' || !permissions.canViewOwnSmartlinksOnly} />}
      {activeTab === 'profile' && role === 'team_member' && <TeamProfileTab token={localStorage.getItem('token')} profile={affiliate} products={products} />}
      {activeTab === 'team' && <TeamTab token={localStorage.getItem('token')} members={teamMembers} loading={teamLoading} error={teamError} onRefresh={fetchTeamMembers} products={products} isAffiliate={role === 'affiliate'} currentPermissions={permissions} canViewEarnings={permissions.canViewEarnings} />}
      {activeTab === 'payouts' && <PayoutsTab summary={summary} onSummaryUpdate={setSummary} />}
      {showProfileSmartlink && role === 'team_member' && <SmartlinkAssignmentModal token={localStorage.getItem('token')} products={products} teamMemberId={affiliate.id} teamMemberName={affiliate.name} onClose={() => setShowProfileSmartlink(false)} />}
    </main>
  </div>;
}

function BalanceCard({ title, amount, detail, tone }) {
  const tones = { amber: 'bg-amber-50 text-amber-800', blue: 'bg-blue-50 text-blue-800', green: 'bg-emerald-50 text-emerald-800' };
  return <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</p>{tone === 'amber' && <span title="Unlocks automatically when your referred users purchase a paid plan." className="cursor-help rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">Locked</span>}</div>
    <p className="mt-3 text-3xl font-black">${Number(amount || 0).toFixed(2)}</p>
    <p className={`mt-3 rounded-lg px-2.5 py-2 text-xs ${tones[tone]}`}>{detail}</p>
  </article>;
}

function CountCard({ title, value }) {
  return <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</p><p className="mt-3 text-3xl font-black">{Number(value || 0).toLocaleString()}</p></article>;
}
