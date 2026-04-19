import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cargo Ops WebApp',
  description: '화물기 OCR 및 운항 조회 프론트엔드'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
