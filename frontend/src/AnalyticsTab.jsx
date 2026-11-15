import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Download, RefreshCw } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};
const initialFilters = { startDate: daysAgo(29), endDate: today(), saasProductId: 'all', status: 'all' };
const statusLabels = { locked: 'Locked', pending_maturation: 'Pending', available: 'Available', paid: 'Paid' };
const money = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export default function AnalyticsTab({ token, canViewEarnings = true }) {
  const [filters, setFilters] = useState(initialFilters);
  const [quickRange, setQuickRange] = useState('30');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ sortBy: 'timestamp', sortOrder: 'desc' });
  const [exporting, setExporting] = useState(false);

  const params = useMemo(() => ({ ...filters, ...sort, page, limit: 10 }), [filters, sort, page]);
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/affiliates/analytics', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [params, token]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const setRange = (value) => {
    setQuickRange(value);
    const endDate = today();
    if (value === 'custom') return;
    const startDate = value === '7' ? daysAgo(6) : value === '30' ? daysAgo(29) : (() => {
      const date = new Date();
      date.setDate(1);
      return date.toISOString().slice(0, 10);
    })();
    setPage(1);
    setFilters((current) => ({ ...current, startDate, endDate }));
  };

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleSort = (sortBy) => {
    setPage(1);
    setSort((current) => ({ sortBy, sortOrder: current.sortBy === sortBy && current.sortOrder === 'desc' ? 'asc' : 'desc' }));
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await axios.get('/api/affiliates/analytics/export', {
        params: { ...filters, ...sort },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(response.data);
      link.download = 'saas-analytics.csv';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch {
      setError('CSV export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const summary = data?.summary || {};
  const activity = data?.activity || { items: [], totalPages: 0, total: 0 };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold">SaaS analytics &amp; statistics</h2><p className="mt-1 text-sm text-neutral-500">Track link performance, referrals, upgrades, and commissions.</p></div>
        <button onClick={loadAnalytics} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold text-neutral-500">Date range<select value={quickRange} onChange={(event) => setRange(event.target.value)} className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">This month</option><option value="custom">Custom range</option></select></label>
        <label className="text-xs font-semibold text-neutral-500">SaaS product<select value={filters.saasProductId} onChange={(event) => updateFilter('saasProductId', event.target.value)} className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900"><option value="all">All products</option>{(data?.products || []).map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-neutral-500">Commission status<select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900"><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs font-semibold text-neutral-500">Start date<input type="date" value={filters.startDate} onChange={(event) => { setQuickRange('custom'); updateFilter('startDate', event.target.value); }} className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900" /></label>
        <label className="text-xs font-semibold text-neutral-500">End date<input type="date" value={filters.endDate} onChange={(event) => { setQuickRange('custom'); updateFilter('endDate', event.target.value); }} className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900" /></label>
      </div>
    </section>

    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Total clicks" value={loading ? '—' : summary.totalClicks ?? 0} detail="Tracked referral link visits" />
      <MetricCard title="Signups" value={loading ? '—' : summary.totalSignups ?? 0} detail={`${summary.totalConversions ?? 0} paid upgrades`} />
      <MetricCard title="Conversion rate" value={loading ? '—' : `${Number(summary.conversionRate || 0).toFixed(2)}%`} detail="Paid upgrades divided by signups" />
      {canViewEarnings ? <MetricCard title="Total earnings" value={loading ? '—' : money(summary.totalEarnings)} detail="Commissions in the selected period" /> : <MetricCard title="Conversions" value={loading ? '—' : summary.totalConversions ?? 0} detail="Paid upgrades from your referrals" />}
    </section>

    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-bold">Performance over time</h3><p className="mt-1 text-xs text-neutral-500">{data?.filters?.interval === 'week' ? 'Weekly' : 'Daily'} clicks and signups{canViewEarnings ? ', plus earnings' : ''}</p></div><div className="flex flex-wrap gap-3 text-xs text-neutral-500"><Legend color="bg-amber-500" label="Clicks" /><Legend color="bg-emerald-500" label="Signups" />{canViewEarnings && <Legend color="bg-blue-500" label="Earnings" />}</div></div>
      {loading ? <div className="h-52 animate-pulse rounded-xl bg-neutral-100" /> : <AnalyticsChart series={data?.series || []} showEarnings={canViewEarnings} />}
    </section>

    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5"><div><h3 className="font-bold">Referral &amp; commission activity</h3><p className="mt-1 text-xs text-neutral-500">{activity.total} matching commission events</p></div><button onClick={exportCsv} disabled={exporting || loading} className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"><Download size={15} />{exporting ? 'Exporting…' : 'Export CSV'}</button></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500"><tr><th className="px-5 py-3">Referred user</th><th className="px-5 py-3">SaaS product</th><th className="px-5 py-3"><SortButton label="Event" active={sort.sortBy === 'event'} onClick={() => toggleSort('event')} /></th><th className="px-5 py-3"><SortButton label="Status" active={sort.sortBy === 'status'} onClick={() => toggleSort('status')} /></th>{canViewEarnings && <th className="px-5 py-3 text-right"><SortButton label="Amount" active={sort.sortBy === 'amount'} onClick={() => toggleSort('amount')} /></th>}<th className="px-5 py-3"><SortButton label="Date" active={sort.sortBy === 'timestamp'} onClick={() => toggleSort('timestamp')} /></th></tr></thead>
          <tbody className="divide-y divide-neutral-100">{!loading && activity.items.map((row) => <tr key={row._id} className="hover:bg-neutral-50"><td className="px-5 py-3 font-mono text-xs">{row.referredUserId}</td><td className="px-5 py-3">{row.saasProduct}</td><td className="px-5 py-3">{row.type === 'plan_purchase' ? 'Plan purchase' : 'Signup bounty'}</td><td className="px-5 py-3"><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold">{statusLabels[row.status] || row.status}</span></td>{canViewEarnings && <td className="px-5 py-3 text-right font-semibold">{money(row.amount)}</td>}<td className="px-5 py-3 text-neutral-500">{row.timestamp ? new Date(row.timestamp).toLocaleDateString() : '—'}{row.unlocksAt && <span className="block text-xs">Unlocks {new Date(row.unlocksAt).toLocaleDateString()}</span>}</td></tr>)}
            {!loading && activity.items.length === 0 && <tr><td colSpan={canViewEarnings ? 6 : 5} className="px-5 py-12 text-center text-sm text-neutral-500">No commission activity matches these filters.</td></tr>}
            {loading && <tr><td colSpan={canViewEarnings ? 6 : 5} className="px-5 py-12 text-center text-neutral-500">Loading filtered activity…</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm"><span className="text-neutral-500">Page {activity.page || page} of {Math.max(activity.totalPages || 0, 1)}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 font-medium disabled:opacity-40">Previous</button><button disabled={page >= (activity.totalPages || 0) || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 font-medium disabled:opacity-40">Next</button></div></div>
    </section>
  </div>;
}

function MetricCard({ title, value, detail }) {
  return <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</p><p className="mt-3 text-3xl font-black">{value}</p><p className="mt-2 text-xs text-neutral-500">{detail}</p></article>;
}

function Legend({ color, label }) { return <span className="inline-flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>; }
function SortButton({ label, active, onClick }) { return <button onClick={onClick} className={`font-bold uppercase tracking-wider ${active ? 'text-neutral-950' : 'text-neutral-500'}`}>{label} {active ? '↕' : ''}</button>; }

function AnalyticsChart({ series, showEarnings }) {
  if (!series.length) return <div className="flex h-52 items-center justify-center text-sm text-neutral-400">No performance data for this date range.</div>;
  const maxActivity = Math.max(1, ...series.flatMap((row) => [row.clicks, row.signups]));
  const maxEarnings = Math.max(1, ...series.map((row) => row.earnings));
  const width = Math.max(640, series.length * 48);
  const chartHeight = 165;
  const points = series.map((row, index) => `${24 + index * ((width - 48) / Math.max(series.length - 1, 1))},${chartHeight - (row.earnings / maxEarnings) * (chartHeight - 12)}`).join(' ');
  const stride = Math.max(1, Math.ceil(series.length / 7));
  return <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} 215`} className="h-56 w-full min-w-[640px]" role="img" aria-label="Clicks, signups and earnings over time">
    {[0, 1, 2, 3].map((line) => <line key={line} x1="20" x2={width - 20} y1={18 + line * 46} y2={18 + line * 46} stroke="#e5e5e5" strokeDasharray="4 4" />)}
    {series.map((row, index) => {
      const slot = (width - 48) / series.length;
      const center = 24 + index * slot + slot / 2;
      const clicksHeight = (row.clicks / maxActivity) * 130;
      const signupsHeight = (row.signups / maxActivity) * 130;
      return <g key={row.date}><rect x={center - 10} y={chartHeight - clicksHeight} width="9" height={clicksHeight} rx="3" fill="#f59e0b"><title>{row.date}: {row.clicks} clicks</title></rect><rect x={center + 1} y={chartHeight - signupsHeight} width="9" height={signupsHeight} rx="3" fill="#10b981"><title>{row.date}: {row.signups} signups</title></rect>{index % stride === 0 && <text x={center} y="195" textAnchor="middle" fontSize="9" fill="#737373">{row.date.slice(5)}</text>}</g>;
    })}
    {showEarnings && <><polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    {series.map((row, index) => { const x = 24 + index * ((width - 48) / Math.max(series.length - 1, 1)); const y = chartHeight - (row.earnings / maxEarnings) * (chartHeight - 12); return <circle key={`${row.date}-earnings`} cx={x} cy={y} r="3" fill="#3b82f6"><title>{row.date}: {money(row.earnings)}</title></circle>; })}</>}
  </svg></div>;
}
