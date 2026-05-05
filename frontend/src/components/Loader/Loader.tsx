import { useAppSelector } from "../../app/hooks";

const Loader = () => {
  const loading = useAppSelector((state) => state.settings.loading);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">

      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />

      <div className="relative z-10 bg-white border border-border rounded-2xl px-6 py-5 shadow-lg flex flex-col items-center gap-3">

        <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />

        <p className="text-sm text-textSecondary">
          Loading...
        </p>

      </div>
    </div>
  );
};

export default Loader;