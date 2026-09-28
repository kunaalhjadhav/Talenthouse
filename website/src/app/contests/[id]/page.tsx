import { apiGet } from '@/lib/api';
import { notFound } from 'next/navigation';

export default async function ContestDetailPage({ params }: { params: { id: string } }) {
  const contest = await apiGet<any>(`/contests/${params.id}`, 30);
  if (!contest) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {contest.bannerUrl && <img src={contest.bannerUrl} alt="" className="w-full rounded-xl mb-6 aspect-video object-cover" />}
      <h1 className="text-2xl font-bold text-gray-900">{contest.title}</h1>
      <p className="text-sm text-gray-500 mt-1">{contest.category} · {contest.mode}</p>

      <div className="grid grid-cols-3 gap-4 my-8">
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Entry fee</p>
          <p className="text-lg font-semibold">₹{contest.entryFee}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Prize pool</p>
          <p className="text-lg font-semibold">₹{contest.prizePool}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Winners</p>
          <p className="text-lg font-semibold">{contest.numWinners}</p>
        </div>
      </div>

      <p className="text-gray-700 leading-relaxed whitespace-pre-line">{contest.description}</p>

      {contest.rules && (
        <div className="mt-8">
          <h2 className="font-semibold text-gray-900 mb-2">Rules</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{contest.rules}</p>
        </div>
      )}

      <a href="https://app.yourdomain.com" className="inline-block mt-8 bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700">
        Register in the app
      </a>
    </div>
  );
}
