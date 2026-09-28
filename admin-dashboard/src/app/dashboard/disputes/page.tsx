'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function DisputesPage() {
  const { data, mutate, isLoading } = useSWR('/disputes/admin/pending', fetcher);
  const [resolving, setResolving] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  async function resolve(d: any, outcome: string) {
    await api.patch(`/disputes/admin/${d.id}/resolve`, {
      outcome,
      resolutionNote: note || 'Resolved by admin',
      refundUserId: outcome === 'RESOLVED_REFUND' ? d.raisedById : undefined,
      refundAmount: outcome === 'RESOLVED_REFUND' ? Number(refundAmount) : undefined,
    });
    setResolving(null);
    setNote('');
    setRefundAmount('');
    mutate();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Disputes</h1>
      <p className="text-sm text-gray-500 mb-6">Booking, contest, and payment disputes awaiting resolution.</p>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {data?.length === 0 && <p className="text-sm text-gray-500">No open disputes.</p>}

      <div className="space-y-3">
        {data?.map((d: any) => (
          <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">{d.type} · Ref: {d.referenceId}</p>
                <p className="text-sm text-gray-600 mt-1">{d.description}</p>
                <p className="text-xs text-gray-400 mt-2">Raised {new Date(d.createdAt).toLocaleDateString()} · Status: {d.status}</p>
              </div>
              <button
                onClick={() => setResolving(resolving === d.id ? null : d.id)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shrink-0"
              >
                Resolve
              </button>
            </div>

            {resolving === d.id && (
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Resolution note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                  <input
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
                    placeholder="Refund amount (₹)"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                  <button onClick={() => resolve(d, 'RESOLVED_REFUND')} className="px-3 py-2 text-sm bg-amber-600 text-white rounded-lg">
                    Resolve with refund
                  </button>
                  <button onClick={() => resolve(d, 'RESOLVED_NO_ACTION')} className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg">
                    Resolve — no action
                  </button>
                  <button onClick={() => resolve(d, 'REJECTED')} className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg">
                    Reject dispute
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
