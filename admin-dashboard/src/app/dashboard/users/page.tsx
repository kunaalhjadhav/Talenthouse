'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const { data, mutate, isLoading } = useSWR(`/users?search=${encodeURIComponent(search)}`, fetcher);

  async function setStatus(id: string, status: string) {
    await api.patch(`/users/${id}/status`, { status });
    mutate();
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Users</h1>
      <p className="text-sm text-gray-500 mb-6">Search, verify, suspend, or manage roles.</p>

      <input
        className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
        placeholder="Search by name or mobile"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Mobile</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-4 text-gray-500">Loading...</td></tr>
            )}
            {data?.map((u: any) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{u.name || '—'}</td>
                <td className="px-4 py-3">{u.mobile}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>{u.status}</span>
                </td>
                <td className="px-4 py-3 space-x-2">
                  {u.status !== 'SUSPENDED' && (
                    <button onClick={() => setStatus(u.id, 'SUSPENDED')} className="text-amber-600 hover:underline">Suspend</button>
                  )}
                  {u.status !== 'ACTIVE' && (
                    <button onClick={() => setStatus(u.id, 'ACTIVE')} className="text-green-600 hover:underline">Activate</button>
                  )}
                  <button onClick={() => setStatus(u.id, 'BLOCKED')} className="text-red-600 hover:underline">Block</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
