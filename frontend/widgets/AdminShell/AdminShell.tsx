"use client";

import { type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
}

const NAV: NavItem[] = [
  { href: "/admin",         label: "Overview" },
  { href: "/admin/promos",  label: "Promo codes" },
  { href: "/admin/users",   label: "Users" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/audit",   label: "Audit log" },
];

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="min-h-dvh bg-bg text-textMain font-sans flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-surface px-3 py-5 gap-0.5">
        <div className="px-2 mb-4">
          <p className="text-[10px] font-mono text-textSecondary uppercase tracking-widest">
            Metriq Flow
          </p>
          <p className="text-sm font-semibold text-textMain">Admin</p>
        </div>

        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href as "/admin"}
            className={`
              flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-medium transition-colors
              ${isActive(href)
                ? "bg-primary/10 text-primary"
                : "text-textSecondary hover:bg-surfaceMuted hover:text-textMain"}
            `}
          >
            {label}
          </Link>
        ))}

        <div className="mt-auto pt-4 border-t border-border">
          <Link
            href="/app"
            className="flex items-center gap-2 px-2 py-2 text-sm text-textSecondary hover:text-textMain transition-colors"
          >
            ← Back to app
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
