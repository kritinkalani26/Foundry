import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
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
        <Navbar />
        <main>{children}</main>

        <footer>
          <div className="footer-inner">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, marginBottom: 32 }}>
              <div>
                <div className="footer-logo">Foundry</div>
                <p className="footer-tagline">India&apos;s makerspace marketplace — every tool, every city, one platform.</p>
              </div>
              <div>
                <p className="footer-heading">Services</p>
                <ul className="footer-links">
                  <li><a href="/upload">3D Printing</a></li>
                  <li><a href="/request?service=laser-cutting">Laser Cutting</a></li>
                  <li><a href="/request?service=cnc-milling">CNC Milling</a></li>
                  <li><a href="/request?service=soldering">Electronics</a></li>
                </ul>
              </div>
              <div>
                <p className="footer-heading">Platform</p>
                <ul className="footer-links">
                  <li><a href="/printers">Find Spaces</a></li>
                  <li><a href="/owner">List Equipment</a></li>
                  <li><a href="/dashboard/customer">My Orders</a></li>
                  <li><a href="/dashboard/owner">Owner Dashboard</a></li>
                </ul>
              </div>
              <div>
                <p className="footer-heading">Cities</p>
                <ul className="footer-links">
                  <li>Kota, Rajasthan</li>
                  <li>Indore, MP</li>
                  <li>Patna, Bihar</li>
                  <li>Nagpur, MH</li>
                  <li>Bhopal, MP</li>
                  <li>Varanasi, UP</li>
                </ul>
              </div>
            </div>
            <hr className="footer-divider" />
            <p className="footer-copy">© 2025 Foundry · Built for India&apos;s makers</p>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
