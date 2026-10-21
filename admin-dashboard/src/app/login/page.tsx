'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await api.post('/auth/otp/request', { mobile }); setStep('otp'); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  }
  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { mobile, code });
      const role = data.user?.role;
      if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'CONTEST_MANAGER', 'SUPPORT_ADMIN'].includes(role)) { setError('This account does not have admin access.'); return; }
      localStorage.setItem('admin_access_token', data.accessToken);
      router.push('/dashboard');
    } catch (err: any) { setError(err.response?.data?.message || 'Invalid OTP'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <img src="/ojas-logo.jpg" alt="OJAS: Talent Hunt, Contest, Audition, Events" className="w-full rounded-xl mb-6" />
        <h1 className="text-xl font-bold mb-1 text-gray-900">Admin Sign In</h1>
        <p className="text-sm text-gray-600 mb-6 font-bold">OJAS Talent Platform</p>
        {step === 'mobile' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div><label className="text-sm font-bold text-gray-700">Mobile number</label><input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9999999999" required /></div>
            {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
            <button disabled={loading} className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Sending...' : 'Send OTP'}</button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div><label className="text-sm font-bold text-gray-700">Enter OTP sent to {mobile}</label><input className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required /></div>
            {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
            <button disabled={loading} className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Verifying...' : 'Verify & Sign In'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
