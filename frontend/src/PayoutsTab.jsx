import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowUpRight, CheckCircle2, Clock, AlertCircle, ShieldCheck } from 'lucide-react';

export default function PayoutsTab({ affiliateBalance, onBalanceUpdate }) {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bKash');
  const [accountType, setAccountType] = useState('Personal');
  const [accountNumber, setAccountNumber] = useState('');
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 🇧🇩 Mobile Financial Services Brand Mapping Configuration Array
  const operators = [
    { 
      id: 'bKash', 
      name: 'bKash', 
      logo: 'https://www.logo.wine/a/logo/BKash/BKash-Icon2-Logo.wine.svg',
      activeBorder: 'border-[#E2125D]', 
      activeBg: 'bg-[#E2125D]/5',
      badgeBg: 'bg-[#E2125D]'
    },
    { 
      id: 'Nagad', 
      name: 'Nagad', 
      logo: 'https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png',
      activeBorder: 'border-[#F15A22]', 
      activeBg: 'bg-[#F15A22]/5',
      badgeBg: 'bg-[#F15A22]'
    },
    { 
      id: 'Rocket', 
      name: 'Rocket', 
      logo: 'https://static.vecteezy.com/system/resources/previews/037/898/884/non_2x/rocket-glyph-square-two-color-icon-vector.jpg',
      activeBorder: 'border-[#8C3494]', 
      activeBg: 'bg-[#8C3494]/5',
      badgeBg: 'bg-[#8C3494]'
    },
    { 
      id: 'Upay', 
      name: 'Upay', 
      logo: 'https://static.vecteezy.com/system/resources/previews/068/764/291/non_2x/upay-logo-mobile-banking-app-icon-transparent-background-free-png.png',
      activeBorder: 'border-[#FFC412]', 
      activeBg: 'bg-[#FFC412]/10',
      badgeBg: 'bg-[#FFC412]'
    }
  ];

  const fetchPayoutHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://beauty-affiliate-app.onrender.com/api/payouts/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (err) {
      console.error("History Log Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutHistory();
  }, []);

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (parseFloat(amount) > affiliateBalance.withdrawableBalance) {
      return setMessage({ type: 'error', text: 'Requested amount exceeds your withdrawable balance.' });
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('https://beauty-affiliate-app.onrender.com/api/payouts/withdraw', {
        amount, method: selectedMethod, accountType, accountNumber
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ type: 'success', text: response.data.message });
      setAmount('');
      setAccountNumber('');
      
      if (onBalanceUpdate) onBalanceUpdate(response.data.updatedBalance);
      fetchPayoutHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto text-neutral-900">
      
      <div>
        <h2 className="text-xl font-bold tracking-tight">Earnings Withdrawal Portal</h2>
        <p className="text-xs text-neutral-500 mt-0.5">Transfer your settled earnings instantly via local mobile wallets.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* WITHDRAWAL MAIN CONTROLLER FORM */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-sm lg:col-span-2 space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Initialize Cashout</h3>
          
          <form onSubmit={handleWithdrawSubmit} className="space-y-5">
            {/* BRANDED INTERACTIVE GRID OPERATOR SELECTOR */}
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-2.5">Select Operator</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {operators.map((op) => {
                  const isSelected = selectedMethod === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelectedMethod(op.id)}
                      className={`relative p-4 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 overflow-hidden group ${
                        isSelected 
                          ? `${op.activeBorder} ${op.activeBg} shadow-sm scale-[1.02] bg-white` 
                          : 'border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50/50'
                      }`}
                    >
                      {/* Active Radio Fill Dot Overlay */}
                      <div className={`absolute top-2.5 right-2.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center ${isSelected ? op.activeBorder : 'border-neutral-300'}`}>
                        {isSelected && <div className={`h-1.5 w-1.5 rounded-full ${op.badgeBg}`} />}
                      </div>

                      {/* Logo Frame Render Box */}
                      <div className="h-12 w-full flex items-center justify-center mb-1">
                        <img 
                          src={op.logo} 
                          alt={op.name} 
                          className={`max-h-full max-w-[70px] object-contain transition-transform duration-200 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`} 
                        />
                      </div>
                      
                      <span className={`text-xs font-bold tracking-wide mt-1 ${isSelected ? 'text-neutral-950' : 'text-neutral-500'}`}>
                        {op.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INPUT ACCOUNT ROUTER FIELDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Account Type</label>
                <select 
                  value={accountType} onChange={(e) => setAccountType(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs font-medium bg-neutral-50 focus:outline-none focus:border-black focus:bg-white"
                >
                  <option value="Personal">Personal Account</option>
                  <option value="Agent">Agent Account</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Wallet Number</label>
                <input 
                  type="tel" placeholder="01XXXXXXXXX" required value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ''))}
                  className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs font-mono focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* BALANCE CONFIGURATION BOX */}
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">Amount to Transfer (BDT)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">$</span>
                <input 
                  type="number" min="100" placeholder="Min. 100 BDT" required value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black"
                />
              </div>
              <span className="text-[10px] text-neutral-400 block mt-1.5 font-medium"> Available Wallet Reserve Pool: <b>${Number(affiliateBalance?.withdrawableBalance || 0).toFixed(2)} BDT</b></span>
            </div>

            <button 
              type="submit" disabled={submitting || !amount || !accountNumber}
              className="w-full bg-black text-white hover:bg-neutral-900 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Processing Network Transaction...' : <><ArrowUpRight size={14}/> Submit Settlement Request</>}
            </button>
          </form>
        </div>

        {/* COMPLIANCE INFORMATION SIDEBAR */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 text-white space-y-4">
          <div className="flex items-center gap-2 text-amber-400"><ShieldCheck size={18} /> <h4 className="text-xs font-bold uppercase tracking-wider">Payout Security Rules</h4></div>
          <ul className="space-y-3 text-[11px] text-neutral-400 leading-relaxed list-disc list-inside pl-0.5">
            <li>Minimum payout limit threshold is <span className="text-white font-bold">100.00 BDT</span> per execution loop.</li>
            <li>Processing timelines for manual dashboard batch validations take up to <span className="text-white font-bold">24-48 business hours</span>.</li>
            <li>Please double check cashout destination routing configurations. Outbound funds matching typo numbers cannot be recalled.</li>
          </ul>
        </div>
      </div>

      {/* RECENT WITHDRAWAL HISTORY AUDIT TRAIL LOG */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-neutral-100"><h3 className="text-xs font-bold text-neutral-950 uppercase tracking-wider">Audit History Log</h3></div>
        
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400 font-medium">Parsing transaction logs...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 font-medium">No previous withdrawal distributions recorded.</div>
        ) : (
          <div className="w-full">
            {/* 📱 MOBILE INSTANCE COMPONENT */}
            <div className="block sm:hidden divide-y divide-neutral-100">
              {history.map((log) => (
                <div key={log._id} className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-neutral-900">{log.method} ({log.accountType})</span>
                    <span className="font-black text-neutral-950">${log.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span>{log.accountNumber}</span>
                    <span className={`font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-md ${log.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : log.status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{log.status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 🖥️ DESKTOP LOG SHEET TABLE */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-[10px] font-bold uppercase text-neutral-400 border-b border-neutral-100">
                    <th className="px-6 py-3">Submission Date</th>
                    <th className="px-6 py-3">Routing Operator</th>
                    <th className="px-6 py-3">Target Wallet Number</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Total Disbursed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {history.map((log) => (
                    <tr key={log._id} className="hover:bg-neutral-50/40 transition-colors">
                      <td className="px-6 py-4 text-neutral-500">{new Date(log.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-bold text-neutral-900">{log.method} <span className="text-[10px] font-normal text-neutral-400">({log.accountType})</span></td>
                      <td className="px-6 py-4 font-mono text-neutral-600">{log.accountNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${log.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : log.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-neutral-950">${log.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}