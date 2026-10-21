'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';
const fetcher = (url: string) => api.get(url).then((r) => r.data);
export default function GamificationPage() {
  const { data: board } = useSWR('/engagement/leaderboard?take=25', fetcher, { refreshInterval: 30000 });
  const { data: defs } = useSWR('/engagement/definitions', fetcher);
  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-1">Badges and Levels</h1>
      <p className="text-sm text-gray-600 font-bold mb-6">XP amounts are set under Config Engine. Badges are awarded automatically.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white border border-gray-200 rounded-xl p-5 lg:col-span-2">
          <h2 className="font-bold text-gray-900 mb-3">Leaderboard</h2>
          <table className="w-full text-sm"><thead className="text-gray-700 text-xs uppercase font-bold"><tr><th className="text-left py-2">#</th><th className="text-left py-2">Creator</th><th className="text-left py-2">Level</th><th className="text-right py-2">XP</th></tr></thead>
            <tbody>{board?.length === 0 && <tr><td colSpan={4} className="py-3 font-bold text-gray-600">Nobody has earned XP yet.</td></tr>}{board?.map((u: any) => (<tr key={u.id} className="border-t border-gray-100 font-bold text-gray-900"><td className="py-2">{u.rank}</td><td className="py-2">{u.name || 'Unnamed'}</td><td className="py-2">{u.level}</td><td className="py-2 text-right">{u.xp}</td></tr>))}</tbody>
          </table>
        </section>
        <section className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5"><h2 className="font-bold text-gray-900 mb-3">Levels</h2>{defs?.levels.map((l: any) => (<div key={l.name} className="flex justify-between text-sm font-bold text-gray-900 py-1"><span>{l.name}</span><span className="text-gray-600">{l.min} XP</span></div>))}</div>
          <div className="bg-white border border-gray-200 rounded-xl p-5"><h2 className="font-bold text-gray-900 mb-3">Badges</h2>{defs && Object.values(defs.badges).map((b: any) => (<p key={b} className="text-sm font-bold text-gray-900 py-1">{b}</p>))}</div>
        </section>
      </div>
    </div>
  );
}
