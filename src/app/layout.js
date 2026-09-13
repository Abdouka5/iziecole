import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
});

export const metadata = {
  title: "iziecole — La gestion scolaire, simplifiée",
  description:
    "iziecole est un logiciel SaaS de gestion scolaire multi-établissements pour les écoles privées du Sénégal, de la Maternelle au Lycée.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning className={roboto.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
