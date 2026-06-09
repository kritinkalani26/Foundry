import type { Metadata } from "next";
import "./globals.css";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Foundry — India's Makerspace Marketplace",
  description: "Book 3D printing, laser cutting, CNC milling, lathes, water jets, and more from verified maker spaces across India's tier-2 cities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ConditionalNavbar />
          <main>{children}</main>
          <ConditionalFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
