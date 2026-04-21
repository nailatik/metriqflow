import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="bg-bg text-textMain min-h-screen">

      {/* HEADER */}
      <header className="flex justify-between items-center px-8 py-6 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight">
          Metriq Flow
        </h1>

        <nav className="flex gap-6 text-textSecondary">
          <a href="#features" className="hover:text-textMain">Features</a>
          <a href="#how" className="hover:text-textMain">How it works</a>
        </nav>

        <div className="flex gap-3">
          <Link to="/login" className="text-textSecondary hover:text-textMain">
            Login
          </Link>
          <Link
            to="/register"
            className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="text-center px-6 py-24 max-w-4xl mx-auto">
        <h2 className="text-5xl font-bold tracking-tight leading-tight">
          Social analytics and reports — automated in seconds
        </h2>

        <p className="mt-6 text-textSecondary text-lg">
          Metriq Flow helps you track social media performance, generate reports,
          and automate analytics workflows.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/register"
            className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-indigo-700"
          >
            Start free
          </Link>

          <a
            href="#features"
            className="border border-border px-6 py-3 rounded-xl hover:bg-gray-50"
          >
            Learn more
          </a>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="px-8 py-10 border-y border-border text-center text-textSecondary">
        Trusted by developers and marketing teams
      </section>

      {/* FEATURES */}
      <section id="features" className="px-8 py-20 max-w-6xl mx-auto">
        <h3 className="text-2xl font-semibold mb-10 text-center">
          Everything you need for analytics
        </h3>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h4 className="font-semibold">Unified Dashboard</h4>
            <p className="text-textSecondary mt-2">
              All your social data in one clean interface.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h4 className="font-semibold">Automated Reports</h4>
            <p className="text-textSecondary mt-2">
              Generate reports without manual work.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h4 className="font-semibold">Real-time Insights</h4>
            <p className="text-textSecondary mt-2">
              Track performance as it happens.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-8 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-semibold mb-10">
            How it works
          </h3>

          <div className="space-y-6 text-textSecondary">
            <p>1. Connect your social accounts</p>
            <p>2. We collect and analyze data</p>
            <p>3. You get automated reports and insights</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 text-center">
        <h3 className="text-3xl font-bold">
          Start using Metriq Flow today
        </h3>

        <p className="text-textSecondary mt-4">
          No credit card required
        </p>

        <Link
          to="/register"
          className="inline-block mt-8 bg-primary text-white px-8 py-4 rounded-xl hover:bg-indigo-700"
        >
          Create account
        </Link>
      </section>

    </div>
  );
};

export default Landing;