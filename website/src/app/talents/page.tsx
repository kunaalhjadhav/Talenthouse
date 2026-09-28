import { apiGet } from '@/lib/api';

export const metadata = { title: 'Book Talent — Talent Platform' };

export default async function TalentsPage() {
  const talents = (await apiGet<any[]>('/talents')) || [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Book Talent</h1>
      {talents.length === 0 ? (
        <p className="text-gray-500">No talent profiles yet.</p>
      ) : (
        <div className="grid md:grid-cols-4 gap-5">
          {talents.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-xl p-4">
              <p className="font-medium text-gray-900">{t.stageName || t.user?.name || 'Talent'}</p>
              <p className="text-sm text-gray-500 mt-1">{t.category}</p>
              <p className="text-sm text-gray-500">From ₹{t.basePrice}</p>
              {t.rating && <p className="text-xs text-amber-600 mt-1">★ {Number(t.rating).toFixed(1)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
