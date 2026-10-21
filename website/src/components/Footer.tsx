import Link from 'next/link';
export default function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between gap-6 text-sm font-bold text-gray-700">
        <div className="flex items-center gap-3"><img src="/ojas-emblem.png" alt="" width={32} height={32} className="rounded-lg" /><p>© {new Date().getFullYear()} OJAS. All rights reserved.</p></div>
        <div className="flex gap-6"><Link href="/terms" className="hover:text-gray-900">Terms</Link><Link href="/privacy" className="hover:text-gray-900">Privacy</Link><Link href="/refund-policy" className="hover:text-gray-900">Refund Policy</Link><Link href="/about" className="hover:text-gray-900">About</Link></div>
      </div>
    </footer>
  );
}
