import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, ShoppingBag, ArrowRight, ShieldCheck, Truck, Star } from 'lucide-react';

export default function ProductLanding() {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Checkout Form States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
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
        const response = await axios.get(`https://beauty-affiliate-app.onrender.com/api/products/${productId}`);
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

    // 🚀 Live Google Apps Script Web App URL
    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxj-tcfupCwXvdb4Mj26pzPmr51vyNMfUQnlSLHQZMU-tqeqYvn_0Fun0IrB-H7KxvLig/exec';

    try {
      const orderPayload = {
        productId: product._id,
        productName: product.name,
        price: product.price,
        customerName: customerName,
        customerPhone: customerPhone,
        shippingAddress: shippingAddress,
        referralCode: referralCode || null,
      };

      // text/plain maps smoothly across basic Google macros without preflight CORS constraints
      await axios.post(GOOGLE_SHEET_URL, JSON.stringify(orderPayload), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });

      setOrderStatus('success');
      setCustomerName('');
      setCustomerPhone('');
      setShippingAddress('');
    } catch (err) {
      console.error("Order Routing Error: ", err);
      setOrderStatus('error');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-medium bg-neutral-50 text-neutral-500 text-sm">Loading premium landing page...</div>;
  if (error || !product) return <div className="min-h-screen flex items-center justify-center font-medium bg-neutral-50 text-red-600 text-sm">{error || 'Invalid Link Product Profile.'}</div>;

  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* HEADER HUD */}
      <header className="border-b border-neutral-100 py-4 px-4 sm:px-6 md:px-12 flex flex-col sm:flex-row gap-3 justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-black rounded flex items-center justify-center text-white font-bold text-xs">B</div>
          <span className="font-bold tracking-tight text-sm uppercase">Glow Boutique Studio</span>
        </div>
        {referralCode && (
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/50">
            ✨ Exclusive Creator Deal Unlocked
          </span>
        )}
      </header>

      {/* CORE HERO MAIN LAYOUT GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
        
        {/* LEFT COMPONENT COLUMN: PRODUCT PHOTO FRAME (Desktop sticky / Mobile natural flow) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          {product.image ? (
            <div className="w-full aspect-[4/5] bg-neutral-50 rounded-3xl overflow-hidden border border-neutral-200/60 shadow-sm">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover transform hover:scale-[1.02] transition-transform duration-500" 
              />
            </div>
          ) : (
            <div className="w-full aspect-[4/5] bg-neutral-50 rounded-3xl flex flex-col items-center justify-center border border-dashed border-neutral-200 text-neutral-400">
              <ShoppingBag size={40} className="stroke-[1.2] mb-2" />
              <span className="text-xs font-medium">No Image Asset Loaded</span>
            </div>
          )}
          
          {/* Metadata details mapping bar */}
          <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            <span>Collection: {product.category || 'Premium Skin'}</span>
            <span>SKU: {product.sku || 'N/A'}</span>
          </div>
        </div>

        {/* CENTER COLUMN: METADATA & MARKET COPY CONTENT */}
        <div className="lg:col-span-4 flex flex-col justify-center lg:pt-2">
          <div className="flex items-center gap-1.5 text-amber-500 text-sm mb-3">
            {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" className="stroke-amber-500" />)}
            <span className="text-neutral-500 font-semibold ml-1 text-xs">4.9 / 5.0</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif tracking-tight leading-tight mb-3 text-neutral-950">
            {product.name}
          </h1>
          
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950">${product.price}</span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-emerald-100">Free Delivery</span>
          </div>

          <p className="text-neutral-600 text-sm leading-relaxed mb-6">
            {product.description || "Experience our premium, highly requested skincare formula. Professionally balanced, non-comedogenic, and engineered to deliver glowing, dynamic results in under 7 days."}
          </p>

          {/* Dynamically Render Highlight Badges array from DB backend schema array values */}
          {product.highlights && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {(Array.isArray(product.highlights) ? product.highlights : product.highlights.split(',')).map((badge, idx) => (
                <span key={idx} className="text-[10px] font-bold bg-neutral-100/80 text-neutral-700 px-2.5 py-1 rounded-md border border-neutral-200/40">
                  {badge.trim()}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-4 border-t border-neutral-100 pt-6">
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
        <div className="lg:col-span-3 w-full bg-neutral-50 border border-neutral-200/60 p-5 sm:p-8 rounded-3xl lg:sticky lg:top-24 mt-4 lg:mt-0">
          <h3 className="text-lg font-bold tracking-tight mb-1 text-neutral-950">Secure Checkout</h3>
          <p className="text-xs text-neutral-500 mb-6">Fill out your details to place your tracking order.</p>

          {orderStatus === 'success' && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-xl text-xs font-medium mb-5">
              🎉 Order received perfectly! Packing preparation is underway.
            </div>
          )}

          {orderStatus === 'error' && (
            <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-xl text-xs font-medium mb-5">
              ⚠️ Transaction failed. Please check connection path settings.
            </div>
          )}

          <form onSubmit={handlePlaceOrder} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Your Full Name</label>
              <input 
                type="text" required placeholder="e.g., Jisan Rahman" value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-black bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Phone Number</label>
              <input 
                type="tel" required placeholder="+1 (555) 000-0000" value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-black bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Shipping Address</label>
              <textarea 
                rows="3" required placeholder="Street, City, Zip Code" value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-black bg-white resize-none"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-neutral-950 hover:bg-black text-white py-3 rounded-xl text-xs font-bold tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 mt-2"
            >
              <ShoppingBag size={14} /> Buy Now - ${product ? product.price : '...'} <ArrowRight size={12} />
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}