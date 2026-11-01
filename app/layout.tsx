import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title: 'BLACKOUT — Round 02', description: 'Solve the games. Recover the signal. Make the first call.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
