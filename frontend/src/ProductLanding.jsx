import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, ShoppingBag, ArrowRight, ShieldCheck, Truck, Star } from 'lucide-react';

export default function ProductLanding() {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Checkout Form States
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderStatus, setOrderStatus] = useState(null); // 'success' or 'error'

  // Extract dynamic parameters from raw window location path/query
  const pathSegments = window.location.pathname.split('/');
  const productId = pathSegments[pathSegments.length - 1]; 
  
  const queryParams = new URLSearchParams(window.location.search);
  const referralCode = queryParams.get('ref');

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/products/${productId}`);
        setProduct(response.data);
      } catch (err) {
        setError('Product profile not found or currently unavailable.');
      } finally {
        setLoading(false);
      }
    };
    if (productId) fetchProductDetails();
  }, [productId]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setOrderStatus(null);

    try {
      const orderPayload = {
        productId: product._id,
        customerName,
        customerEmail,
        shippingAddress,
        referralCode: referralCode || null, // 👈 Passes the tracked affiliate creator code
      };

      await axios.post('http://localhost:5000/api/orders', orderPayload);
      setOrderStatus('success');
      setCustomerName('');
      setCustomerEmail('');
      setShippingAddress('');
    } catch (err) {
      setOrderStatus('error');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-medium bg-neutral-50 text-neutral-500">Loading premium landing page...</div>;
  if (error || !product) return <div className="min-h-screen flex items-center justify-center font-medium bg-neutral-50 text-red-600">{error || 'Invalid Link Product Profile.'}</div>;

  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* HEADER HUD */}
      <header className="border-b border-neutral-100 py-4 px-6 sm:px-12 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-black rounded flex items-center justify-center text-white font-bold text-xs">B</div>
          <span className="font-bold tracking-tight text-sm uppercase">Glow Boutique Studio</span>
        </div>
        {referralCode && (
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/50">
            ✨ Exclusive Creator Deal Unlocked
          </span>
        )}
      </header>

      {/* CORE HERO SECTION */}
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        
        {/* LEFT COLUMN: SELLING POINTS & PRODUCT INFO */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-amber-500 text-sm mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            <span className="text-neutral-500 font-medium ml-1 text-xs">(4.9/5 verified reviews)</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight leading-tight mb-4 text-neutral-950">
            {product.name}
          </h1>
          
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-black tracking-tight text-neutral-950">${product.price}</span>
            <span className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Free Worldwide Shipping Included</span>
          </div>

          <p className="text-neutral-600 text-sm leading-relaxed mb-8">
            Experience our premium, highly requested skincare formula. Professionally balanced, non-comedogenic, and engineered to deliver glowing, dynamic results in under 7 days. Secured exclusively through affiliate community allocations.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-100 pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-neutral-50 rounded-lg text-neutral-800"><Truck size={16} /></div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Fast Dispatch</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Ships out within 24 business hours.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-neutral-50 rounded-lg text-neutral-800"><ShieldCheck size={16} /></div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">100% Satisfaction</h4>
                <p className="text-xs text-neutral-500 mt-0.5">30-day hassle-free structural return pool.</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE ORDER CONVERSION CONSOLE */}
        <div className="bg-neutral-50 border border-neutral-200/60 p-8 sm:p-10 rounded-3xl relative">
          <h3 className="text-xl font-bold tracking-tight mb-1 text-neutral-950">Complete Your Order</h3>
          <p className="text-xs text-neutral-500 mb-6">Fill out your shipping information down below to secure your items immediately.</p>

          {orderStatus === 'success' && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-5 rounded-2xl text-sm font-medium mb-6">
              🎉 Order received perfectly! We are handling validation loops and packaging preparation right now.
            </div>
          )}

          {orderStatus === 'error' && (
            <div className="bg-red-50 text-red-800 border border-red-200 p-5 rounded-2xl text-sm font-medium mb-6">
              ⚠️ Order transaction processing failed. Please check your data paths.
            </div>
          )}

          <form onSubmit={handlePlaceOrder} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1.5">Your Full Name</label>
              <input 
                type="text" required placeholder="e.g., Jisan Rahman" value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1.5">Email Address</label>
              <input 
                type="email" required placeholder="yourname@domain.com" value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1.5">Shipping Destination Address</label>
              <textarea 
                rows="3" required placeholder="Street Address, City, Zip Code" value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black bg-white resize-none"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-neutral-950 hover:bg-black text-white py-4 rounded-xl text-sm font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 mt-2"
            >
              <ShoppingBag size={16} /> Place Order - Total: ${product.price} <ArrowRight size={14} />
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}