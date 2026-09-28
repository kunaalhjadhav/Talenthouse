'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function CommissionPage() {
  const { data, mutate, isLoading } = useSWR('/admin/commission-rules', fetcher);
  const [scope, setScope] = useState('CONTEST');
  const [key, setKey] = useState('GLOBAL');
  const [pct, setPct] = useState('25');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api.patch('/admin/commission-rules', { scope, key, percentage: Number(pct) });
    mutate();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Commission Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Nothing is hard-coded — every % here flows straight into the commission engine used at
        contest settlement, bookings, and voting.
      </p>

      <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs font-medium text-gray-500">Scope</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1 block border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="CONTEST">Contest</option>
            <option value="BOOKING">Booking</option>
            <option value="VOTING">Voting</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Key (category slug or GLOBAL)</label>
          <input value={key} onChange={(e) => setKey(e.target.value)} className="mt-1 block border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Percentage</label>
          <input type="number" step="0.1" value={pct} onChange={(e) => setPct(e.target.value)} className="mt-1 block border border-gray-300 rounded-lg px-3 py-2 text-sm w-28" />
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Save rule</button>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Scope</th>
              <th className="text-left px-4 py-3">Key</th>
              <th className="text-left px-4 py-3">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={3} className="px-4 py-4 text-gray-500">Loading...</td></tr>}
            {data?.map((r: any) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{r.scope}</td>
                <td className="px-4 py-3">{r.key}</td>
                <td className="px-4 py-3">{r.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
