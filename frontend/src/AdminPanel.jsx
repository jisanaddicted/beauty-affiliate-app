import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, Copy, LogOut, Plus, RefreshCw, Save, Shield, Trash2, UserCheck, Wallet } from 'lucide-react';

const emptyForm = () => ({
  name: '', slug: '', tagline: '', description: '', logoUrl: '', bannerUrl: '', destinationUrl: '',
  refParamKey: 'ref', cookieWindowDays: 30, signupBountyAmount: '0', requirePurchaseToUnlock: true,
  planTiers: [], holdingPeriodDays: 14, promoResources: '{}', status: 'active',
});

const asForm = (product) => ({
  name: product.name || '', slug: product.slug || '', tagline: product.tagline || '', description: product.description || '',
  logoUrl: product.logoUrl || '', bannerUrl: product.bannerUrl || '', destinationUrl: product.destinationUrl || '',
  refParamKey: product.refParamKey || 'ref', cookieWindowDays: product.cookieWindowDays ?? 30,
  signupBountyAmount: String(product.signupBountyAmount ?? 0), requirePurchaseToUnlock: product.requirePurchaseToUnlock !== false,
  planTiers: (product.planTiers || []).map((tier) => ({ ...tier, commissionValue: String(tier.commissionValue) })),
  holdingPeriodDays: product.holdingPeriodDays ?? 14,
  promoResources: JSON.stringify(product.promoResources ?? {}, null, 2), status: product.status || 'active',
});

export default function AdminPanel() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [affiliateData, setAffiliateData] = useState({ items: [], counts: {}, page: 1, totalPages: 1, total: 0 });
  const [affiliateStatus, setAffiliateStatus] = useState('pending');
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');

  const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
  const handleRequestError = (requestError) => {
    if ([401, 403].includes(requestError.response?.status)) {
      localStorage.removeItem('adminToken');
      setIsAdminLoggedIn(false);
    }
    setError(requestError.response?.data?.message || 'The request failed. Please try again.');
  };

  const loadProducts = async () => {
    try {
      const response = await axios.get('/api/admin/saas-products', authConfig());
      setProducts(response.data);
    } catch (requestError) { handleRequestError(requestError); }
  };

  const loadWithdrawals = async () => {
    try {
      const response = await axios.get('/api/admin/withdrawals?status=Pending', authConfig());
      setWithdrawals(response.data);
    } catch (requestError) { handleRequestError(requestError); }
  };

  const loadAffiliates = async (status = affiliateStatus, search = affiliateSearch, page = 1) => {
    try {
      const response = await axios.get('/api/admin/affiliates', { ...authConfig(), params: { status, search, page, limit: 25 } });
      setAffiliateData(response.data);
    } catch (requestError) { handleRequestError(requestError); }
  };

  const reviewAffiliate = async (affiliate, status) => {
    const rejectionReason = ['rejected', 'suspended'].includes(status)
      ? window.prompt(`Optional note for ${status === 'rejected' ? 'rejection' : 'suspension'}:`, affiliate.rejectionReason || '')
      : '';
    if (rejectionReason === null) return;
    setError('');
    setSuccess('');
    try {
      await axios.patch(`/api/admin/affiliates/${affiliate._id}/status`, { status, rejectionReason }, authConfig());
      setSuccess(`${affiliate.name}'s account is now ${status}.`);
      await loadAffiliates();
    } catch (requestError) { handleRequestError(requestError); }
  };

  useEffect(() => {
    setIsAdminLoggedIn(Boolean(localStorage.getItem('adminToken')));
  }, []);

  useEffect(() => {
    if (isAdminLoggedIn) {
      loadProducts();
      loadWithdrawals();
      loadAffiliates();
    }
  }, [isAdminLoggedIn]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    try {
      const response = await axios.post('/api/admin/login', { email, password });
      localStorage.setItem('adminToken', response.data.token);
      setIsAdminLoggedIn(true);
      setPassword('');
    } catch (requestError) {
      setLoginError(requestError.response?.data?.message || 'Admin sign-in failed.');
    }
  };

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateTier = (index, field, value) => setForm((current) => ({
    ...current,
    planTiers: current.planTiers.map((tier, tierIndex) => tierIndex === index ? { ...tier, [field]: value } : tier),
  }));

  const resetForm = () => { setForm(emptyForm()); setEditingId(''); setSelectedProduct(null); };

  const saveProduct = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    let promoResources;
    try { promoResources = JSON.parse(form.promoResources || '{}'); }
    catch { promoResources = form.promoResources; }

    const payload = {
      ...form,
      signupBountyAmount: Number(form.signupBountyAmount),
      cookieWindowDays: Number(form.cookieWindowDays),
      holdingPeriodDays: Number(form.holdingPeriodDays),
      planTiers: form.planTiers.filter((tier) => tier.planId && tier.planName).map((tier) => ({ ...tier, commissionValue: Number(tier.commissionValue) })),
      promoResources,
    };
    try {
      const response = editingId
        ? await axios.put(`/api/admin/saas-products/${editingId}`, payload, authConfig())
        : await axios.post('/api/admin/saas-products', payload, authConfig());
      setSelectedProduct(response.data);
      setSuccess(editingId ? 'SaaS product updated.' : 'SaaS product created. Copy the webhook secret into your SaaS backend.');
      setForm(asForm(response.data));
      setEditingId(response.data._id);
      await loadProducts();
    } catch (requestError) { handleRequestError(requestError); }
    finally { setSaving(false); }
  };

  const editProduct = (product) => {
    setSelectedProduct(product);
    setEditingId(product._id);
    setForm(asForm(product));
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyValue = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1500);
    } catch { setError('Clipboard access failed.'); }
  };

  const rotateSecret = async (product) => {
    if (!window.confirm(`Rotate the webhook secret for ${product.name}? The current secret will stop working immediately.`)) return;
    try {
      const response = await axios.post(`/api/admin/saas-products/${product._id}/rotate-webhook-secret`, {}, authConfig());
      const updated = { ...product, webhookSecret: response.data.webhookSecret };
      setSelectedProduct(updated);
      setProducts((current) => current.map((item) => item._id === product._id ? updated : item));
      setSuccess('Webhook secret rotated. Update the SaaS webhook configuration now.');
    } catch (requestError) { handleRequestError(requestError); }
  };

  const processWithdrawal = async (withdrawal, action) => {
    try {
      await axios.put(`/api/admin/withdrawals/${withdrawal._id}/${action}`, {}, authConfig());
      setSuccess(action === 'approve' ? 'Withdrawal approved and reserved commissions marked paid.' : 'Withdrawal rejected; reserved commissions are available again.');
      await loadWithdrawals();
    } catch (requestError) { handleRequestError(requestError); }
  };

  if (!isAdminLoggedIn) return <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
    <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-7 text-white">
      <div className="mb-6 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-amber-300"><Shield size={22} /></div><h1 className="text-xl font-bold">SaaS platform admin</h1><p className="mt-1 text-xs text-neutral-400">Sign in using the server-configured credentials.</p></div>
      {loginError && <p role="alert" className="mb-4 rounded-lg bg-red-950 p-3 text-xs text-red-300">{loginError}</p>}
      <label className="mb-4 block text-xs text-neutral-300">Admin email<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white" /></label>
      <label className="mb-5 block text-xs text-neutral-300">Admin password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-white" /></label>
      <button className="w-full rounded-lg bg-white py-3 text-sm font-bold text-neutral-950">Sign in</button>
    </form>
  </main>;

  return <div className="min-h-screen bg-neutral-100 text-neutral-950 md:flex">
    <aside className="flex w-full flex-col border-b bg-white p-4 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r md:p-5">
      <div className="mb-6 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">GlowAffiliate</div><h1 className="mt-1 font-bold">SaaS control</h1></div><button onClick={() => { localStorage.removeItem('adminToken'); setIsAdminLoggedIn(false); }} className="rounded-lg p-2 text-red-700 hover:bg-red-50" title="Sign out"><LogOut size={17} /></button></div>
      <nav className="grid grid-cols-2 gap-2 md:grid-cols-1"><button onClick={() => setActiveTab('products')} className={`rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${activeTab === 'products' ? 'bg-neutral-950 text-white' : 'hover:bg-neutral-100'}`}>SaaS products</button><button onClick={() => { setActiveTab('affiliates'); loadAffiliates(); }} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${activeTab === 'affiliates' ? 'bg-neutral-950 text-white' : 'hover:bg-neutral-100'}`}><UserCheck size={15} />Affiliates</button><button onClick={() => setActiveTab('withdrawals')} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${activeTab === 'withdrawals' ? 'bg-neutral-950 text-white' : 'hover:bg-neutral-100'}`}><Wallet size={15} />Payout requests</button></nav>
      <p className="mt-auto hidden pt-6 text-[10px] text-neutral-400 md:block">Secrets are displayed only in this authenticated admin session.</p>
    </aside>

    <main className="mx-auto w-full max-w-7xl p-4 sm:p-7">
      <header className="mb-6 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Platform administration</p><h2 className="mt-1 text-2xl font-bold">{activeTab === 'products' ? 'SaaS products' : activeTab === 'affiliates' ? 'Affiliate applications' : 'Available-balance payouts'}</h2></div><button onClick={() => { if (activeTab === 'products') loadProducts(); else if (activeTab === 'affiliates') loadAffiliates(); else loadWithdrawals(); }} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><RefreshCw size={14} />Refresh</button></header>
      {(error || success) && <div role="status" className={`mb-4 rounded-xl p-3 text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{error || success}</div>}

      {activeTab === 'affiliates' && <section className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['suspended', 'Suspended'], ['all', 'All']].map(([value, label]) => <button key={value} onClick={() => { setAffiliateStatus(value); loadAffiliates(value, affiliateSearch, 1); }} className={`rounded-xl border p-3 text-left ${affiliateStatus === value ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}><span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span><span className="mt-1 block text-xl font-black">{value === 'all' ? Object.values(affiliateData.counts).reduce((sum, count) => sum + count, 0) : affiliateData.counts[value] || 0}</span></button>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); loadAffiliates(affiliateStatus, affiliateSearch, 1); }} className="flex gap-2 rounded-xl border bg-white p-3"><input value={affiliateSearch} onChange={(event) => setAffiliateSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" placeholder="Search name, email, or referral code" /><button className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-bold text-white">Search</button></form>
        <div className="overflow-hidden rounded-xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-neutral-50 text-[10px] uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Affiliate</th><th className="px-4 py-3">Referral code</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Review note</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y">{affiliateData.items.map((affiliate) => <tr key={affiliate._id}><td className="px-4 py-4"><b>{affiliate.name}</b><span className="mt-1 block text-xs text-neutral-500">{affiliate.email}</span></td><td className="px-4 py-4 font-mono text-xs">{affiliate.affiliateCode}</td><td className="px-4 py-4 text-xs text-neutral-600">{new Date(affiliate.createdAt).toLocaleDateString()}</td><td className="px-4 py-4"><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold capitalize">{affiliate.status}</span>{affiliate.reviewedAt && <span className="mt-1 block text-[10px] text-neutral-400">Reviewed {new Date(affiliate.reviewedAt).toLocaleDateString()}</span>}</td><td className="max-w-56 px-4 py-4 text-xs text-neutral-600">{affiliate.rejectionReason || '—'}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-1">{affiliate.status !== 'approved' && <button onClick={() => reviewAffiliate(affiliate, 'approved')} className="rounded-lg bg-emerald-700 px-2.5 py-2 text-xs font-bold text-white">Approve</button>}{affiliate.status === 'pending' && <button onClick={() => reviewAffiliate(affiliate, 'rejected')} className="rounded-lg border border-red-200 px-2.5 py-2 text-xs font-bold text-red-700">Reject</button>}{affiliate.status === 'approved' && <button onClick={() => reviewAffiliate(affiliate, 'suspended')} className="rounded-lg border border-red-200 px-2.5 py-2 text-xs font-bold text-red-700">Suspend</button>}{affiliate.status !== 'pending' && <button onClick={() => reviewAffiliate(affiliate, 'pending')} className="rounded-lg border px-2.5 py-2 text-xs font-bold">Reset to pending</button>}</div></td></tr>)}{affiliateData.items.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-sm text-neutral-500">No affiliates match this filter.</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t px-4 py-3 text-xs"><span>{affiliateData.total} affiliate account(s) · Page {affiliateData.page} of {Math.max(1, affiliateData.totalPages)}</span><div className="flex gap-2"><button disabled={affiliateData.page <= 1} onClick={() => loadAffiliates(affiliateStatus, affiliateSearch, affiliateData.page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={affiliateData.page >= affiliateData.totalPages} onClick={() => loadAffiliates(affiliateStatus, affiliateSearch, affiliateData.page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div></div>
      </section>}

      {activeTab === 'products' && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <section className="rounded-2xl border bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold">{editingId ? 'Edit SaaS product' : 'Add SaaS product'}</h3><p className="mt-1 text-xs text-neutral-500">Set referral rewards, subscription tiers, and promo resources.</p></div>{editingId && <button onClick={resetForm} className="text-xs font-semibold text-neutral-500 underline">New product</button>}</div>
          <form onSubmit={saveProduct} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Product name" value={form.name} onChange={(value) => updateForm('name', value)} required /><Field label="URL slug" value={form.slug} onChange={(value) => updateForm('slug', value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))} required /><Field label="Tagline" value={form.tagline} onChange={(value) => updateForm('tagline', value)} /><Field label="Destination URL" value={form.destinationUrl} onChange={(value) => updateForm('destinationUrl', value)} type="url" required /><Field label="Logo URL" value={form.logoUrl} onChange={(value) => updateForm('logoUrl', value)} type="url" /><Field label="Banner URL" value={form.bannerUrl} onChange={(value) => updateForm('bannerUrl', value)} type="url" /></div>
            <label className="block text-xs font-semibold text-neutral-600">Description<textarea rows="3" value={form.description} onChange={(event) => updateForm('description', event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm" /></label>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Referral parameter key" value={form.refParamKey} onChange={(value) => updateForm('refParamKey', value)} required /><Field label="Cookie window (days)" type="number" min="0" value={form.cookieWindowDays} onChange={(value) => updateForm('cookieWindowDays', value)} /><Field label="Signup bounty" type="number" min="0" step="0.01" value={form.signupBountyAmount} onChange={(value) => updateForm('signupBountyAmount', value)} required /><Field label="Holding period (days)" type="number" min="0" value={form.holdingPeriodDays} onChange={(value) => updateForm('holdingPeriodDays', value)} /></div>
            <label className="flex items-center gap-2 text-xs font-medium text-neutral-700"><input type="checkbox" checked={form.requirePurchaseToUnlock} onChange={(event) => updateForm('requirePurchaseToUnlock', event.target.checked)} />Require a paid purchase to unlock signup bounty</label>

            <div className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><div><h4 className="text-sm font-bold">Plan commission tiers</h4><p className="mt-0.5 text-[11px] text-neutral-500">Fixed amount or percentage of amount paid.</p></div><button type="button" onClick={() => updateForm('planTiers', [...form.planTiers, { planId: '', planName: '', commissionType: 'fixed', commissionValue: '0' }])} className="inline-flex items-center gap-1 rounded-lg bg-neutral-950 px-2.5 py-2 text-[11px] font-bold text-white"><Plus size={13} />Add tier</button></div>
              {form.planTiers.length === 0 && <p className="text-xs text-neutral-400">No tiers configured.</p>}
              <div className="space-y-3">{form.planTiers.map((tier, index) => <div key={index} className="grid gap-2 rounded-lg bg-neutral-50 p-3 sm:grid-cols-[1fr_1fr_125px_120px_32px]">
                <Field label="Plan ID" value={tier.planId} onChange={(value) => updateTier(index, 'planId', value)} required />
                <Field label="Plan name" value={tier.planName} onChange={(value) => updateTier(index, 'planName', value)} required />
                <label className="text-[10px] font-semibold text-neutral-500">Commission type<select value={tier.commissionType} onChange={(event) => updateTier(index, 'commissionType', event.target.value)} className="mt-1 w-full rounded-md border bg-white px-2 py-2 text-xs"><option value="fixed">Fixed</option><option value="percentage">Percentage</option></select></label>
                <Field label={tier.commissionType === 'percentage' ? 'Percent' : 'Amount'} type="number" min="0" step="0.01" value={tier.commissionValue} onChange={(value) => updateTier(index, 'commissionValue', value)} required />
                <button type="button" onClick={() => updateForm('planTiers', form.planTiers.filter((_, tierIndex) => tierIndex !== index))} className="mt-4 h-8 rounded-md text-red-600 hover:bg-red-100" aria-label="Remove tier"><Trash2 size={15} /></button>
              </div>)}</div>
            </div>

            <label className="block text-xs font-semibold text-neutral-600">Promo resources (JSON)<textarea rows="5" value={form.promoResources} onChange={(event) => updateForm('promoResources', event.target.value)} placeholder={'{ "email": "Swipe copy...", "demo": "https://..." }'} className="mt-1.5 w-full rounded-lg border px-3 py-2 font-mono text-xs" /></label>
            <label className="block text-xs font-semibold text-neutral-600">Product status<select value={form.status} onChange={(event) => updateForm('status', event.target.value)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm"><option value="active">Active</option><option value="paused">Paused</option><option value="private">Private</option></select></label>
            <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={15} />{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create SaaS product'}</button>
          </form>
          {selectedProduct && <WebhookDetails product={selectedProduct} copied={copied} onCopy={copyValue} onRotate={rotateSecret} />}
        </section>

        <section className="space-y-3"><h3 className="font-bold">Configured products ({products.length})</h3>{products.length === 0 ? <div className="rounded-xl border bg-white p-5 text-sm text-neutral-500">No SaaS products created yet.</div> : products.map((product) => <article key={product._id} className="rounded-xl border bg-white p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h4 className="truncate font-bold">{product.name}</h4><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-bold uppercase">{product.status}</span></div><p className="mt-1 text-xs text-neutral-500">/{product.slug} · ${Number(product.signupBountyAmount).toFixed(2)} signup bounty</p><p className="mt-1 text-[11px] text-neutral-500">{product.planTiers?.length || 0} plan tier(s)</p></div><button onClick={() => editProduct(product)} className="shrink-0 rounded-lg border px-3 py-2 text-xs font-bold hover:bg-neutral-50">Edit & details</button></div>
        </article>)}</section>
      </div>}

      {activeTab === 'withdrawals' && <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b px-5 py-4"><h3 className="font-bold">Pending payout requests</h3><p className="mt-1 text-xs text-neutral-500">Approval marks the reserved available commission ledger entries as paid.</p></div>
        {withdrawals.length === 0 ? <p className="p-8 text-center text-sm text-neutral-500">No pending payout requests.</p> : <div className="divide-y">{withdrawals.map((withdrawal) => <article key={withdrawal._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h4 className="font-bold">{withdrawal.affiliateId?.name || 'Affiliate'} <span className="text-xs font-normal text-neutral-500">({withdrawal.affiliateId?.email || 'unknown'})</span></h4><p className="mt-1 text-sm">${Number(withdrawal.amount).toFixed(2)} via {withdrawal.method} ({withdrawal.accountType})</p><p className="mt-1 font-mono text-xs text-neutral-500">{withdrawal.accountNumber}</p><p className="mt-1 text-[11px] text-neutral-500">Available now: ${Number(withdrawal.availableBalance || 0).toFixed(2)} · {new Date(withdrawal.createdAt).toLocaleString()}</p></div>
          <div className="flex gap-2"><button onClick={() => processWithdrawal(withdrawal, 'reject')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Reject</button><button disabled={!withdrawal.commissionLedgerIds?.length} onClick={() => processWithdrawal(withdrawal, 'approve')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-40">Approve payout</button></div>
        </article>)}</div>}
      </section>}
    </main>
  </div>;
}

function Field({ label, value, onChange, type = 'text', min, step, required = false }) {
  return <label className="block text-[10px] font-semibold text-neutral-500">{label}<input required={required} type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border bg-white px-2.5 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-500" /></label>;
}

function WebhookDetails({ product, copied, onCopy, onRotate }) {
  const webhookUrl = `${window.location.origin}/api/webhooks/saas/${product.slug}`;
  return <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
    <div className="mb-3"><h4 className="text-sm font-bold">Webhook connection details</h4><p className="mt-1 text-[11px] text-neutral-600">Keep the secret on your SaaS server. Never expose it in browser code.</p></div>
    <CopyField label="Webhook endpoint" value={webhookUrl} copied={copied === `url-${product._id}`} onCopy={() => onCopy(`url-${product._id}`, webhookUrl)} />
    <CopyField label="Webhook secret" value={product.webhookSecret || ''} copied={copied === `secret-${product._id}`} onCopy={() => onCopy(`secret-${product._id}`, product.webhookSecret || '')} />
    <p className="mt-3 text-[11px] leading-5 text-neutral-600">For smartlink attribution, preserve the redirect's <code>sl</code> query value and send it as <code>smartlink_code</code> with the signup webhook. Pass the full <code>ref_code</code> value through unchanged; team links use <code>AFFILIATECODE.TEAMCODE</code>.</p>
    <button onClick={() => onRotate(product)} className="mt-3 text-[11px] font-bold text-red-700 underline">Rotate webhook secret</button>
  </section>;
}

function CopyField({ label, value, copied, onCopy }) {
  return <div className="mt-2"><label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{label}</label><div className="mt-1 flex gap-2"><input readOnly type="text" value={value} className="min-w-0 flex-1 rounded-lg border bg-white px-2.5 py-2 font-mono text-[10px]" /><button onClick={onCopy} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-neutral-950 px-2.5 text-[10px] font-bold text-white">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}</button></div></div>;
}
