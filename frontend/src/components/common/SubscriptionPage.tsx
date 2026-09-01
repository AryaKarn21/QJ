import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCurrentUser } from '../../utils/currentUser';
import {
  getPlans,
  getMySubscription,
  getMyPaymentHistory,
  cancelMySubscription,
  startCheckout,
  type Plan,
  type Subscription,
  type Payment,
  type Gateway,
} from '../../api/subscriptionApi';

// Shared between /employer/subscription and /user/subscription — the
// backend already scopes plans by role via GET /api/subscriptions/plans?role=,
// so this one component works for both portals rather than forking into
// two near-identical pages.
export default function SubscriptionPage() {
  const { role } = useCurrentUser();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') toast.success('Payment successful — subscription activated!');
    if (status === 'failed') toast.error('Payment failed or was cancelled.');
  }, [searchParams]);

  useEffect(() => {
    if (!role || (role !== 'employer' && role !== 'jobseeker')) {
      setLoading(false);
      return;
    }
    Promise.all([getPlans(role), getMySubscription(), getMyPaymentHistory()])
      .then(([planList, currentSub, paymentHistory]) => {
        setPlans(planList);
        setSubscription(currentSub);
        setPayments(paymentHistory);
      })
      .catch(() => toast.error('Failed to load subscription data.'))
      .finally(() => setLoading(false));
  }, [role]);

  const handleCheckout = async (planId: string, gateway: Gateway) => {
    try {
      setCheckoutPlanId(planId);
      await startCheckout(planId, gateway);
      // startCheckout navigates the browser away (form POST or redirect),
      // so there's nothing further to do on success.
    } catch {
      toast.error('Could not start checkout. Please try again.');
      setCheckoutPlanId(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will keep access until it expires.')) return;
    try {
      const updated = await cancelMySubscription();
      setSubscription(updated);
      toast.success('Subscription cancelled.');
    } catch {
      toast.error('Failed to cancel subscription.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading subscription…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
        <p className="text-slate-500 mt-1">Manage your plan and billing.</p>
      </div>

      {subscription && subscription.status === 'active' && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-orange-700 font-semibold">
              <CheckCircle2 size={20} /> {subscription.plan.name} — Active
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Renews / expires on{' '}
              {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : '—'}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Cancel Subscription
          </button>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          {subscription?.status === 'active' ? 'Available Plans' : 'Choose a Plan'}
        </h2>

        {plans.length === 0 ? (
          <p className="text-slate-500">No plans are available right now. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isCurrent =
                subscription?.status === 'active' && subscription.plan._id === plan._id;
              return (
                <div
                  key={plan._id}
                  className={`rounded-xl border p-6 flex flex-col ${
                    isCurrent ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'
                  }`}
                >
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                  )}
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {plan.currency} {plan.price}
                    </span>
                    <span className="text-slate-500 text-sm">
                      {' '}
                      / {plan.billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-orange-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="mt-6 text-center text-sm font-medium text-orange-600">
                      Your Current Plan
                    </div>
                  ) : (
                    <div className="mt-6 space-y-2">
                      <button
                        disabled={checkoutPlanId === plan._id}
                        onClick={() => handleCheckout(plan._id, 'esewa')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                      >
                        <CreditCard size={16} /> Pay with eSewa
                      </button>
                      <button
                        disabled={checkoutPlanId === plan._id}
                        onClick={() => handleCheckout(plan._id, 'khalti')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60"
                      >
                        <CreditCard size={16} /> Pay with Khalti
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {payments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment History</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2.5">Plan</th>
                  <th className="text-left px-4 py-2.5">Amount</th>
                  <th className="text-left px-4 py-2.5">Gateway</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5">{p.plan?.name || '—'}</td>
                    <td className="px-4 py-2.5">
                      {p.currency} {p.amount}
                    </td>
                    <td className="px-4 py-2.5 capitalize">{p.gateway}</td>
                    <td className="px-4 py-2.5">
                      {p.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 size={14} /> Success
                        </span>
                      ) : p.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-red-500">
                          <XCircle size={14} /> Failed
                        </span>
                      ) : (
                        <span className="text-slate-500 capitalize">{p.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}