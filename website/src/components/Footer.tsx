import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between gap-6 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Talent Platform. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-gray-800">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-800">Privacy</Link>
          <Link href="/refund-policy" className="hover:text-gray-800">Refund Policy</Link>
          <Link href="/about" className="hover:text-gray-800">About</Link>
        </div>
      </div>
    </footer>
  );
}
