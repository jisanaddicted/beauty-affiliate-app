import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const statusStyles = {
  'Signed Up - Locked': 'bg-amber-50 text-amber-800',
  'Subscribed - Pending Clearance': 'bg-blue-50 text-blue-800',
  Available: 'bg-emerald-50 text-emerald-800',
  Paid: 'bg-neutral-100 text-neutral-700',
};

export default function ReferralActivity({ token }) {
  const [data, setData] = useState({ items: [], page: 1, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get(`/api/affiliates/activity?page=${page}&limit=10`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => { if (!cancelled) { setData(response.data); setError(''); } })
      .catch((requestError) => { if (!cancelled) setError(requestError.response?.data?.message || 'Could not load referral activity.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, token]);

  return <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
    <div className="border-b px-5 py-4"><h2 className="font-bold text-neutral-950">Referral & commission activity</h2><p className="mt-1 text-xs text-neutral-500">SaaS referrals and ledger commissions</p></div>
    {error && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500"><tr><th className="px-5 py-3">Referred user</th><th className="px-5 py-3">SaaS product</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Earned</th><th className="px-5 py-3">Date / unlock</th></tr></thead>
        <tbody className="divide-y divide-neutral-100">
          {loading ? <tr><td colSpan="5" className="px-5 py-10 text-center text-neutral-500">Loading activity…</td></tr>
            : data.items.length ? data.items.map((item) => <tr key={item.id}>
              <td className="px-5 py-4 font-mono text-xs">{item.referredUserId}</td>
              <td className="px-5 py-4 font-medium">{item.saasProduct}</td>
              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[item.status] || 'bg-neutral-100 text-neutral-700'}`}>{item.status}</span></td>
              <td className="px-5 py-4 font-bold">${Number(item.earnedAmount).toFixed(2)}</td>
              <td className="px-5 py-4 text-xs text-neutral-500"><div>{new Date(item.createdAt).toLocaleDateString()}</div>{item.unlocksAt && <div className="mt-1">Unlocks {new Date(item.unlocksAt).toLocaleString()}</div>}</td>
            </tr>)
            : <tr><td colSpan="5" className="px-5 py-10 text-center text-neutral-500">No referrals yet. Share a marketplace link to get started.</td></tr>}
        </tbody>
      </table>
    </div>
    <footer className="flex items-center justify-between border-t px-5 py-3 text-xs text-neutral-500">
      <span>{data.total} referral{data.total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-md border p-1.5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={15} /></button><span>Page {data.page || page} of {Math.max(1, data.totalPages)}</span><button disabled={page >= data.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-md border p-1.5 disabled:opacity-40" aria-label="Next page"><ChevronRight size={15} /></button></div>
    </footer>
  </section>;
}
