import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days) => {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
};
const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });
const money = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export default function SmartlinksTab({ token, canViewEarnings = true, canFilterTeam = true }) {
  const [filters, setFilters] = useState({ startDate: daysAgo(29), endDate: today(), saasProductId: 'all', teamMemberId: 'all' });
  const [range, setRange] = useState('30');
  const [sort, setSort] = useState({ sortBy: 'clicks', sortOrder: 'desc' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => ({ ...filters, ...sort, page, limit: 10 }), [filters, sort, page]);
  const loadPerformance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/affiliates/smartlinks/performance', { params, headers: authHeaders(token) });
      setData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load smartlink performance.');
    } finally { setLoading(false); }
  }, [params, token]);
  useEffect(() => { loadPerformance(); }, [loadPerformance]);

  const setQuickRange = (value) => {
    setRange(value);
    if (value === 'custom') return;
    const startDate = value === '7' ? daysAgo(6) : daysAgo(29);
    setPage(1);
    setFilters((current) => ({ ...current, startDate, endDate: today() }));
  };
  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const toggleSort = (sortBy) => {
    setPage(1);
    setSort((current) => ({ sortBy, sortOrder: current.sortBy === sortBy && current.sortOrder === 'desc' ? 'asc' : 'desc' }));
  };
  const summary = data?.summary || {};
  const rows = data?.items || [];
  const totalPages = Math.max(1, data?.totalPages || 0);

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Smartlink performance</h2><p className="mt-1 text-sm text-neutral-500">Compare campaign traffic and conversions. Link assignment is managed from team profiles.</p></div><button onClick={loadPerformance} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold text-neutral-500">Date range<select value={range} onChange={(event) => setQuickRange(event.target.value)} className="mt-1 block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-neutral-900"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="custom">Custom range</option></select></label>
        <label className="text-xs font-semibold text-neutral-500">SaaS product<select value={filters.saasProductId} onChange={(event) => updateFilter('saasProductId', event.target.value)} className="mt-1 block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-neutral-900"><option value="all">All products</option>{(data?.products || []).map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-neutral-500">Team member<select disabled={!canFilterTeam} value={data?.filters?.teamMemberId || filters.teamMemberId} onChange={(event) => updateFilter('teamMemberId', event.target.value)} className="mt-1 block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-neutral-900 disabled:bg-neutral-50"><option value="all">All team members</option>{(data?.teamMembers || []).map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-neutral-500">Start date<input type="date" value={filters.startDate} onChange={(event) => { setRange('custom'); updateFilter('startDate', event.target.value); }} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm text-neutral-900" /></label>
        <label className="text-xs font-semibold text-neutral-500">End date<input type="date" value={filters.endDate} onChange={(event) => { setRange('custom'); updateFilter('endDate', event.target.value); }} className="mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm text-neutral-900" /></label>
      </div>
    </section>

    {error && <p role="alert" className="break-all rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

    <section className={`grid gap-4 sm:grid-cols-2 ${canViewEarnings ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}>
      <Metric title="Clicks" value={loading ? '—' : summary.totalClicks || 0} />
      <Metric title="Unique visitors" value={loading ? '—' : summary.uniqueVisitors || 0} />
      <Metric title="Signups" value={loading ? '—' : summary.totalSignups || 0} />
      <Metric title="Conversions" value={loading ? '—' : summary.totalConversions || 0} />
      <Metric title="Conversion rate" value={loading ? '—' : `${Number(summary.conversionRate || 0).toFixed(2)}%`} />
      {canViewEarnings && <Metric title="Total earnings" value={loading ? '—' : money(summary.totalEarnings)} />}
    </section>

    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5"><div><h3 className="font-bold">Campaign performance</h3><p className="mt-1 text-xs text-neutral-500">{data?.total || 0} smartlinks in this view</p></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500"><tr>
          <th className="px-4 py-3"><SortButton label="Smartlink" active={sort.sortBy === 'name'} onClick={() => toggleSort('name')} /></th><th className="px-4 py-3">Team member</th>
          <th className="px-4 py-3 text-right"><SortButton label="Clicks" active={sort.sortBy === 'clicks'} onClick={() => toggleSort('clicks')} /></th><th className="px-4 py-3 text-right"><SortButton label="Signups" active={sort.sortBy === 'signups'} onClick={() => toggleSort('signups')} /></th><th className="px-4 py-3 text-right"><SortButton label="Conversions" active={sort.sortBy === 'conversions'} onClick={() => toggleSort('conversions')} /></th><th className="px-4 py-3 text-right"><SortButton label="Conversion rate" active={sort.sortBy === 'conversionRate'} onClick={() => toggleSort('conversionRate')} /></th>{canViewEarnings && <th className="px-4 py-3 text-right"><SortButton label="Earnings" active={sort.sortBy === 'totalEarnings'} onClick={() => toggleSort('totalEarnings')} /></th>}
        </tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {!loading && rows.map((row) => <tr key={row._id} className="hover:bg-neutral-50"><td className="px-4 py-4"><span className="block font-semibold">{row.name}</span><span className="mt-1 block font-mono text-[10px] text-neutral-400">/s/{row.code}</span></td><td className="px-4 py-4">{row.teamMember}</td><td className="px-4 py-4 text-right">{row.clicks}</td><td className="px-4 py-4 text-right">{row.signups}</td><td className="px-4 py-4 text-right">{row.conversions}</td><td className="px-4 py-4 text-right">{Number(row.conversionRate || 0).toFixed(2)}%</td>{canViewEarnings && <td className="px-4 py-4 text-right font-semibold">{money(row.totalEarnings)}</td>}</tr>)}
          {!loading && rows.length === 0 && <tr><td colSpan={canViewEarnings ? 7 : 6} className="px-5 py-12 text-center text-neutral-500">No smartlinks match these filters.</td></tr>}
          {loading && <tr><td colSpan={canViewEarnings ? 7 : 6} className="px-5 py-12 text-center text-neutral-500">Loading performance…</td></tr>}
        </tbody>
      </table></div>
      <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm"><span className="text-neutral-500">Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 font-medium disabled:opacity-40">Previous</button><button disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 font-medium disabled:opacity-40">Next</button></div></div>
    </section>
  </div>;
}

function Metric({ title, value }) { return <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</p><p className="mt-3 text-3xl font-black">{value}</p></article>; }
function SortButton({ label, active, onClick }) { return <button onClick={onClick} className={`font-bold uppercase tracking-wider ${active ? 'text-neutral-950' : 'text-neutral-500'}`}>{label} {active ? '↕' : ''}</button>; }
