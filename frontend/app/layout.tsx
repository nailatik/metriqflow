import type { ReactNode } from "react";

// Required by Next.js — locale layout provides <html> and <body>
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
