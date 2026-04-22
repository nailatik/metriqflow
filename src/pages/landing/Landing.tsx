import Header from "../../components/Header/Header";
import Button from "../../ui/Button/Button";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="bg-bg text-textMain min-h-screen">

      <Header />

      {/* HERO */}
      <section className="relative text-center px-6 py-28 max-w-5xl mx-auto">

        {/* Glow */}
        <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full"></div>

        <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          Social analytics <br />
          <span className="text-primary">automated in seconds</span>
        </h2>

        <p className="mt-6 text-textSecondary text-lg max-w-2xl mx-auto">
          Track performance, generate reports and automate analytics —
          all in one clean dashboard.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <Link to="/register">
            <Button variant="primary">Start free</Button>
          </Link>

          <Button
            variant="secondary"
            onClick={() =>
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Learn more
          </Button>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="px-8 py-12 border-y border-border text-center text-textSecondary">
        Trusted by developers and marketing teams worldwide
      </section>

      {/* FEATURES */}
      <section id="features" className="px-8 py-24 max-w-6xl mx-auto">

        <h3 className="text-3xl font-semibold mb-12 text-center">
          Everything you need for analytics
        </h3>

        <div className="grid md:grid-cols-3 gap-6">

          {/* CARD */}
          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition">
            <h4 className="font-semibold text-lg">Unified Dashboard</h4>
            <p className="text-textSecondary mt-2">
              All your social data in one clean interface.
            </p>
          </div>

          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition">
            <h4 className="font-semibold text-lg">Automated Reports</h4>
            <p className="text-textSecondary mt-2">
              Generate reports without manual work.
            </p>
          </div>

          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition">
            <h4 className="font-semibold text-lg">Real-time Insights</h4>
            <p className="text-textSecondary mt-2">
              Track performance as it happens.
            </p>
          </div>

        </div>
      </section>

      {/* HOW */}
      <section id="how" className="px-8 py-24 bg-gray-50">

        <div className="max-w-4xl mx-auto text-center">

          <h3 className="text-3xl font-semibold mb-12">
            How it works
          </h3>

          <div className="grid md:grid-cols-3 gap-6 text-left">

            <div className="bg-white border border-border p-6 rounded-2xl">
              <p className="text-primary font-semibold">Step 1</p>
              <p className="mt-2">Connect your social accounts</p>
            </div>

            <div className="bg-white border border-border p-6 rounded-2xl">
              <p className="text-primary font-semibold">Step 2</p>
              <p className="mt-2">We collect and analyze your data</p>
            </div>

            <div className="bg-white border border-border p-6 rounded-2xl">
              <p className="text-primary font-semibold">Step 3</p>
              <p className="mt-2">Get insights and reports instantly</p>
            </div>

          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-28 text-center">

        <h3 className="text-4xl font-bold">
          Start using Metriq Flow today
        </h3>

        <p className="text-textSecondary mt-4">
          No credit card required
        </p>

        <div className="mt-8">
          <Link to="/register">
            <Button variant="primary">Create account</Button>
          </Link>
        </div>

      </section>

    </div>
  );
};

export default Landing;