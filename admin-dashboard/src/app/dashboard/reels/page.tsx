'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ReelsModerationPage() {
  const { data, mutate, isLoading } = useSWR('/admin/reels/pending', fetcher);

  async function approve(id: string) {
    await api.patch(`/admin/reels/${id}/approve`);
    mutate();
  }

  async function remove(id: string) {
    await api.patch(`/admin/reels/${id}/remove`);
    mutate();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Reels Moderation Queue</h1>
      <p className="text-sm text-gray-500 mb-6">Reels reported by users, awaiting review.</p>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {data?.length === 0 && <p className="text-sm text-gray-500">Nothing under review right now.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map((r: any) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">{r.category}</p>
            <p className="text-sm text-gray-800 mt-1 line-clamp-2">{r.caption || '(no caption)'}</p>
            <p className="text-xs text-gray-400 mt-2">{r.views} views · {r.likes} likes</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => approve(r.id)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700">
                Restore
              </button>
              <button onClick={() => remove(r.id)} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700">
                Remove permanently
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
