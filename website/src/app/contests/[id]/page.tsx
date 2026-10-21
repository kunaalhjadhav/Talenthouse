import { apiGet } from '@/lib/api';
import { notFound } from 'next/navigation';
export default async function ContestDetailPage({ params }: { params: { id: string } }) {
  const contest = await apiGet<any>(`/contests/${params.id}`, 30);
  if (!contest) notFound();
  const registeredCount = contest.registrations?.length ?? 0;
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="w-full rounded-xl mb-6 aspect-video bg-gray-900 flex items-center justify-center text-white text-3xl overflow-hidden">{contest.bannerUrl ? <img src={contest.bannerUrl} className="w-full h-full object-cover" /> : '▶'}</div>
      <h1 className="text-2xl font-bold text-gray-900">{contest.title}</h1>
      <p className="text-sm font-bold text-gray-700 mt-1">{contest.category} · {contest.mode}</p>
      <div className="grid grid-cols-4 gap-4 my-8">
        <div className="border border-gray-200 rounded-xl p-4"><p className="text-xs font-bold text-gray-600">Entry fee</p><p className="text-lg font-bold text-gray-900">₹{contest.entryFee}</p></div>
        <div className="border border-gray-200 rounded-xl p-4"><p className="text-xs font-bold text-gray-600">Prize pool</p><p className="text-lg font-bold text-gray-900">₹{contest.prizePool}</p></div>
        <div className="border border-gray-200 rounded-xl p-4"><p className="text-xs font-bold text-gray-600">Winners</p><p className="text-lg font-bold text-gray-900">{contest.numWinners}</p></div>
        <div className="border border-gray-200 rounded-xl p-4"><p className="text-xs font-bold text-gray-600">Registered</p><p className="text-lg font-bold text-gray-900">{registeredCount}{contest.maxParticipants ? `/${contest.maxParticipants}` : ''}</p></div>
      </div>
      <p className="text-xs font-bold text-gray-500 mb-6">Registration closes {new Date(contest.registrationClosesAt).toLocaleDateString()}</p>
      <p className="text-gray-800 font-bold leading-relaxed whitespace-pre-line">{contest.description}</p>
      {contest.rules && (<div className="mt-8"><h2 className="font-bold text-gray-900 mb-2">Rules</h2><p className="text-gray-800 font-bold leading-relaxed whitespace-pre-line">{contest.rules}</p></div>)}
      <a href="https://app.yourdomain.com" className="inline-block mt-8 bg-brand-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-brand-700">Register in the app</a>
    </div>
  );
}
