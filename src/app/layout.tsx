import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cognitive Lattice Engine (CLE)",
  description: "Advanced Epistemic & Cognitive Lattice Engine with FSRS-5 and Zettelkasten",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen bg-[#0a0e17] text-[#f1f5f9]">
        {children}
      </body>
    </html>
  );
}
