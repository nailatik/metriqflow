import Button from "../../ui/Button/Button"
import { Link } from "react-router-dom";

const Header = () => {
  return (
      <header className="flex justify-between items-center px-8 py-6 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight">
          Metriq Flow
        </h1>

        <nav className="flex items-center gap-6 text-textSecondary ml-[87px]">
          <a href="#features" className="hover:text-textMain">Features</a>
          <a href="#how" className="hover:text-textMain">How it works</a>
        </nav>

        <div className="flex gap-3">
          <Link to="/login" className="text-textSecondary hover:text-textMain flex items-center">
            Login
          </Link>
          <Link to="/register">
            <Button variant="primary">Create account</Button>
          </Link>
        </div>
      </header>
  );
};

export default Header;