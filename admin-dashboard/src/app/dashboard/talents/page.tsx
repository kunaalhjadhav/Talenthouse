'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function TalentsPage() {
  const { data, mutate, isLoading } = useSWR('/admin/talents/pending', fetcher);

  async function verify(id: string) {
    await api.patch(`/admin/talents/${id}/verify`);
    mutate();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Talent Verification Queue</h1>
      <p className="text-sm text-gray-500 mb-6">Approve talent profiles before they appear in public search.</p>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {data?.length === 0 && <p className="text-sm text-gray-500">No talents waiting for verification.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((t: any) => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{t.stageName || t.category}</p>
              <p className="text-sm text-gray-500">{t.category} · ₹{t.basePrice} base · {t.city || 'No city set'}</p>
            </div>
            <button onClick={() => verify(t.id)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              Verify
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
