import React, { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff, KeyRound, Link2, Plus, ShieldCheck, Trash2, Users, UserCheck } from 'lucide-react';
import SmartlinkAssignmentModal from './SmartlinkAssignmentModal.jsx';

const permissionDefaults = {
  canViewOverview: true,
  canViewAnalytics: true,
  canCreateSmartlinks: false,
  canViewOwnSmartlinksOnly: true,
  canViewEarnings: false,
  canManageTeam: false,
  canRequestPayouts: false,
};
const permissionLabels = {
  canViewOverview: 'View Overview',
  canViewAnalytics: 'View Analytics & Statistics',
  canCreateSmartlinks: 'Create & Manage Smartlinks',
  canViewOwnSmartlinksOnly: 'Restrict to Assigned Smartlinks',
  canViewEarnings: 'View Commission & Dollar Earnings',
  canManageTeam: 'Manage Team Members',
  canRequestPayouts: 'Request Payouts',
};
const money = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const headers = (token) => ({ Authorization: `Bearer ${token}` });

const permissionSet = (permissions, actorPermissions, isAffiliate, preserveExisting = false) => {
  const result = { ...permissionDefaults, ...(permissions || {}) };
  if (result.canRequestPayouts) result.canViewEarnings = true;
  if (!isAffiliate) {
    for (const key of Object.keys(result)) {
      if (key === 'canViewOwnSmartlinksOnly') result[key] = true;
      else if (actorPermissions?.[key] !== true && !preserveExisting) result[key] = false;
    }
  }
  return result;
};

export default function TeamTab({ token, members, loading, error, onRefresh, products, isAffiliate, currentPermissions, canViewEarnings }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', permissions: permissionSet(null, currentPermissions, isAffiliate) });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showStrength, setShowStrength] = useState(false);
  const [creatingFor, setCreatingFor] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', permissions: permissionSet(null, currentPermissions, isAffiliate) });
    setShowPassword(false);
    setModalOpen(true);
  };
  const openEdit = (member) => {
    setEditing(member);
    setForm({ name: member.name, email: member.email, password: '', permissions: permissionSet(member.permissions, currentPermissions, isAffiliate, true) });
    setShowPassword(false);
    setModalOpen(true);
  };

  const updatePermission = (key, checked) => {
    setForm((current) => {
      const permissions = { ...current.permissions, [key]: checked };
      if (key === 'canRequestPayouts' && checked) permissions.canViewEarnings = true;
      if (key === 'canViewEarnings' && !checked) permissions.canRequestPayouts = false;
      return { ...current, permissions };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      if (editing) {
        const body = { name: form.name, permissions: form.permissions };
        if (form.password) body.password = form.password;
        await axios.put(`/api/affiliates/team/${editing._id}`, body, { headers: headers(token) });
      } else {
        await axios.post('/api/affiliates/team', { name: form.name, email: form.email, password: form.password, permissions: form.permissions }, { headers: headers(token) });
      }
      setModalOpen(false);
      setMessage(editing ? 'Team member access updated.' : 'Team member added. Share their email and password so they can sign in.');
      await onRefresh();
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || 'Could not save team member.');
    } finally { setSaving(false); }
  };

  const changeStatus = async (member) => {
    const active = member.status === 'active';
    if (!window.confirm(`${active ? 'Deactivate' : 'Reactivate'} ${member.name}? ${active ? 'Assigned smartlinks will be unassigned.' : ''}`)) return;
    try {
      if (active) await axios.delete(`/api/affiliates/team/${member._id}`, { headers: headers(token) });
      else await axios.put(`/api/affiliates/team/${member._id}`, { status: 'active' }, { headers: headers(token) });
      await onRefresh();
    } catch (requestError) { setMessage(requestError.response?.data?.message || 'Could not update team member.'); }
  };

  const passwordStrength = form.password.length === 0 ? 0 : [form.password.length >= 8, /[A-Z]/.test(form.password), /[a-z]/.test(form.password), /\d/.test(form.password), /[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length;
  const canGrant = (key) => isAffiliate || currentPermissions?.[key] === true || key === 'canViewOwnSmartlinksOnly';

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-800"><Users size={19} /></div><div><h2 className="text-lg font-bold">My team</h2><p className="mt-1 text-sm text-neutral-500">Provision dashboard access, tracking codes, and specific permissions.</p></div></div><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800"><Plus size={15} />Add team member</button></div>
      {message && <p role="status" className="mt-3 text-sm text-neutral-600">{message}</p>}{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500"><tr><th className="px-5 py-3">Team member</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Sub-tracking code</th><th className="px-5 py-3">Access</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Signups</th><th className="px-5 py-3 text-right">Conversions</th>{canViewEarnings && <th className="px-5 py-3 text-right">Commission</th>}<th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-neutral-100">
      {!loading && members.map((member) => {
        const activePermissionLabels = Object.entries(permissionLabels).filter(([key]) => member.permissions?.[key]).map(([, label]) => label);
        return <tr key={member._id} className="align-top hover:bg-neutral-50"><td className="px-5 py-4 font-semibold">{member.name}</td><td className="px-5 py-4 text-neutral-600">{member.email}</td><td className="px-5 py-4"><span className="rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs">{member.subAffiliateCode}</span></td><td className="max-w-64 px-5 py-4"><div className="flex flex-wrap gap-1">{activePermissionLabels.length ? activePermissionLabels.map((label) => <span key={label} className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-800">{label}</span>) : <span className="text-xs text-neutral-400">No access flags</span>}</div></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{member.status}</span></td><td className="px-5 py-4 text-right">{member.stats?.signups || 0}</td><td className="px-5 py-4 text-right">{member.stats?.conversions || 0}</td>{canViewEarnings && <td className="px-5 py-4 text-right font-semibold">{money(member.stats?.revenue)}</td>}<td className="px-5 py-4"><div className="flex gap-1"><button onClick={() => openEdit(member)} title="Edit access or reset password" className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"><ShieldCheck size={15} /></button><button onClick={() => changeStatus(member)} title={member.status === 'active' ? 'Deactivate member' : 'Reactivate member'} className={`rounded-lg p-2 ${member.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>{member.status === 'active' ? <Trash2 size={15} /> : <UserCheck size={15} />}</button>{member.status === 'active' && currentPermissions?.canCreateSmartlinks && <button onClick={() => setCreatingFor(member)} title="Generate link assigned to this member" className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"><Link2 size={15} /></button>}</div></td></tr>;
      })}
      {!loading && members.length === 0 && <tr><td colSpan={canViewEarnings ? 9 : 8} className="px-5 py-12 text-center text-neutral-500">Your team is empty. Add a member to provision their login and tracking code.</td></tr>}
      {loading && <tr><td colSpan={canViewEarnings ? 9 : 8} className="px-5 py-12 text-center text-neutral-500">Loading team…</td></tr>}
    </tbody></table></div></section>

    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><form onSubmit={save} className="my-auto max-h-[94vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div><h3 className="text-lg font-bold">{editing ? 'Edit team member access' : 'Add team member'}</h3><p className="mt-1 text-sm text-neutral-500">Set their login credentials and what they can access.</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-neutral-600">Name<input required maxLength="100" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm" placeholder="Team member name" /></label><label className="block text-xs font-semibold text-neutral-600">Email<input required type="email" readOnly={Boolean(editing)} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm ${editing ? 'bg-neutral-50 text-neutral-500' : ''}`} placeholder="name@example.com" /></label></div>
      <label className="block text-xs font-semibold text-neutral-600">{editing ? editing.hasPassword ? 'New password (leave blank to keep current)' : 'Set password (required for this account)' : 'Login password'}<span className="relative mt-1.5 block"><input required={!editing || !editing.hasPassword} minLength="8" maxLength="128" type={showPassword ? 'text' : 'password'} value={form.password} onFocus={() => setShowStrength(true)} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full rounded-lg border px-3 py-2.5 pr-11 text-sm" placeholder={editing ? 'Optional password reset' : 'At least 8 characters'} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
      {showStrength && form.password && <div className="-mt-3"><div className="flex gap-1">{[1, 2, 3, 4, 5].map((level) => <span key={level} className={`h-1 flex-1 rounded ${passwordStrength >= level ? (passwordStrength >= 4 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-neutral-200'}`} />)}</div><p className="mt-1 text-[10px] text-neutral-500">Use 8+ characters with uppercase, lowercase, a number, or a symbol for a stronger password.</p></div>}
      <fieldset className="rounded-xl border border-neutral-200 p-4"><legend className="px-1 text-sm font-bold">Dashboard Access &amp; Permissions</legend><div className="grid gap-2 sm:grid-cols-2">{Object.entries(permissionLabels).map(([key, label]) => <label key={key} className={`flex items-start gap-2 rounded-lg p-2 text-xs ${canGrant(key) ? 'cursor-pointer hover:bg-neutral-50' : 'cursor-not-allowed opacity-50'}`}><input type="checkbox" disabled={!canGrant(key)} checked={Boolean(form.permissions[key])} onChange={(event) => updatePermission(key, event.target.checked)} className="mt-0.5 accent-neutral-950" /><span><b className="block text-neutral-800">{label}</b><span className="mt-0.5 block leading-4 text-neutral-500">{key === 'canViewOwnSmartlinksOnly' ? 'When enabled, limits campaign data to their assigned smartlinks.' : key === 'canViewEarnings' ? 'Financial amounts are hidden unless this is enabled.' : key === 'canRequestPayouts' ? 'Also requires earnings access.' : 'Allow access to this dashboard feature.'}</span></span></label>)}</div></fieldset>
      <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving || ((!editing || !editing.hasPassword) && form.password.length < 8)} className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><KeyRound size={14} />{saving ? 'Saving…' : editing ? 'Save access' : 'Create login'}</button></div>
    </form></div>}
    {creatingFor && <SmartlinkAssignmentModal token={token} products={products} teamMemberId={creatingFor._id} teamMemberName={creatingFor.name} onClose={() => setCreatingFor(null)} onCreated={onRefresh} />}
  </div>;
}
