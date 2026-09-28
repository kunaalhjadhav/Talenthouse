import Link from 'next/link';
import { apiGet } from '@/lib/api';

export const metadata = { title: 'Contests — Talent Platform' };

export default async function ContestsPage() {
  const contests = (await apiGet<any[]>('/contests')) || [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Live Contests</h1>
      {contests.length === 0 ? (
        <p className="text-gray-500">No live contests right now — check back soon.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {contests.map((c) => (
            <Link key={c.id} href={`/contests/${c.id}`} className="border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
              <p className="font-semibold text-gray-900">{c.title}</p>
              <p className="text-sm text-gray-500 mt-1">{c.category} · Entry ₹{c.entryFee}</p>
              <p className="text-sm text-gray-500">Prize pool ₹{c.prizePool} · {c.numWinners} winner{c.numWinners === 1 ? '' : 's'}</p>
              <p className="text-xs text-gray-400 mt-2">Closes {new Date(c.registrationClosesAt).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
