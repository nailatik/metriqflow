import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/widgets/Header/Header";

export const metadata: Metadata = {
  title: "Metriq Flow — Social Analytics Automated",
  description:
    "Track performance, generate reports and automate analytics — all in one clean dashboard built for modern teams.",
  openGraph: {
    title: "Metriq Flow — Social Analytics Automated",
    description: "Social analytics platform for modern teams.",
    url: "http://localhost:3000",
  },
};

const features = [
  ["Unified Dashboard", "All your social data in one clean interface."],
  ["Automated Reports", "Generate reports without manual work."],
  ["Real-time Insights", "Track performance as it happens."],
] as const;

const steps = [
  ["Connect accounts", "Link your social platforms"],
  ["Analyze data", "We process everything automatically"],
  ["Get insights", "Receive reports & analytics"],
] as const;

/* Landing — fully SSR (Server Component, no "use client") */
export default function LandingPage() {
  return (
    <div className="relative text-textMain min-h-screen">
      {/* Subtle background blobs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[100px] left-[-100px] w-[600px] h-[600px] bg-purple-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-indigo-500/10 blur-3xl rounded-full" />
      </div>

      <Header />

      {/* Hero */}
      <section className="relative flex flex-col items-center text-center px-8 py-28 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
          Social analytics <br />
          <span className="text-primary">automated in seconds</span>
        </h1>
        <p className="mt-6 text-textSecondary text-lg max-w-2xl leading-relaxed">
          Track performance, generate reports and automate analytics —
          all in one clean dashboard built for modern teams.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl font-medium bg-primary text-white hover:bg-indigo-700 shadow-sm transition-all"
          >
            Start free
          </Link>
          <a
            href="#features"
            className="px-4 py-2 rounded-xl font-medium bg-gray-100 text-textMain hover:bg-gray-200 transition-all"
          >
            Learn more
          </a>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-8 py-12 border-y border-border text-center text-textSecondary text-sm">
        Trusted by developers and marketing teams worldwide
      </section>

      {/* Features */}
      <section id="features" className="px-8 py-24 max-w-6xl mx-auto">
        <h3 className="text-3xl font-semibold mb-12 text-center">
          Everything you need for analytics
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(([title, desc]) => (
            <div
              key={title}
              className="group relative p-6 rounded-2xl border border-border bg-white/70 backdrop-blur-md hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
            >
              <h4 className="font-semibold text-lg">{title}</h4>
              <p className="text-textSecondary mt-2">{desc}</p>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-purple-500/10 to-indigo-500/10" />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-semibold mb-12">How it works</h3>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {steps.map(([title, desc], i) => (
              <div
                key={title}
                className="group relative p-6 rounded-2xl border border-border bg-white/70 backdrop-blur-md hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
              >
                <p className="text-primary font-semibold">Step {i + 1}</p>
                <p className="mt-2 font-medium">{title}</p>
                <p className="text-textSecondary mt-1">{desc}</p>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-purple-500/10 to-indigo-500/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20 text-center">
        <h3 className="text-4xl font-bold">Start using Metriq Flow today</h3>
        <p className="text-textSecondary mt-7">No credit card required</p>
        <div className="mt-7">
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl font-medium bg-primary text-white hover:bg-indigo-700 shadow-sm transition-all"
          >
            Create account
          </Link>
        </div>
      </section>
    </div>
  );
}
