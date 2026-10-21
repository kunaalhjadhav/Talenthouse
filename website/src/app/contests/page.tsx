'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import CategoryChips from '@/components/CategoryChips';
import { CONTENT_CATEGORIES } from '@/lib/categories';
import { fetchCategories } from '@/lib/api';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function regStatus(c: any) {
  const closesAt = new Date(c.registrationClosesAt);
  const full = c.maxParticipants && (c.registeredCount ?? 0) >= c.maxParticipants;
  if (full) return { label: 'FULL', cls: 'bg-red-100 text-red-700' };
  if (closesAt < new Date()) return { label: 'CLOSED', cls: 'bg-gray-100 text-gray-700' };
  const hoursLeft = (closesAt.getTime() - Date.now()) / 3600000;
  if (hoursLeft < 48) return { label: 'CLOSING SOON', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'OPEN', cls: 'bg-green-100 text-green-700' };
}

export default function ContestsPage() {
  const [category, setCategory] = useState('All');
  const [cats, setCats] = useState<string[]>(CONTENT_CATEGORIES);
  useEffect(() => { fetchCategories('CONTEST', CONTENT_CATEGORIES).then(setCats); }, []);
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const params = category === 'All' ? '' : `?category=${encodeURIComponent(category)}`;
    fetch(`${API_URL}/contests${params}`).then((r) => r.json()).then(setContests).catch(() => setContests([])).finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Live Contests & Challenges</h1>
      <p className="text-sm font-bold text-gray-700 mb-6">Filter by category to find the right contest for you.</p>
      <CategoryChips categories={cats} active={category} onChange={setCategory} />
      {loading ? (<p className="text-gray-700 font-bold">Loading...</p>) : contests.length === 0 ? (<p className="text-gray-700 font-bold">No contests in this category right now.</p>) : (
        <div className="grid md:grid-cols-3 gap-5">
          {contests.map((c) => { const rs = regStatus(c); return (
            <Link key={c.id} href={`/contests/${c.id}`} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
              <div className="h-32 bg-gray-900 flex items-center justify-center text-white text-xl relative">
                {c.bannerUrl ? <img src={c.bannerUrl} className="w-full h-full object-cover" /> : '▶'}
                <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${rs.cls}`}>{rs.label}</span>
              </div>
              <div className="p-4">
                <p className="font-bold text-gray-900">{c.title}</p>
                <p className="text-sm font-bold text-gray-700 mt-1">{c.category} · Entry ₹{c.entryFee}</p>
                <p className="text-sm font-bold text-gray-700">Prize pool ₹{c.prizePool} · {c.numWinners} winner{c.numWinners === 1 ? '' : 's'}</p>
                <p className="text-xs font-bold text-gray-500 mt-2">{c.registeredCount ?? 0}{c.maxParticipants ? `/${c.maxParticipants}` : ''} registered · Closes {new Date(c.registrationClosesAt).toLocaleDateString()}</p>
              </div>
            </Link>
          ); })}
        </div>
      )}
    </div>
  );
}
