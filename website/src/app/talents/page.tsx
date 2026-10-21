'use client';
import { useEffect, useState } from 'react';
import CategoryChips from '@/components/CategoryChips';
import { TALENT_CATEGORIES } from '@/lib/categories';
import { fetchCategories } from '@/lib/api';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
export default function TalentsPage() {
  const [category, setCategory] = useState('All');
  const [cats, setCats] = useState<string[]>(TALENT_CATEGORIES);
  useEffect(() => { fetchCategories('TALENT', TALENT_CATEGORIES).then(setCats); }, []);
  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const params = category === 'All' ? '' : `?category=${encodeURIComponent(category)}`;
    fetch(`${API_URL}/talents${params}`).then((r) => r.json()).then(setTalents).catch(() => setTalents([])).finally(() => setLoading(false));
  }, [category]);
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Book Talent</h1>
      <p className="text-sm font-bold text-gray-700 mb-6">Browse verified talent by category.</p>
      <CategoryChips categories={cats} active={category} onChange={setCategory} />
      {loading ? (<p className="text-gray-700 font-bold">Loading...</p>) : talents.length === 0 ? (<p className="text-gray-700 font-bold">No talent profiles in this category yet.</p>) : (
        <div className="grid md:grid-cols-4 gap-5">
          {talents.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-xl p-4">
              {t.user?.profilePhoto ? (<img src={t.user.profilePhoto} alt="" className="w-full aspect-square object-cover rounded-lg mb-3" />) : (<div className="w-full aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-3xl font-bold text-gray-400">{(t.stageName || t.user?.name || '?')[0]}</div>)}
              <p className="font-bold text-gray-900">{t.stageName || t.user?.name || 'Talent'}</p>
              <p className="text-sm font-bold text-gray-700">{t.category}</p>
              <p className="text-sm font-bold text-gray-700">From ₹{t.basePrice}</p>
              {t.rating ? <p className="text-xs font-bold text-amber-600 mt-1">★ {Number(t.rating).toFixed(1)}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
