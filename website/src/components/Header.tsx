import Link from 'next/link';
const links = [{ href: '/contests', label: 'Contests' }, { href: '/auditions', label: 'Auditions' }, { href: '/talents', label: 'Talents' }, { href: '/hall-of-fame', label: 'Hall of Fame' }, { href: '/plans', label: 'Plans' }, { href: '/about', label: 'About' }];
export default function Header() {
  return (
    <header className="border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur z-10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-brand-600"><img src="/ojas-emblem.png" alt="" width={36} height={36} className="rounded-lg" /><span className="tracking-wide">OJAS</span></Link>
        <nav className="hidden md:flex gap-8 text-sm font-bold text-gray-800">{links.map((l) => (<Link key={l.href} href={l.href} className="hover:text-brand-600">{l.label}</Link>))}</nav>
        <a href="https://app.yourdomain.com" className="bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-brand-700">Get the app</a>
      </div>
    </header>
  );
}
