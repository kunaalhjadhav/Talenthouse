import Link from 'next/link';
import { apiGet } from '@/lib/api';

export default async function HomePage() {
  const contests = (await apiGet<any[]>('/contests')) || [];
  const talents = (await apiGet<any[]>('/talents')) || [];

  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
          Perform. Compete. Get Discovered.
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
          Join contests, apply to auditions, and book verified talent — all in one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/contests" className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700">
            Browse Contests
          </Link>
          <Link href="/talents" className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50">
            Find Talent
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Live Contests</h2>
          <Link href="/contests" className="text-sm text-brand-600 font-medium">View all →</Link>
        </div>
        {contests.length === 0 ? (
          <p className="text-gray-500 text-sm">No live contests right now — check back soon.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {contests.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/contests/${c.id}`} className="border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <p className="font-semibold text-gray-900">{c.title}</p>
                <p className="text-sm text-gray-500 mt-1">{c.category} · Entry ₹{c.entryFee}</p>
                <p className="text-sm text-gray-500">Prize ₹{c.prizePool}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Featured Talent</h2>
          <Link href="/talents" className="text-sm text-brand-600 font-medium">View all →</Link>
        </div>
        {talents.length === 0 ? (
          <p className="text-gray-500 text-sm">No talent profiles yet.</p>
        ) : (
          <div className="grid md:grid-cols-4 gap-5">
            {talents.slice(0, 8).map((t) => (
              <div key={t.id} className="border border-gray-200 rounded-xl p-4">
                <p className="font-medium text-gray-900">{t.stageName || t.user?.name || 'Talent'}</p>
                <p className="text-sm text-gray-500 mt-1">{t.category} · From ₹{t.basePrice}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
