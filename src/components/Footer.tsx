export default function Footer() {
  return (
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
              <li><a href="/supplier" target="_blank" rel="noopener noreferrer">Become a Supplier</a></li>
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
  );
}
