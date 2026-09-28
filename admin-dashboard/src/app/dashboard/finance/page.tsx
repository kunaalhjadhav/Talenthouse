'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function FinancePage() {
  const [tab, setTab] = useState<'kyc' | 'withdrawals'>('kyc');
  const { data: kyc, mutate: mutateKyc } = useSWR('/wallet/admin/kyc/pending', fetcher);
  const { data: withdrawals, mutate: mutateWithdrawals } = useSWR('/wallet/admin/withdrawals/pending', fetcher);

  async function approveKyc(id: string) {
    await api.patch(`/wallet/admin/kyc/${id}/approve`);
    mutateKyc();
  }
  async function rejectKyc(id: string) {
    const reason = prompt('Reason for rejection?') || 'Not specified';
    await api.patch(`/wallet/admin/kyc/${id}/reject`, { reason });
    mutateKyc();
  }
  async function processWithdrawal(id: string, status: 'PAID' | 'FAILED' | 'REJECTED') {
    let payoutReference: string | undefined;
    if (status === 'PAID') payoutReference = prompt('Payout reference (bank UTR / RazorpayX id)') || undefined;
    await api.patch(`/wallet/admin/withdrawals/${id}/process`, { status, payoutReference });
    mutateWithdrawals();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Finance</h1>
      <p className="text-sm text-gray-500 mb-6">KYC approvals and withdrawal payouts.</p>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('kyc')} className={`px-3 py-1.5 text-sm font-medium rounded-lg ${tab === 'kyc' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
          KYC Queue {kyc?.length ? `(${kyc.length})` : ''}
        </button>
        <button onClick={() => setTab('withdrawals')} className={`px-3 py-1.5 text-sm font-medium rounded-lg ${tab === 'withdrawals' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}>
          Withdrawal Requests {withdrawals?.length ? `(${withdrawals.length})` : ''}
        </button>
      </div>

      {tab === 'kyc' && (
        <div className="space-y-3">
          {kyc?.length === 0 && <p className="text-sm text-gray-500">No pending KYC submissions.</p>}
          {kyc?.map((k: any) => (
            <div key={k.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">{k.user?.name || k.user?.mobile} <span className="text-xs text-gray-500">({k.user?.role})</span></p>
                <p className="text-sm text-gray-500 mt-1">PAN: {k.panNumber} · A/C: {k.bankAccountNo} · IFSC: {k.ifsc}</p>
                <p className="text-sm text-gray-500">Account holder: {k.accountHolder}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => approveKyc(k.id)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">Approve</button>
                <button onClick={() => rejectKyc(k.id)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="space-y-3">
          {withdrawals?.length === 0 && <p className="text-sm text-gray-500">No pending withdrawal requests.</p>}
          {withdrawals?.map((w: any) => (
            <div key={w.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">{w.user?.name || w.user?.mobile}</p>
                <p className="text-sm text-gray-500 mt-1">₹{w.amount} · Requested {new Date(w.requestedAt).toLocaleDateString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  KYC: A/C {w.user?.kyc?.bankAccountNo} · IFSC {w.user?.kyc?.ifsc} · {w.user?.kyc?.accountHolder}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => processWithdrawal(w.id, 'PAID')} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">Mark Paid</button>
                <button onClick={() => processWithdrawal(w.id, 'REJECTED')} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
