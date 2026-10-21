import './globals.css';
export const metadata = { title: 'OJAS Admin', description: 'Admin dashboard' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return (<html lang="en"><body>{children}</body></html>); }
