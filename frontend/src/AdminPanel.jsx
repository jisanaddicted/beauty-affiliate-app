import React, { useState } from 'react';
import axios from 'axios';
import { Shield, PlusCircle, LayoutGrid, LogOut, Package, Percent, DollarSign, Layers } from 'lucide-react';

export default function AdminPanel() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields for Adding Product
  const [formData, setFormData] = useState({
    name: '', price: '', commissionRate: '', sku: '',
    productUrl: '', description: '', category: 'Premium Skincare',
    stock: '', highlights: '', image: ''
  });

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await axios.post('http://localhost:5000/api/admin/login', { email, password });
      if (response.data) {
        setIsAdminLoggedIn(true);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Access Denied');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await axios.post('http://localhost:5000/api/admin/products', formData);
      setSuccessMsg('✨ Product pushed to MongoDB live marketplace successfully!');
      setFormData({
        name: '', price: '', commissionRate: '', sku: '',
        productUrl: '', description: '', category: 'Premium Skincare',
        stock: '', highlights: '', image: ''
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed saving document configuration.');
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <form onSubmit={handleAdminLogin} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-xl">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-neutral-800 rounded-xl text-amber-400 mb-2"><Shield size={24} /></div>
            <h2 className="text-xl font-bold text-white tracking-tight">System Infrastructure Login</h2>
            <p className="text-xs text-neutral-500 mt-1">Manual MongoDB Credential Matching Only</p>
          </div>
          {errorMsg && <div className="p-3.5 bg-red-950 border border-red-900 text-red-400 text-xs rounded-xl mb-4">{errorMsg}</div>}
          <div className="space-y-4">
            <input type="email" placeholder="Admin Email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-white rounded-xl text-sm focus:outline-none focus:border-neutral-700"/>
            <input type="password" placeholder="Root Password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 text-white rounded-xl text-sm focus:outline-none focus:border-neutral-700"/>
            <button type="submit" className="w-full bg-white hover:bg-neutral-200 text-black py-3 rounded-xl font-semibold text-sm transition-all">Authenticate Node</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutral-50 text-neutral-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-neutral-200 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="p-2 bg-neutral-950 rounded-lg text-white"><Shield size={16} /></div>
            <span className="font-bold text-base tracking-tight">Glow Core Control</span>
          </div>
          <nav className="space-y-1">
            <button className="flex items-center gap-3 px-3 py-2.5 bg-neutral-900 text-white font-medium rounded-lg text-sm w-full"><PlusCircle size={18} /> Add New Product</button>
          </nav>
        </div>
        <button onClick={() => setIsAdminLoggedIn(false)} className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-lg text-sm w-full"><LogOut size={18} /> Exit Console</button>
      </aside>

      {/* CORE DISPLAY WINDOW */}
      <main className="flex-1 p-10 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-2xl font-black tracking-tight">Marketplace Inventory Control</h1>
          <p className="text-sm text-neutral-500 mt-1">Inject dynamic product metadata fields straight into your application cluster collections.</p>
        </header>

        {successMsg && <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-medium mb-6">{successMsg}</div>}
        {errorMsg && <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-sm font-medium mb-6">{errorMsg}</div>}

        <form onSubmit={handleCreateProduct} className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Product Title / Name</label>
            <input type="text" required placeholder="e.g., Hydra Glow Vitamin C Balm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Retail Price ($)</label>
            <input type="number" required placeholder="48" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Affiliate Commission Rate (%)</label>
            <input type="number" required placeholder="15" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Unique SKU Code</label>
            <input type="text" required placeholder="GLOW-BALM-01" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Initial Inventory Stock Count</label>
            <input type="number" required placeholder="100" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Target Landing Page Base URL</label>
            <input type="text" required placeholder="http://localhost:5173/product/LEAVE_BLANK_OR_ADD_BASE" value={formData.productUrl} onChange={e => setFormData({...formData, productUrl: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Display Image Cover URL</label>
            <input type="text" placeholder="https://images.unsplash.com/..." value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Highlights / Selling Badges (Comma Separated)</label>
            <input type="text" placeholder="100% Vegan, Cruelty Free, Paraben Free" value={formData.highlights} onChange={e => setFormData({...formData, highlights: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Marketing Copy Description</label>
            <textarea rows="4" required placeholder="Describe the high conversion metrics and formulation benefits..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none" />
          </div>

          <button type="submit" className="md:col-span-2 w-full bg-neutral-950 hover:bg-black text-white font-bold text-sm tracking-wide py-3.5 rounded-xl transition-all shadow-md mt-2">Publish Item to Database</button>
        </form>
      </main>
    </div>
  );
}