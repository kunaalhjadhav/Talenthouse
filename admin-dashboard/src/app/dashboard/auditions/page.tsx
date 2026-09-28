'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function AuditionsPage() {
  const { data, mutate, isLoading } = useSWR('/admin/auditions/pending', fetcher);

  async function approve(id: string) {
    await api.patch(`/admin/auditions/${id}/approve`);
    mutate();
  }

  async function reject(id: string) {
    await api.patch(`/admin/auditions/${id}/reject`);
    mutate();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Auditions Pending Approval</h1>
      <p className="text-sm text-gray-500 mb-6">Review recruiter-submitted auditions before they go live.</p>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {data?.length === 0 && <p className="text-sm text-gray-500">No auditions waiting for review.</p>}

      <div className="space-y-3">
        {data?.map((a: any) => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">{a.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {a.companyName || 'Independent'} · {a.category} · Deadline {new Date(a.applicationDeadline).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{a.description}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => approve(a.id)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">
                Approve
              </button>
              <button onClick={() => reject(a.id)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
