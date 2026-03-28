import { Check, Star, Zap, Shield, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/shared';
import { useAppStore } from '../lib/store';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

export function UpgradePage() {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();

  const handleUpgrade = () => {
    dispatch({ type: 'UPGRADE_TO_PREMIUM' });
    toast.success('Welcome to Pro!', {
      description: 'Unlimited goals, AI coaching & analytics unlocked.',
    });
    navigate('/dashboard');
  };

  return (
    <div className="max-w-lg mx-auto py-6 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-stride-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-stride-600" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-stride-900">Upgrade to Pro</h1>
      </div>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stride-700 to-stride-900 text-white flex items-center justify-center mx-auto shadow-lg shadow-stride-800/20">
          <Zap className="w-7 h-7 text-stride-200 fill-stride-200" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-stride-900">Unlock your full potential</h2>
        <p className="text-sm text-stride-500 max-w-sm mx-auto">Advanced AI coaching, unlimited goals, and deeper analytics.</p>
      </div>

      {/* Plans */}
      <div className="space-y-4">
        {/* Free */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Free</h3>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-bold">$0</span>
                <span className="text-xs text-gray-400 font-medium">/month</span>
              </div>
            </div>
            {!state.userState?.isPremium && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wider">Current</span>
            )}
          </div>
          <ul className="space-y-2">
            {['Up to 3 active goals', 'Basic AI coaching (10/day)', 'Standard progress tracking'].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <Check className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="bg-gradient-to-br from-stride-800 to-stride-900 rounded-2xl p-5 space-y-4 text-white relative overflow-hidden shadow-lg shadow-stride-800/20">
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[10px] font-bold bg-white text-black uppercase tracking-wider">
              <Star className="w-3 h-3 fill-black" /> Popular
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold flex items-center gap-1.5">
              Pro <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            </h3>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold">$9</span>
              <span className="text-xs text-gray-400 font-medium">/month</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">For serious goal achievers.</p>
          </div>

          <ul className="space-y-2">
            {[
              'Unlimited active goals',
              'Unlimited AI coaching',
              'Smart fallback generation',
              'Advanced analytics & insights',
              'Priority support',
              'Custom categories'
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs font-medium text-gray-200">
                <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> {f}
              </li>
            ))}
          </ul>

          {state.userState?.isPremium ? (
            <div className="w-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center justify-center gap-1.5 text-sm h-10 rounded-xl font-bold">
              <CheckCircle2 className="w-4 h-4" /> Active
            </div>
          ) : (
            <Button onClick={handleUpgrade} className="w-full bg-white text-black hover:bg-gray-100 text-sm h-10 border-0 font-bold rounded-xl">
              Upgrade Now
            </Button>
          )}

          <p className="text-center text-[10px] text-gray-500 flex justify-center items-center gap-1">
            <Shield className="w-3 h-3" /> Secure payment via Stripe
          </p>
        </div>
      </div>
    </div>
  );
}