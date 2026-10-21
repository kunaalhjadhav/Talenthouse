'use client';
import { useEffect, useState } from 'react';
import CategoryChips from '@/components/CategoryChips';
import { AUDITION_CATEGORIES } from '@/lib/categories';
import { fetchCategories } from '@/lib/api';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
export default function AuditionsPage() {
  const [category, setCategory] = useState('All');
  const [cats, setCats] = useState<string[]>(AUDITION_CATEGORIES);
  useEffect(() => { fetchCategories('AUDITION', AUDITION_CATEGORIES).then(setCats); }, []);
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const params = category === 'All' ? '' : `?category=${encodeURIComponent(category)}`;
    fetch(`${API_URL}/auditions${params}`).then((r) => r.json()).then(setAuditions).catch(() => setAuditions([])).finally(() => setLoading(false));
  }, [category]);
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Open Auditions</h1>
      <p className="text-sm font-bold text-gray-700 mb-6">Filter by production type to find auditions matching your craft.</p>
      <CategoryChips categories={cats} active={category} onChange={setCategory} />
      {loading ? (<p className="text-gray-700 font-bold">Loading...</p>) : auditions.length === 0 ? (<p className="text-gray-700 font-bold">No auditions in this category right now.</p>) : (
        <div className="grid md:grid-cols-3 gap-5">
          {auditions.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="h-24 bg-gray-100 flex items-center justify-center text-2xl text-gray-400">{a.posterUrl ? <img src={a.posterUrl} className="w-full h-full object-cover" /> : '🎬'}</div>
              <div className="p-4">
                <p className="font-bold text-gray-900">{a.title}</p>
                <p className="text-sm font-bold text-gray-700 mt-1">{a.companyName || 'Independent'} · {a.category}</p>
                {a.designation && <p className="text-sm font-bold text-brand-600 mt-2">Casting for: {a.designation}</p>}
                <p className="text-xs font-bold text-gray-500 mt-2">Apply by {new Date(a.applicationDeadline).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
