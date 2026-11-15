import React, { useState } from 'react';
import { Link2, UserRound } from 'lucide-react';
import SmartlinkAssignmentModal from './SmartlinkAssignmentModal.jsx';

export default function TeamProfileTab({ token, profile, products }) {
  const [createOpen, setCreateOpen] = useState(false);
  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-3 text-violet-800"><UserRound size={20} /></div><div><h2 className="text-lg font-bold">My team profile</h2><p className="mt-1 text-sm text-neutral-500">Your personal tracking identity and assigned campaign links.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-neutral-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Team tracking code</p><p className="mt-2 font-mono text-sm font-bold">{profile.affiliateCode}.{profile.subAffiliateCode}</p></div><div className="rounded-xl bg-neutral-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Account email</p><p className="mt-2 text-sm font-semibold">{profile.email}</p></div></div>
      <button onClick={() => setCreateOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800"><Link2 size={15} />Generate my smartlink</button>
    </section>
    {createOpen && <SmartlinkAssignmentModal token={token} products={products} teamMemberId={profile.id} teamMemberName={profile.name} onClose={() => setCreateOpen(false)} />}
  </div>;
}
