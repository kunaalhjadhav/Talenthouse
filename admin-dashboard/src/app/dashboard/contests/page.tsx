'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ContestsPage() {
  const { data, mutate, isLoading } = useSWR('/admin/contests/pending', fetcher);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  async function approve(id: string) {
    await api.patch(`/admin/contests/${id}/approve`);
    mutate();
  }

  async function reject(id: string) {
    await api.patch(`/admin/contests/${id}/reject`, { reason });
    setRejecting(null);
    setReason('');
    mutate();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Contests Pending Approval</h1>
      <p className="text-sm text-gray-500 mb-6">Review host-submitted contests before they go live.</p>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {data?.length === 0 && <p className="text-sm text-gray-500">No contests waiting for review.</p>}

      <div className="space-y-3">
        {data?.map((c: any) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">{c.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {c.category} · Entry ₹{c.entryFee} · {new Date(c.startDate).toLocaleDateString()} –{' '}
                  {new Date(c.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.description}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => approve(c.id)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => setRejecting(c.id)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Reject
                </button>
              </div>
            </div>

            {rejecting === c.id && (
              <div className="mt-4 flex gap-2">
                <input
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  placeholder="Reason for rejection"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <button onClick={() => reject(c.id)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg">
                  Confirm reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
