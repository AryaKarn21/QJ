import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

// Used for nav items that exist in the sidebar/navbar design but don't
// have a real feature behind them yet (Candidates, Interviews, Saved
// Candidates, Subscription). Rendering this instead of leaving the link
// unregistered means clicking the nav item never crashes with a
// "No routes matched" error — it's honest about what's built vs. not.
const ComingSoon = ({ title, description }: ComingSoonProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-[#F97316] mb-4">
        <Construction size={28} />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        {description || "This feature is on our roadmap and isn't built yet. Check back soon."}
      </p>
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        Go back
      </button>
    </div>
  );
};

export default ComingSoon;