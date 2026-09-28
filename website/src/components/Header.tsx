import Link from 'next/link';

const links = [
  { href: '/contests', label: 'Contests' },
  { href: '/auditions', label: 'Auditions' },
  { href: '/talents', label: 'Talents' },
  { href: '/about', label: 'About' },
];

export default function Header() {
  return (
    <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-brand-600">Talent Platform</Link>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-600">{l.label}</Link>
          ))}
        </nav>
        <a href="https://app.yourdomain.com" className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700">
          Get the app
        </a>
      </div>
    </header>
  );
}
