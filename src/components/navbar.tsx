"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "All Tools", href: "/#tools" },
] as const;

export function Navbar() {
  const pathname = usePathname();

  // On the home page, links to "/" and "/#tools" scroll in place instead of navigating.
  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (pathname !== "/") return;

    if (href === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", "/");
    } else if (href === "/#tools") {
      const target = document.getElementById("tools");
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", "/#tools");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-[clamp(16px,4vw,32px)] py-3.5"
      >
        <Link
          href="/"
          onClick={(event) => handleNavClick(event, "/")}
          className="flex min-h-11 items-center gap-2.5 text-ink no-underline"
        >
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-accent text-white">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
              <path d="M3 14h18" />
              <path d="M10.5 14v2h3v-2" />
            </svg>
          </span>
          <span className="text-[19px] font-extrabold tracking-tight">
            My Tools
          </span>
        </Link>

        <ul className="flex flex-wrap gap-1">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(event) => handleNavClick(event, href)}
                  className={`inline-flex min-h-11 items-center rounded-[10px] px-3.5 text-[15px] transition hover:bg-surface-hover hover:text-ink ${
                    isActive
                      ? "bg-surface-hover font-semibold text-ink"
                      : "font-medium text-muted"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
