import { apiGet } from '@/lib/api';
export const metadata = { title: 'Hall of Fame' };
export default async function HallOfFame() {
  const d = await apiGet<any>('/public/hall-of-fame', 30);
  const none = (t: string) => <p className="text-sm font-bold text-gray-700">{t}</p>;
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Hall of Fame</h1>
      <p className="mt-2 font-bold text-gray-700">Top creators, contest winners and Golden Buzzer stars.</p>
      <div className="grid md:grid-cols-3 gap-8 mt-10">
        <section><h2 className="text-lg font-bold text-gray-900 mb-4">Top creators</h2>
          {!d?.topCreators?.length ? none('No rankings yet.') : <ol className="space-y-3">{d.topCreators.map((u: any) => (<li key={u.id} className="flex justify-between border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900"><span>{u.rank}. {u.name || 'Creator'}</span><span className="text-gray-700">{u.level} · {u.xp} XP</span></li>))}</ol>}</section>
        <section><h2 className="text-lg font-bold text-gray-900 mb-4">Recent winners</h2>
          {!d?.recentWinners?.length ? none('No completed contests yet.') : <ul className="space-y-3">{d.recentWinners.map((w: any, i: number) => (<li key={i} className="border border-gray-200 rounded-xl px-4 py-3"><p className="font-bold text-gray-900">🏆 {w.name || 'Winner'}</p><p className="text-sm font-bold text-gray-700">{w.contest} · Prize pool ₹{w.prize}</p></li>))}</ul>}</section>
        <section><h2 className="text-lg font-bold text-gray-900 mb-4">Golden Buzzer</h2>
          {!d?.goldenBuzzers?.length ? none('No golden buzzers yet.') : <ul className="space-y-3">{d.goldenBuzzers.map((b: any, i: number) => (<li key={i} className="border border-gray-200 rounded-xl px-4 py-3"><p className="font-bold text-gray-900">⭐ {b.name || 'Performer'}</p><p className="text-sm font-bold text-gray-700">{b.contest}</p></li>))}</ul>}</section>
      </div>
    </div>
  );
}
