'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const statusColor: Record<string, string> = {
  SUCCESSFUL: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-700',
  INITIATED: 'bg-gray-100 text-gray-600',
  REFUNDED: 'bg-blue-100 text-blue-700',
};

export default function PaymentsPage() {
  const { data, isLoading } = useSWR('/admin/payments', fetcher);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Payments</h1>
      <p className="text-sm text-gray-500 mb-6">All Razorpay transactions, verified via webhook.</p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Purpose</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Razorpay Order</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-4 text-gray-500">Loading...</td></tr>}
            {data?.map((p: any) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{p.purpose}</td>
                <td className="px-4 py-3">₹{p.amount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[p.status] || 'bg-gray-100'}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{p.razorpayOrderId || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
