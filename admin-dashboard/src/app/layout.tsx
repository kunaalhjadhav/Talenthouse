import './globals.css';

export const metadata = {
  title: 'Talent Platform — Admin',
  description: 'Admin dashboard for the entertainment/contest/talent marketplace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
