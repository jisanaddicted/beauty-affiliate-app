import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Check, Copy, Link2, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';

const headers = (token) => ({ Authorization: `Bearer ${token}` });
const emptyForm = { name: '', saasProductId: '', teamMemberId: '', destinationUrl: '' };

export default function SmartlinksTab({ token, products, teamMembers, defaultTeamMemberId, onClearDefault, canCreate }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/affiliates/smartlinks', { params: { search, limit: 50 }, headers: headers(token) });
      setItems(response.data.items || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load smartlinks.');
    } finally { setLoading(false); }
  }, [search, token]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => {
    if (!defaultTeamMemberId) return;
    setForm((current) => ({ ...current, teamMemberId: defaultTeamMemberId }));
    setEditItem(null);
    setModalOpen(true);
    onClearDefault?.();
  }, [defaultTeamMemberId, onClearDefault]);

  const openCreate = () => { setEditItem(null); setForm({ ...emptyForm, saasProductId: products[0]?._id || '', teamMemberId: '' }); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, saasProductId: item.saasProductId?._id || '', teamMemberId: item.assignedTeamMemberId?._id || '', destinationUrl: item.destinationUrl || '' });
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editItem) {
        await axios.put(`/api/affiliates/smartlinks/${editItem._id}`, { name: form.name, destinationUrl: form.destinationUrl, teamMemberId: form.teamMemberId || null }, { headers: headers(token) });
      } else {
        await axios.post('/api/affiliates/smartlinks', { name: form.name, saasProductId: form.saasProductId, teamMemberId: form.teamMemberId || undefined }, { headers: headers(token) });
      }
      setModalOpen(false);
      await loadItems();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save the smartlink.');
    } finally { setSaving(false); }
  };

  const toggleStatus = async (item) => {
    try {
      await axios.put(`/api/affiliates/smartlinks/${item._id}`, { status: item.status === 'active' ? 'paused' : 'active' }, { headers: headers(token) });
      await loadItems();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not update smartlink status.'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete campaign “${item.name}”?`)) return;
    try {
      await axios.delete(`/api/affiliates/smartlinks/${item._id}`, { headers: headers(token) });
      await loadItems();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not delete the smartlink.'); }
  };

  const copyLink = async (item) => {
    const url = new URL(`/s/${encodeURIComponent(item.code)}`, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(item._id);
      window.setTimeout(() => setCopied(''), 1600);
    } catch { setError(`Copy this link: ${url}`); }
  };

  return <div className="space-y-5">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div><h2 className="text-lg font-bold">Smartlinks</h2><p className="mt-1 text-sm text-neutral-500">Create campaign links, assign team members, and follow performance.</p></div>{canCreate && <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800"><Plus size={16} />Create smartlink</button>}</section>
    {error && <p role="alert" className="break-all rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 p-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaigns…" className="w-full max-w-sm rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-500" /></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500"><tr><th className="px-5 py-3">Campaign</th><th className="px-5 py-3">Target SaaS</th><th className="px-5 py-3">Short link</th><th className="px-5 py-3">Assigned member</th><th className="px-5 py-3 text-right">Clicks</th><th className="px-5 py-3 text-right">Conversions</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-neutral-100">
        {!loading && items.map((item) => <tr key={item._id} className="hover:bg-neutral-50"><td className="px-5 py-4 font-semibold">{item.name}</td><td className="px-5 py-4">{item.saasProductId?.name || 'Product unavailable'}</td><td className="px-5 py-4"><div className="flex items-center gap-2"><span className="max-w-[170px] truncate font-mono text-xs text-neutral-500">{new URL(`/s/${item.code}`, window.location.origin).toString()}</span><button onClick={() => copyLink(item)} title="Copy smartlink" className="rounded-md p-1.5 hover:bg-neutral-200">{copied === item._id ? <Check size={14} /> : <Copy size={14} />}</button></div></td><td className="px-5 py-4">{item.assignedTeamMemberId?.name || '—'}</td><td className="px-5 py-4 text-right">{item.stats?.clicks || 0}</td><td className="px-5 py-4 text-right">{item.stats?.conversions || 0}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{item.status}</span></td><td className="px-5 py-4"><div className="flex gap-1">{canCreate && <><button onClick={() => toggleStatus(item)} title={item.status === 'active' ? 'Pause' : 'Activate'} className="rounded-lg p-2 hover:bg-neutral-100">{item.status === 'active' ? <Pause size={15} /> : <Play size={15} />}</button><button onClick={() => openEdit(item)} title="Edit" className="rounded-lg p-2 hover:bg-neutral-100"><Pencil size={15} /></button><button onClick={() => remove(item)} title="Delete" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button></>}</div></td></tr>)}
        {!loading && items.length === 0 && <tr><td colSpan="8" className="px-5 py-12 text-center text-neutral-500">{search ? 'No matching campaigns found.' : 'You have not created a smartlink yet.'}</td></tr>}
        {loading && <tr><td colSpan="8" className="px-5 py-12 text-center text-neutral-500">Loading smartlinks…</td></tr>}
      </tbody></table></div>
    </section>

    {modalOpen && canCreate && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"><div><h3 className="text-lg font-bold">{editItem ? 'Edit smartlink' : 'Create smartlink'}</h3><p className="mt-1 text-sm text-neutral-500">{editItem ? 'Update campaign settings or team assignment.' : 'Choose a product and optionally assign the campaign to a team member.'}</p></div>
      <label className="block text-xs font-semibold text-neutral-600">Campaign name<input required maxLength="100" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder="Spring launch campaign" /></label>
      {!editItem && <label className="block text-xs font-semibold text-neutral-600">SaaS product<select required value={form.saasProductId} onChange={(event) => setForm({ ...form, saasProductId: event.target.value })} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"><option value="">Select a product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>}
      <label className="block text-xs font-semibold text-neutral-600">Assign team member (optional)<select value={form.teamMemberId} onChange={(event) => setForm({ ...form, teamMemberId: event.target.value })} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"><option value="">No team member</option>{teamMembers.filter((member) => member.status === 'active').map((member) => <option key={member._id} value={member._id}>{member.name} · {member.subAffiliateCode}</option>)}</select></label>
      {editItem && <label className="block text-xs font-semibold text-neutral-600">Destination URL override (optional)<input type="url" value={form.destinationUrl} onChange={(event) => setForm({ ...form, destinationUrl: event.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder="Uses the SaaS product destination when blank" /></label>}
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Link2 size={15} />{saving ? 'Saving…' : editItem ? 'Save changes' : 'Create smartlink'}</button></div>
    </form></div>}
  </div>;
}
