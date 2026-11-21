import React, { useState } from 'react';
import { ExternalLink, Link2, Megaphone } from 'lucide-react';

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PromoResources({ resources }) {
  if (!resources) return <p className="text-sm text-neutral-500">No promo resources have been added yet.</p>;
  if (typeof resources === 'string') return <p className="whitespace-pre-wrap text-sm text-neutral-700">{resources}</p>;

  const items = Array.isArray(resources) ? resources : Object.entries(resources).map(([title, value]) => ({ title, value }));
  return <div className="space-y-4">{items.map((item, index) => {
    const resource = typeof item === 'string' ? { title: `Resource ${index + 1}`, value: item } : item;
    const value = resource.value || resource.content || resource.text || resource.url || '';
    return <section key={`${resource.title || 'resource'}-${index}`}>
      <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">{resource.title || resource.name || `Resource ${index + 1}`}</h4>
      {resource.url ? <a className="mt-1 inline-flex items-center gap-1 text-sm text-amber-700 underline" href={resource.url} target="_blank" rel="noreferrer">{resource.url}<ExternalLink size={13} /></a> : <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{String(value)}</p>}
    </section>;
  })}</div>;
}

export default function MarketplaceTab({ products, onGoToSmartlinks }) {
  const [promoProduct, setPromoProduct] = useState(null);

  if (!products.length) return <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-500">No SaaS products are available yet.</div>;

  return <>
    <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Promote SaaS products through smartlinks. Create and share your smartlinks from the Smartlinks section.</p>
    <div className="grid gap-5 xl:grid-cols-2">
      {products.map((product) => (
        <article key={product._id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {product.bannerUrl && <img src={product.bannerUrl} alt="" className="h-36 w-full object-cover" />}
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              {product.logoUrl ? <img src={product.logoUrl} alt={`${product.name} logo`} className="h-14 w-14 rounded-2xl border object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 text-lg font-bold text-white">{product.name.slice(0, 1)}</div>}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-neutral-950">{product.name}</h2>
                <p className="mt-0.5 text-sm font-medium text-amber-700">{product.tagline}</p>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-600">{product.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Signup bounty · locked</p>
                <p className="mt-1 text-xl font-black text-neutral-950">${money(product.signupBountyAmount)}</p>
                <p className="mt-1 text-xs text-neutral-600">Unlocks when your referral buys a paid plan.</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Plan commissions</p>
                {product.planTiers?.length ? <ul className="mt-2 space-y-1.5">{product.planTiers.map((tier) => (
                  <li key={tier.planId} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-neutral-700">{tier.planName}</span>
                    <span className="shrink-0 font-bold text-neutral-950">{tier.commissionType === 'percentage' ? `${tier.commissionValue}%` : `$${money(tier.commissionValue)}`}</span>
                  </li>
                ))}</ul> : <p className="mt-2 text-xs text-neutral-500">No paid plan commissions configured.</p>}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={onGoToSmartlinks} className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-neutral-800">
                <Link2 size={14} /> Create a smartlink
              </button>
              <button onClick={() => setPromoProduct(product)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50"><Megaphone size={14} /> Promo assets & swipe copy</button>
            </div>
          </div>
        </article>
      ))}
    </div>
    {promoProduct && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setPromoProduct(null)}>
      <section role="dialog" aria-modal="true" aria-labelledby="promo-title" className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h3 id="promo-title" className="text-lg font-bold">{promoProduct.name} promo resources</h3><p className="mt-1 text-xs text-neutral-500">Swipe copy, campaign notes, and demo links from the product team.</p></div>
          <button onClick={() => setPromoProduct(null)} aria-label="Close promo resources" className="rounded-lg px-3 py-1 text-xl text-neutral-500 hover:bg-neutral-100">×</button>
        </div>
        <PromoResources resources={promoProduct.promoResources} />
      </section>
    </div>}
  </>;
}
