'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';
import ResourceManager from '@/components/ResourceManager';
const fetcher = (url: string) => api.get(url).then((r) => r.data);
export default function FinancePage() {
  const [tab, setTab] = useState<'kyc' | 'withdrawals' | 'kycAll' | 'wdAll'>('kyc');
  const { data: kyc, mutate: mutateKyc } = useSWR('/wallet/admin/kyc/pending', fetcher);
  const { data: withdrawals, mutate: mutateWithdrawals } = useSWR('/wallet/admin/withdrawals/pending', fetcher);
  async function approveKyc(id: string) { await api.patch(`/wallet/admin/kyc/${id}/approve`); mutateKyc(); }
  async function rejectKyc(id: string) { const reason = prompt('Reason for rejection?') || 'Not specified'; await api.patch(`/wallet/admin/kyc/${id}/reject`, { reason }); mutateKyc(); }
  async function processWithdrawal(id: string, status: 'PAID' | 'FAILED' | 'REJECTED') { let payoutReference: string | undefined; if (status === 'PAID') payoutReference = prompt('Payout reference') || undefined; await api.patch(`/wallet/admin/withdrawals/${id}/process`, { status, payoutReference }); mutateWithdrawals(); }
  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-1">Finance</h1>
      <p className="text-sm text-gray-600 font-bold mb-6">KYC approvals and withdrawal payouts.</p>
      <div className="flex gap-2 mb-5"><button onClick={() => setTab('kyc')} className={`px-3 py-1.5 text-sm font-bold rounded-lg ${tab === 'kyc' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-800'}`}>KYC Queue {kyc?.length ? `(${kyc.length})` : ''}</button><button onClick={() => setTab('withdrawals')} className={`px-3 py-1.5 text-sm font-bold rounded-lg ${tab === 'withdrawals' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-800'}`}>Withdrawal Requests {withdrawals?.length ? `(${withdrawals.length})` : ''}</button><button onClick={() => setTab('kycAll')} className={`px-3 py-1.5 text-sm font-bold rounded-lg ${tab === 'kycAll' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-800'}`}>All KYC</button><button onClick={() => setTab('wdAll')} className={`px-3 py-1.5 text-sm font-bold rounded-lg ${tab === 'wdAll' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-800'}`}>All withdrawals</button></div>
      {tab === 'kyc' && (<div className="space-y-3">{kyc?.length === 0 && <p className="text-sm text-gray-600 font-bold">No pending KYC submissions.</p>}{kyc?.map((k: any) => (<div key={k.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4"><div><p className="font-bold text-gray-900">{k.user?.name || k.user?.mobile} <span className="text-xs text-gray-600">({k.user?.role})</span></p><p className="text-sm text-gray-700 font-bold mt-1">PAN: {k.panNumber} · A/C: {k.bankAccountNo} · IFSC: {k.ifsc}</p></div><div className="flex gap-2 shrink-0"><button onClick={() => approveKyc(k.id)} className="px-3 py-1.5 text-sm font-bold rounded-lg bg-green-600 text-white">Approve</button><button onClick={() => rejectKyc(k.id)} className="px-3 py-1.5 text-sm font-bold rounded-lg bg-white border border-gray-300 text-gray-800">Reject</button></div></div>))}</div>)}
      {tab === 'withdrawals' && (<div className="space-y-3">{withdrawals?.length === 0 && <p className="text-sm text-gray-600 font-bold">No pending withdrawal requests.</p>}{withdrawals?.map((w: any) => (<div key={w.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4"><div><p className="font-bold text-gray-900">{w.user?.name || w.user?.mobile}</p><p className="text-sm text-gray-700 font-bold mt-1">₹{w.amount} · Requested {new Date(w.requestedAt).toLocaleDateString()}</p></div><div className="flex gap-2 shrink-0"><button onClick={() => processWithdrawal(w.id, 'PAID')} className="px-3 py-1.5 text-sm font-bold rounded-lg bg-green-600 text-white">Mark Paid</button><button onClick={() => processWithdrawal(w.id, 'REJECTED')} className="px-3 py-1.5 text-sm font-bold rounded-lg bg-white border border-gray-300 text-gray-800">Reject</button></div></div>))}</div>)}
      {tab === 'kycAll' && <ResourceManager resource="kyc" hideHeader />}
      {tab === 'wdAll' && <ResourceManager resource="withdrawals" hideHeader />}
    </div>
  );
}
