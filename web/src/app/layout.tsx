import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kaïra Flotte",
  description: "Géolocalisation et gestion de flotte",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
