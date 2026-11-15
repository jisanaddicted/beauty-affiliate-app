import React, { useState } from 'react';
import axios from 'axios';
import { Link2, Plus, Trash2, Users, UserCheck } from 'lucide-react';

const money = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export default function TeamTab({ token, members, loading, error, onRefresh, onCreateSmartlink }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  const addMember = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await axios.post('/api/affiliates/team', { name, email }, { headers });
      setName('');
      setEmail('');
      setMessage('Team member added. Their tracking code is ready to use.');
      await onRefresh();
    } catch (requestError) { setMessage(requestError.response?.data?.message || 'Could not add team member.'); }
    finally { setSaving(false); }
  };

  const removeMember = async (member) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    const action = nextStatus === 'inactive' ? 'Deactivate' : 'Reactivate';
    if (!window.confirm(`${action} ${member.name}? ${nextStatus === 'inactive' ? 'Assigned smartlinks will be unassigned.' : ''}`)) return;
    try {
      if (nextStatus === 'inactive') await axios.delete(`/api/affiliates/team/${member._id}`, { headers });
      else await axios.put(`/api/affiliates/team/${member._id}`, { status: 'active' }, { headers });
      await onRefresh();
    } catch (requestError) { setMessage(requestError.response?.data?.message || 'Could not remove team member.'); }
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-800"><Users size={19} /></div><div><h2 className="text-lg font-bold">My team</h2><p className="mt-1 text-sm text-neutral-500">Add collaborators and track the results of their referral campaigns.</p></div></div>
      <form onSubmit={addMember} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-xs font-semibold text-neutral-600">Name<input required maxLength="100" value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm" placeholder="Team member name" /></label><label className="text-xs font-semibold text-neutral-600">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm" placeholder="name@example.com" /></label><button disabled={saving} className="mt-auto inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} />{saving ? 'Adding…' : 'Add team member'}</button></form>
      {message && <p role="status" className="mt-3 text-sm text-neutral-600">{message}</p>}{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500"><tr><th className="px-5 py-3">Team member</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Sub-tracking code</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Signups</th><th className="px-5 py-3 text-right">Conversions</th><th className="px-5 py-3 text-right">Commission generated</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-neutral-100">
      {!loading && members.map((member) => <tr key={member._id} className="hover:bg-neutral-50"><td className="px-5 py-4 font-semibold">{member.name}</td><td className="px-5 py-4 text-neutral-600">{member.email}</td><td className="px-5 py-4"><span className="rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs">{member.subAffiliateCode}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{member.status}</span></td><td className="px-5 py-4 text-right">{member.stats?.signups || 0}</td><td className="px-5 py-4 text-right">{member.stats?.conversions || 0}</td><td className="px-5 py-4 text-right font-semibold">{money(member.stats?.revenue)}</td><td className="px-5 py-4"><div className="flex gap-2">{member.status === 'active' && <button onClick={() => onCreateSmartlink(member._id)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-semibold hover:bg-neutral-50"><Link2 size={13} />Create link</button>}<button onClick={() => removeMember(member)} title={member.status === 'active' ? 'Deactivate member' : 'Reactivate member'} className={`rounded-lg p-2 ${member.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>{member.status === 'active' ? <Trash2 size={15} /> : <UserCheck size={15} />}</button></div></td></tr>)}
      {!loading && members.length === 0 && <tr><td colSpan="8" className="px-5 py-12 text-center text-neutral-500">Your team is empty. Add a member above to generate a sub-tracking code.</td></tr>}
      {loading && <tr><td colSpan="8" className="px-5 py-12 text-center text-neutral-500">Loading team…</td></tr>}
    </tbody></table></div></section>
  </div>;
}
