"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";

export default function Navbar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { data: session } = useSession();
  const [open, setOpen]         = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const links = [
    { href: "/",                   label: "Services" },
    { href: "/printers",           label: "Find Spaces" },
    { href: "/analyze",            label: "Analyze Assembly" },
    { href: "/library",            label: "Part Library" },
    { href: "/team",               label: "Team" },
    { href: "/dashboard/customer", label: "My Orders" },
  ];

  function handleSignOut() {
    signOut({ redirect: false }).then(() => router.push("/"));
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link href="/" className="logo" onClick={() => setOpen(false)}>
          <div className="logo-icon">
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
          <a
            href="/supplier"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 8,
              background: "linear-gradient(135deg, #F97316, #EF4444)",
              color: "#fff", fontSize: 13, fontWeight: 700,
              textDecoration: "none", letterSpacing: "0.01em",
            }}
          >
            Become a Supplier ↗
          </a>

          {session ? (
            <div style={{ position: "relative", marginLeft: 12 }}>
              <button
                onClick={() => setUserMenu(!userMenu)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#374151" }}
              >
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#F97316,#EA580C)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={13} color="white" />
                </div>
                {session.user.name.split(" ")[0]}
              </button>
              {userMenu && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.10)", minWidth: 180, zIndex: 100, padding: 6 }}>
                  <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #F3F4F6", marginBottom: 4 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{session.user.name}</p>
                    <p style={{ fontSize: 11, color: "#9CA3AF" }}>{session.user.email}</p>
                  </div>
                  <Link href="/dashboard/customer" onClick={() => setUserMenu(false)} style={{ display: "block", padding: "9px 14px", fontSize: 13, color: "#374151", textDecoration: "none", borderRadius: 8 }}>
                    My Orders
                  </Link>
                  {session.user.role === "PRINTER_OWNER" && (
                    <Link href="/dashboard/owner" onClick={() => setUserMenu(false)} style={{ display: "block", padding: "9px 14px", fontSize: 13, color: "#374151", textDecoration: "none", borderRadius: 8 }}>
                      Owner Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", fontSize: 13, color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 8, marginTop: 2 }}
                  >
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
              <Link href="/auth/login" className="nav-link">Sign In</Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm">Sign Up</Link>
            </div>
          )}
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
          <a
            href="/supplier"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: "block", padding: "12px 14px", borderRadius: 10,
              fontSize: 15, fontWeight: 700, color: "#EA580C",
              background: "#FFF7ED", textDecoration: "none", marginTop: 4,
            }}
          >
            Become a Supplier ↗
          </a>
          {session ? (
            <button
              onClick={() => { handleSignOut(); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 10, fontSize: 15, color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", marginTop: 4, width: "100%" }}
            >
              <LogOut size={15} />
              Sign Out ({session.user.name.split(" ")[0]})
            </button>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setOpen(false)} style={{ display: "block", padding: "12px 14px", borderRadius: 10, fontSize: 15, fontWeight: 500, color: "#374151", textDecoration: "none", marginTop: 4 }}>
                Sign In
              </Link>
              <Link href="/auth/signup" onClick={() => setOpen(false)} className="btn btn-primary btn-lg" style={{ marginTop: 8, justifyContent: "center" }}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
