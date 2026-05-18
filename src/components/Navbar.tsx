"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/",                   label: "Services" },
    { href: "/printers",           label: "Find Spaces" },
    { href: "/owner",              label: "List Equipment" },
    { href: "/dashboard/customer", label: "My Orders" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="logo" onClick={() => setOpen(false)}>
          <div className="logo-icon">
            {/* Flame / forge icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.5 5.5 7 8.5 8.5 12.5C6.5 11.5 5.5 9.5 6 7C3 10 3 15 7 18.5a7 7 0 0014 0C23.5 16 24.5 12 22 9c-1 2.5-3 3.5-5 3C19.5 8 18 4.5 12 2z"/>
            </svg>
          </div>
          Foundry
        </Link>

        {/* Desktop */}
        <div className="nav-links">
          {links.map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`nav-link${isActive ? " active" : ""}`}>
                {label}
              </Link>
            );
          })}
          <Link href="/#services" className="btn btn-primary btn-sm" style={{ marginLeft: 12 }}>
            Get a Quote
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          style={{
            padding: 8, borderRadius: 8,
            background: open ? "#FFF7ED" : "none",
            border: open ? "1px solid #FED7AA" : "1px solid transparent",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {open
            ? <svg width="20" height="20" fill="none" stroke="#F97316" strokeWidth="2.5"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
            : <svg width="20" height="20" fill="none" stroke="#374151" strokeWidth="2"><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="17" y2="18"/></svg>
          }
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="mobile-menu" style={{
          background: "#fff", borderTop: "1px solid #F3F4F6",
          padding: "16px 24px 20px",
          flexDirection: "column", gap: 4,
        }}>
          {links.map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: "block", padding: "12px 14px", borderRadius: 10,
                  fontSize: 15, fontWeight: 500,
                  background: isActive ? "#FFF7ED" : "transparent",
                  color: isActive ? "#EA580C" : "#374151",
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/#services"
            onClick={() => setOpen(false)}
            className="btn btn-primary btn-lg"
            style={{ marginTop: 8, justifyContent: "center" }}
          >
            Get a Quote
          </Link>
        </div>
      )}
    </nav>
  );
}
