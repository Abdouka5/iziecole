import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "iziecole — La gestion scolaire, simplifiée",
  description:
    "iziecole est un logiciel SaaS de gestion scolaire multi-établissements pour les écoles privées du Sénégal, de la Maternelle au Lycée.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
