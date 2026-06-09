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
        {/* SVG filter used by the Foundry logo mark to strip its black background */}
        <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
          <defs>
            <filter id="foundry-mark">
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1 1 1 0 -0.1"/>
            </filter>
          </defs>
        </svg>
        <AuthProvider>
          <ConditionalNavbar />
          <main>{children}</main>
          <ConditionalFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
