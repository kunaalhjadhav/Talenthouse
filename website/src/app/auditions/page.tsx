import { apiGet } from '@/lib/api';

export const metadata = { title: 'Auditions — Talent Platform' };

export default async function AuditionsPage() {
  const auditions = (await apiGet<any[]>('/auditions')) || [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Open Auditions</h1>
      {auditions.length === 0 ? (
        <p className="text-gray-500">No live auditions right now.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {auditions.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-xl p-5">
              <p className="font-semibold text-gray-900">{a.title}</p>
              <p className="text-sm text-gray-500 mt-1">{a.companyName || 'Independent'} · {a.category}</p>
              <p className="text-xs text-gray-400 mt-2">Apply by {new Date(a.applicationDeadline).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
