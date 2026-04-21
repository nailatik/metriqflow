import Header from "../../components/Header/Header";
import Button from "../../ui/Button/Button"
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="bg-bg text-textMain min-h-screen">
      <Header/>
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
        <Link to="/register">
          <Button variant="primary">Start free</Button>
        </Link>

        <a href="#features">
          <Button variant="secondary">
            Learn more
          </Button>
        </a>
          
        </div>
      </section>

      <section className="px-8 py-10 border-y border-border text-center text-textSecondary">
        Trusted by developers and marketing teams
      </section>

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

      <section className="px-8 py-24 text-center">
        <h3 className="text-3xl font-bold">
          Start using Metriq Flow today
        </h3>

        <p className="text-textSecondary mt-4">
          No credit card required
        </p>
        <div className="text-textSecondary mt-4"> 
          <Link to="/register">
            <Button variant="primary">Create account</Button>
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Landing;