import { type ReactNode } from "react";
import { Header } from "@/widgets/Header/Header";
import { Footer } from "@/features/landing/ui/Footer/Footer";

interface LegalPageProps {
  locale: string;
  title: string;
  updatedLabel: string;
  children: ReactNode;
}

export function LegalPage({ locale, title, updatedLabel, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-bg text-textMain flex flex-col">
      <Header />
      <main className="flex-1 w-full">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-textMain">{title}</h1>
          <p className="mt-2 text-sm text-textSecondary">{updatedLabel}</p>

          {locale !== "ru" && (
            <div className="mt-6 rounded-xl border border-border bg-surfaceMuted/40 px-4 py-3 text-sm text-textSecondary">
              Документ доступен только на русском языке, так как является юридически обязывающим.
              <br />
              This document is available in Russian only, as it is the legally binding version.
            </div>
          )}

          <div className="mt-8 space-y-1">{children}</div>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-semibold text-textMain mt-10 mb-3">{children}</h2>;
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="text-textSecondary leading-relaxed">{children}</p>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 text-textSecondary leading-relaxed">{children}</ul>;
}
