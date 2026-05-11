"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { useUserStore } from "@/shared/store/StoreProvider";

const navLinks = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/reports", label: "Reports", exact: false },
  { href: "/app/integrations", label: "Integrations", exact: false },
  { href: "/app/settings", label: "Settings", exact: false },
  { href: "/app/profile", label: "Profile", exact: false },
] as const;

export const Sidebar = observer(() => {
  const pathname = usePathname();
  const router = useRouter();
  const userStore = useUserStore();

  const handleLogout = () => {
    userStore.logout();
    router.push("/login");
  };

  const getLinkClass = (href: string, exact: boolean) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return `px-3 py-2 rounded-lg transition ${
      isActive ? "bg-primary text-white" : "hover:bg-gray-100 text-textSecondary"
    }`;
  };

  return (
    <aside className="w-64 border-r border-border flex flex-col justify-between p-6">
      <div>
        <Link href="/">
          <h2 className="text-xl font-semibold mb-8">Metriq Flow</h2>
        </Link>

        <nav className="flex flex-col gap-2 text-sm">
          {navLinks.map(({ href, label, exact }) => (
            <Link key={href} href={href} className={getLinkClass(href, exact)}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <button className="text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-textSecondary">
          EN
        </button>
        <button className="text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-textSecondary">
          Support
        </button>
        <button
          onClick={handleLogout}
          className="text-left px-3 py-2 rounded-lg text-red-500 hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </aside>
  );
});
