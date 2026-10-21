'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
const links = [
  { href: '/dashboard', label: 'Overview' }, { href: '/dashboard/users', label: 'Users' }, { href: '/dashboard/categories', label: 'Categories' },
  { href: '/dashboard/contests', label: 'Contests' }, { href: '/dashboard/registrations', label: 'Registrations' }, { href: '/dashboard/auditions', label: 'Auditions' },
  { href: '/dashboard/reels', label: 'Reels' }, { href: '/dashboard/battles', label: 'Battles' }, { href: '/dashboard/talents', label: 'Talents' }, { href: '/dashboard/bookings', label: 'Bookings' },
  { href: '/dashboard/payments', label: 'Payments' }, { href: '/dashboard/finance', label: 'Finance (KYC & Payouts)' }, { href: '/dashboard/subscriptions', label: 'Subscriptions' },
  { href: '/dashboard/ads', label: 'Advertising' }, { href: '/dashboard/disputes', label: 'Disputes' }, { href: '/dashboard/commission', label: 'Commission Settings' },
  { href: '/dashboard/gamification', label: 'Badges & Levels' }, { href: '/dashboard/settings', label: 'Config Engine' },
];
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  function logout() { localStorage.removeItem('admin_access_token'); router.push('/login'); }
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3"><img src="/ojas-emblem.png" alt="OJAS" width={40} height={40} className="rounded-xl" /><div><p className="font-bold text-gray-900 leading-tight">OJAS</p><p className="text-xs text-gray-600 font-bold">Admin Dashboard</p></div></div>
      <nav className="flex-1 px-3 py-4 space-y-1">{links.map((l) => (<Link key={l.href} href={l.href} className={`block px-3 py-2 rounded-lg text-sm font-bold ${pathname === l.href ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}>{l.label}</Link>))}</nav>
      <div className="p-3 border-t border-gray-200"><button onClick={logout} className="w-full text-left px-3 py-2 text-sm font-bold text-gray-600 hover:text-red-600">Sign out</button></div>
    </aside>
  );
}
