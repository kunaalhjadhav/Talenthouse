'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';
import ResourceManager from '@/components/ResourceManager';
const fetcher = (url: string) => api.get(url).then((r) => r.data);
export default function DisputesPage() {
  const [tab, setTab] = useState<'queue' | 'all'>('queue');
  const { data, mutate, isLoading } = useSWR('/disputes/admin/pending', fetcher);
  const [resolving, setResolving] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  async function resolve(d: any, outcome: string) {
    await api.patch(`/disputes/admin/${d.id}/resolve`, { outcome, resolutionNote: note || 'Resolved by admin', refundUserId: outcome === 'RESOLVED_REFUND' ? d.raisedById : undefined, refundAmount: outcome === 'RESOLVED_REFUND' ? Number(refundAmount) : undefined });
    setResolving(null); setNote(''); setRefundAmount(''); mutate();
  }
  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-1">Disputes</h1>
      <p className="text-sm text-gray-600 font-bold mb-6">Booking, contest, and payment disputes awaiting resolution.</p>
      <div className="flex gap-2 mb-5"><button onClick={() => setTab('queue')} className={`px-3 py-1.5 text-sm font-bold rounded-lg ${tab === 'queue' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-800'}`}>Open queue (resolve / refund)</button><button onClick={() => setTab('all')} className={`px-3 py-1.5 text-sm font-bold rounded-lg ${tab === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-800'}`}>All disputes</button></div>
      {tab === 'all' && <ResourceManager resource="disputes" hideHeader />}
      {tab === 'queue' && <>
      {isLoading && <p className="text-sm text-gray-600 font-bold">Loading...</p>}
      {data?.length === 0 && <p className="text-sm text-gray-600 font-bold">No open disputes.</p>}
      <div className="space-y-3">
        {data?.map((d: any) => (
          <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-bold text-gray-900">{d.type} · Ref: {d.referenceId}</p><p className="text-sm text-gray-700 font-bold mt-1">{d.description}</p></div>
              <button onClick={() => setResolving(resolving === d.id ? null : d.id)} className="px-3 py-1.5 text-sm font-bold rounded-lg bg-indigo-600 text-white shrink-0">Resolve</button>
            </div>
            {resolving === d.id && (
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900" placeholder="Resolution note" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex gap-2 flex-wrap">
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 w-40" placeholder="Refund amount (₹)" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                  <button onClick={() => resolve(d, 'RESOLVED_REFUND')} className="px-3 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg">Resolve w/ refund</button>
                  <button onClick={() => resolve(d, 'RESOLVED_NO_ACTION')} className="px-3 py-2 text-sm font-bold bg-gray-600 text-white rounded-lg">No action</button>
                  <button onClick={() => resolve(d, 'REJECTED')} className="px-3 py-2 text-sm font-bold bg-red-600 text-white rounded-lg">Reject</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </>}
    </div>
  );
}