'use client';
import Link from 'next/link';
import ResourceManager from '@/components/ResourceManager';
export default function CommissionPage() {
  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-1">Commission Settings</h1>
      <p className="text-sm text-gray-600 font-bold mb-5">Global rates (contests, bookings, voting) are edited in <Link href="/dashboard/settings" className="text-indigo-600 underline">Config Engine</Link>. Add category or scope overrides below.</p>
      <ResourceManager resource="commission-rules" hideHeader />
    </div>
  );
}
