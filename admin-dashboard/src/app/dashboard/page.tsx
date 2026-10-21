'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';
const fetcher = (url: string) => api.get(url).then((r) => r.data);
export default function DashboardOverview() {
  const { data, error, isLoading } = useSWR('/admin/dashboard', fetcher, { refreshInterval: 30000 });
  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-6">Platform Overview</h1>
      {isLoading && <p className="text-sm text-gray-600 font-bold">Loading...</p>}
      {error && <p className="text-sm text-red-600 font-bold">Could not load dashboard data.</p>}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Users" value={data.totalUsers} /><StatCard label="Live Contests" value={data.activeContests} />
          <StatCard label="Registered Talents" value={data.totalTalents} /><StatCard label="Total Bookings" value={data.totalBookings} />
          <StatCard label="Pending Contest Approvals" value={data.pendingContestApprovals} /><StatCard label="Pending Audition Approvals" value={data.pendingAuditionApprovals ?? 0} />
          <StatCard label="Contest Registrations" value={data.registrations ?? 0} /><StatCard label="Gross Revenue" value={`₹${Number(data.grossRevenue).toLocaleString('en-IN')}`} />
          <StatCard label="Booking GMV" value={`₹${Number(data.bookingGmv || 0).toLocaleString('en-IN')}`} /><StatCard label="Booking Commission" value={`₹${Number(data.bookingCommission || 0).toLocaleString('en-IN')}`} />
          <StatCard label="Paid Votes Revenue" value={`₹${Number(data.paidVotesRevenue || 0).toLocaleString('en-IN')}`} /><StatCard label="Tips Volume" value={`₹${Number(data.tipsVolume || 0).toLocaleString('en-IN')}`} />
        </div>
      )}
    </div>
  );
}
