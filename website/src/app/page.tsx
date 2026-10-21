import Link from 'next/link';
import { apiGet } from '@/lib/api';
export default async function HomePage() {
  const contests = (await apiGet<any[]>('/contests')) || [];
  const talents = (await apiGet<any[]>('/talents')) || [];
  const live = (await apiGet<any[]>('/live')) || [];
  const stats = await apiGet<any>('/public/stats', 30);
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 text-center">
        <img src="/ojas-logo.jpg" alt="OJAS: Talent Hunt, Contest, Audition, Events" className="mx-auto w-full max-w-md rounded-3xl shadow-lg mb-10" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">Perform. Compete. Get Discovered.</h1>
        <p className="mt-4 text-lg font-bold text-gray-700 max-w-2xl mx-auto">Join contests, apply to auditions, and book verified talent — all in one place.</p>
        <div className="mt-8 flex justify-center gap-3"><Link href="/contests" className="bg-brand-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-brand-700">Browse Contests</Link><Link href="/talents" className="bg-white border border-gray-300 text-gray-800 px-6 py-3 rounded-lg font-bold hover:bg-gray-50">Find Talent</Link></div>
      </section>
      {stats && (
        <section className="max-w-6xl mx-auto px-6 pb-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[['Live contests', stats.liveContests], ['Prize money live', `₹${Number(stats.prizeMoneyLive).toLocaleString('en-IN')}`], ['Verified talents', stats.verifiedTalents], ['Registrations', stats.registrations]].map(([l, v]) => (<div key={String(l)} className="border border-gray-200 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-gray-900">{v}</p><p className="text-xs font-bold text-gray-600 uppercase mt-1">{l}</p></div>))}</div></section>
      )}
      {live.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">🔴 Live Now</h2>
          <div className="grid md:grid-cols-3 gap-5">{live.slice(0, 3).map((l) => (<div key={l.id} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-900 text-white"><div className="h-24 bg-gray-800 flex items-center justify-center text-2xl">{l.thumbnailUrl ? <img src={l.thumbnailUrl} className="w-full h-full object-cover" /> : '▶'}</div><div className="p-4"><p className="font-bold">{l.title}</p><p className="text-sm font-bold text-gray-300 mt-1">{l.viewerCount ?? 0} watching</p></div></div>))}</div>
        </section>
      )}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-gray-900">🏆 Contests & Challenges</h2><Link href="/contests" className="text-sm text-brand-600 font-bold">View all →</Link></div>
        {contests.length === 0 ? (<p className="text-gray-700 font-bold text-sm">No live contests right now — check back soon.</p>) : (
          <div className="grid md:grid-cols-3 gap-5">{contests.slice(0, 6).map((c) => (<Link key={c.id} href={`/contests/${c.id}`} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"><div className="h-28 bg-gray-900 flex items-center justify-center text-white text-xl">{c.bannerUrl ? <img src={c.bannerUrl} className="w-full h-full object-cover" /> : '▶'}</div><div className="p-4"><p className="font-bold text-gray-900">{c.title}</p><p className="text-sm font-bold text-gray-700 mt-1">{c.category} · Entry ₹{c.entryFee}</p><p className="text-sm font-bold text-gray-700">Prize ₹{c.prizePool} · {c.registeredCount ?? 0}{c.maxParticipants ? `/${c.maxParticipants}` : ''} registered</p></div></Link>))}</div>
        )}
      </section>
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-gray-900">Featured Talent</h2><Link href="/talents" className="text-sm text-brand-600 font-bold">View all →</Link></div>
        {talents.length === 0 ? (<p className="text-gray-700 font-bold text-sm">No talent profiles yet.</p>) : (
          <div className="grid md:grid-cols-4 gap-5">{talents.slice(0, 8).map((t) => (<div key={t.id} className="border border-gray-200 rounded-xl p-4"><div className="flex items-center gap-3 mb-2">{t.user?.profilePhoto ? <img src={t.user.profilePhoto} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">{(t.stageName || t.user?.name || '?')[0]}</div>}<p className="font-bold text-gray-900">{t.stageName || t.user?.name || 'Talent'}</p></div><p className="text-sm font-bold text-gray-700">{t.category} · From ₹{t.basePrice}</p></div>))}</div>
        )}
      </section>
    </div>
  );
}
