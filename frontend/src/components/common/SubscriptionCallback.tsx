import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '../../utils/currentUser';
import { verifyKhaltiPayment } from '../../api/subscriptionApi';

// Landing page for gateway return URLs (see backend/controllers/subscriptionController.js).
// eSewa: the backend already verifies + activates the subscription server-side
// before redirecting here with ?status=success|failed, so this page just
// forwards that status on.
// Khalti: the gateway redirects the browser straight back with a `pidx` and
// no server-side verification has happened yet — this page must call
// verify/khalti itself before the subscription is considered active.
export default function SubscriptionCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useCurrentUser();
  const ran = useRef(false);

  const destination = role === 'employer' ? '/employer/subscription' : '/user/subscription';

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const gateway = searchParams.get('gateway');
    const pidx = searchParams.get('pidx');

    const finish = (status: 'success' | 'failed') => {
      navigate(`${destination}?status=${status}`, { replace: true });
    };

    if (gateway === 'khalti') {
      if (!pidx) {
        finish('failed');
        return;
      }
      verifyKhaltiPayment(pidx)
        .then((res) => finish(res.status === 'success' ? 'success' : 'failed'))
        .catch(() => finish('failed'));
      return;
    }

    // eSewa (or anything else already resolved by the backend redirect)
    const status = searchParams.get('status');
    finish(status === 'success' ? 'success' : 'failed');
  }, [searchParams, destination, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={28} />
        <p>Confirming your payment…</p>
      </div>
    </div>
  );
}
