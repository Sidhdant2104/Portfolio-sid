import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Sid — Creative Developer, AI Builder",
  description:
    "An explorable building rather than a portfolio page. Six doors: projects, skills, about, experience, experiments, contact. Walk in.",
  openGraph: {
    title: 'Sid — Creative Developer, AI Builder',
    description: 'An explorable building rather than a portfolio page. Walk in.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#f2efe7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Composited over everything so the render and the interface share one paper. */}
        <div className="paper-grain" aria-hidden />
        <div className="paper-vignette" aria-hidden />
      </body>
    </html>
  );
}
