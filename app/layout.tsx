import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calibra · Tu búsqueda de empleo en movimiento",
  description: "Evalúa vacantes, descubre oportunidades y administra aplicaciones en un solo flujo.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
