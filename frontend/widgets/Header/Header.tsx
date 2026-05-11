"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useUserStore } from "@/shared/store/StoreProvider";
import { Button } from "@/shared/ui/Button/Button";

export const Header = observer(() => {
  const userStore = useUserStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userFirstName = userStore.user?.full_name?.split(" ")[0] ?? "";

  const handleLogout = () => {
    userStore.logout();
  };

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-8 py-6 border-b border-border">
      <h1 className="text-xl font-semibold tracking-tight justify-self-start">
        <Link href="/">Metriq Flow</Link>
      </h1>

      <nav className="flex items-center gap-6 text-textSecondary">
        <a href="#features" className="hover:text-textMain">Features</a>
        <a href="#how" className="hover:text-textMain">How it works</a>
      </nav>

      <div className="flex gap-3 items-center justify-self-end">
        {/* До монтирования всегда рендерим "гостевое" состояние —
            оно совпадает с тем, что отдаёт SSR, hydration-мismatch пропадает */}
        {mounted && userStore.isAuth ? (
          <>
            <Link href="/app">
              <span className="text-textMain font-medium">{userFirstName || "User"}</span>
            </Link>
            <Button variant="secondary" onClick={handleLogout}>Logout</Button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-textSecondary hover:text-textMain">
              Login
            </Link>
            <Link href="/register">
              <Button variant="primary">Create account</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
});
