import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Image2Asset - Image to 3D Asset Pipeline',
  description: 'Convert images to 3D assets using AI-powered tools',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen bg-gray-950 text-gray-100 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
