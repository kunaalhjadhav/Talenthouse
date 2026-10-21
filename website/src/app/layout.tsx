import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
export const metadata = { title: 'OJAS: Talent Hunt, Contests, Auditions & Events', description: 'Compete in contests, discover auditions, and book verified talent on OJAS.', openGraph: { title: 'OJAS: Talent Hunt, Contest, Audition, Events', images: ['/ojas-logo.jpg'] } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return (<html lang="en"><body><Header /><main className="min-h-screen">{children}</main><Footer /></body></html>); }
