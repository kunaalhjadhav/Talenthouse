'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700', PAUSED: 'bg-amber-100 text-amber-700',
  DRAFT: 'bg-gray-100 text-gray-600', ENDED: 'bg-gray-100 text-gray-500',
};

export default function AdsPage() {
  const { data, mutate, isLoading } = useSWR('/ads/admin/all', fetcher);
  const [form, setForm] = useState({ title: '', type: 'BANNER', placement: 'HOME_BANNER', startDate: '', endDate: '' });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/ads/admin', form);
    setForm({ title: '', type: 'BANNER', placement: 'HOME_BANNER', startDate: '', endDate: '' });
    mutate();
  }

  async function setStatus(id: string, status: string) {
    await api.patch(`/ads/admin/${id}/status`, { status });
    mutate();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Advertising</h1>
      <p className="text-sm text-gray-500 mb-6">Banner, video, and sponsored placements across the app.</p>

      <form onSubmit={create} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="BANNER">Banner</option>
            <option value="VIDEO">Video</option>
            <option value="REEL">Sponsored Reel</option>
            <option value="SPONSORED_TALENT">Sponsored Talent</option>
            <option value="SPONSORED_CONTEST">Sponsored Contest</option>
            <option value="NATIVE">Native</option>
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })}>
            <option value="HOME_BANNER">Home Banner</option>
            <option value="REELS_FEED">Reels Feed</option>
            <option value="CONTEST_SECTION">Contest Section</option>
            <option value="TALENT_SECTION">Talent Section</option>
            <option value="AUDITION_SECTION">Audition Section</option>
          </select>
          <div className="flex gap-2">
            <input type="date" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            <input type="date" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
          </div>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Create Ad (starts as Draft)</button>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Placement</th>
              <th className="text-left px-4 py-3">Impressions / Clicks</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-4 text-gray-500">Loading...</td></tr>}
            {data?.map((ad: any) => (
              <tr key={ad.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{ad.title}</td>
                <td className="px-4 py-3">{ad.placement}</td>
                <td className="px-4 py-3">{ad.impressions} / {ad.clicks}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[ad.status]}`}>{ad.status}</span></td>
                <td className="px-4 py-3 space-x-2">
                  {ad.status !== 'ACTIVE' && <button onClick={() => setStatus(ad.id, 'ACTIVE')} className="text-green-600 hover:underline">Activate</button>}
                  {ad.status === 'ACTIVE' && <button onClick={() => setStatus(ad.id, 'PAUSED')} className="text-amber-600 hover:underline">Pause</button>}
                  <button onClick={() => setStatus(ad.id, 'ENDED')} className="text-red-600 hover:underline">End</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
