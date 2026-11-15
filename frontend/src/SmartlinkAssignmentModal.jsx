import React, { useState } from 'react';
import axios from 'axios';
import { Check, Copy, Link2 } from 'lucide-react';

export default function SmartlinkAssignmentModal({ token, products, teamMemberId, teamMemberName, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [saasProductId, setSaasProductId] = useState(products[0]?._id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await axios.post('/api/affiliates/smartlinks', { name, saasProductId, teamMemberId }, { headers: { Authorization: `Bearer ${token}` } });
      setCreatedLink(response.data);
      onCreated?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not generate the smartlink.');
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
      <div><h3 className="text-lg font-bold">Generate a team smartlink</h3><p className="mt-1 text-sm text-neutral-500">This campaign link will be assigned to {teamMemberName}.</p></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {createdLink ? <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Smartlink created for {teamMemberName}</p><p className="break-all font-mono text-sm text-neutral-800">{new URL(`/s/${createdLink.code}`, window.location.origin).toString()}</p><button type="button" onClick={async () => { await navigator.clipboard.writeText(new URL(`/s/${createdLink.code}`, window.location.origin).toString()); setCopied(true); }} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy link'}</button></div> : <>
        <label className="block text-xs font-semibold text-neutral-600">Campaign name<input required maxLength="100" value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder="Product launch campaign" /></label>
        <label className="block text-xs font-semibold text-neutral-600">SaaS product<select required value={saasProductId} onChange={(event) => setSaasProductId(event.target.value)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"><option value="">Select a product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>
        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">Assigned member <b className="ml-1 text-neutral-900">{teamMemberName}</b></div>
      </>}
      <div className="flex justify-end gap-2 pt-2">{!createdLink && <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button>}{createdLink ? <button type="button" onClick={onClose} className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Done</button> : <button disabled={saving || !saasProductId} className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Link2 size={15} />{saving ? 'Generating…' : 'Generate smartlink'}</button>}</div>
    </form>
  </div>;
}
