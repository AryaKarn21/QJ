import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  CreditCard,
  Crown,
  Sparkles,
  Zap,
  ShieldCheck,
  Clock,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  FileCheck2,
  Users2,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useCurrentUser } from '../../utils/currentUser';
import { SkeletonText, SkeletonParagraph } from '../ui/Skeleton';
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const calculateDaysRemaining = (endDateStr?: string) => {
    if (!endDateStr) return null;
    const diff = new Date(endDateStr).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10" aria-busy="true" aria-label="Loading subscription">
        <div>
          <SkeletonText width="w-48" height="h-8" className="mb-2" />
          <SkeletonText width="w-64" height="h-4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              <SkeletonText width="w-1/2" height="h-6" className="mb-3" />
              <SkeletonText width="w-1/3" height="h-9" className="mb-4" />
              <SkeletonParagraph lines={4} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const daysRemaining = subscription?.status === 'active' ? calculateDaysRemaining(subscription.endDate) : null;

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8 overflow-auto" style={{ maxHeight: 'calc(100dvh - 50px)' }}>
      <div className="max-w-6xl mx-auto space-y-10">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-white shadow-xl">
          {/* Subtle background glow effect */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md">
              <Crown size={14} className="text-amber-300" />
              <span>PREMIUM MEMBERSHIP</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {role === 'employer' ? 'Scale Your Hiring with Employer Pro' : 'Supercharge Your Career with QuickJobs Pro'}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {role === 'employer'
                ? 'Unlock unlimited verified candidate outreach, priority job indexing, and advanced ATS screening tools.'
                : 'Stand out to top recruiters with priority placement, direct messaging, unlimited AI cover letters, and profile analytics.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
                <Zap size={14} className="text-amber-400" />
                <span>Instant Activation</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>100% Secure via eSewa & Khalti</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
                <Clock size={14} className="text-blue-400" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Subscription Status Card ── */}
        {subscription && subscription.status === 'active' && (
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-0.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 size={13} /> Active Plan
                  </span>
                  <span className="text-lg font-bold text-gray-900">{subscription.plan.name}</span>
                </div>

                <p className="text-sm text-gray-600">
                  Renews or expires on{' '}
                  <span className="font-semibold text-gray-900">
                    {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : '—'}
                  </span>
                  {daysRemaining !== null && (
                    <span className="ml-2 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Plan Selection Grid ── */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                {subscription?.status === 'active' ? 'Available Plans & Tiers' : 'Choose Your Plan'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select the plan tailored to accelerate your journey. Instant access right after payment.
              </p>
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <Sparkles size={36} className="mx-auto text-amber-500 mb-3 opacity-60" />
              <p className="text-base font-semibold text-gray-800">No active plans at this moment.</p>
              <p className="text-sm text-gray-500 mt-1">Please check back soon for our newest membership tiers.</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${plans.length === 1 ? 'max-w-md mx-auto grid-cols-1' : plans.length === 2 ? 'max-w-3xl mx-auto grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {plans.map((plan, idx) => {
                const isCurrent = subscription?.status === 'active' && subscription.plan._id === plan._id;
                const isFeatured = idx === 0 || plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('premium');

                return (
                  <div
                    key={plan._id}
                    className={`relative rounded-3xl bg-white p-7 sm:p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                      isCurrent
                        ? 'border-2 border-primary ring-4 ring-primary/10 shadow-md'
                        : isFeatured
                        ? 'border-2 border-indigo-500 shadow-md'
                        : 'border border-gray-200 shadow-sm'
                    }`}
                  >
                    {/* Featured / Current Plan Ribbon */}
                    {isCurrent ? (
                      <div className="absolute -top-3.5 right-6 rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-white shadow-sm flex items-center gap-1">
                        <CheckCircle2 size={13} /> Current Plan
                      </div>
                    ) : isFeatured ? (
                      <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-indigo-600 to-primary px-3.5 py-1 text-xs font-bold text-white shadow-sm flex items-center gap-1">
                        <Sparkles size={13} /> Most Popular
                      </div>
                    ) : null}

                    {/* Plan Header */}
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Crown size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-xs text-gray-500 leading-relaxed min-h-[32px]">{plan.description}</p>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="my-6 pb-6 border-b border-gray-100">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{plan.currency || 'NPR'}</span>
                        <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{plan.price}</span>
                        <span className="text-xs font-medium text-gray-500">
                          / {plan.billingCycle === 'yearly' ? 'year' : 'month'}
                        </span>
                      </div>
                    </div>

                    {/* Feature List */}
                    <div className="flex-1 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Included Features</p>
                      <ul className="space-y-2.5">
                        {plan.features.map((feature, fIdx) => (
                          <li key={fIdx} className="text-xs sm:text-sm text-gray-700 flex items-start gap-2.5 leading-snug">
                            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Checkout Actions */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      {isCurrent ? (
                        <div className="w-full rounded-xl bg-emerald-50 border border-emerald-200 py-3 text-center text-xs font-bold text-emerald-800">
                          Active Current Subscription
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <p className="text-[11px] font-medium text-center text-gray-400">Pay securely with local gateway</p>
                          
                          {/* eSewa Button */}
                          <button
                            disabled={checkoutPlanId === plan._id}
                            onClick={() => handleCheckout(plan._id, 'esewa')}
                            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#60BB46] hover:bg-[#52a63b] text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all disabled:opacity-60"
                          >
                            {checkoutPlanId === plan._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <CreditCard size={16} />
                            )}
                            <span>Pay with eSewa</span>
                          </button>

                          {/* Khalti Button */}
                          <button
                            disabled={checkoutPlanId === plan._id}
                            onClick={() => handleCheckout(plan._id, 'khalti')}
                            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#5C2D91] hover:bg-[#4d257a] text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all disabled:opacity-60"
                          >
                            {checkoutPlanId === plan._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <CreditCard size={16} />
                            )}
                            <span>Pay with Khalti</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Key Premium Benefits Grid ── */}
        <div className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900">Why Go Premium?</h3>
            <p className="text-xs sm:text-sm text-gray-500">
              Unlock distinct competitive advantages that speed up your job search and hiring results.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Priority Application Indexing</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your job submissions appear at the top of the employer candidate stack with a verified Pro badge.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Users2 size={20} />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Who Viewed My Profile</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                See detailed viewer analytics: which companies inspected your resume and what search terms led to you.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <FileCheck2 size={20} />
              </div>
              <h4 className="text-sm font-bold text-gray-900">AI Resume & Cover Letters</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Generate tailored, ATS-optimized cover letters and resume summaries custom-fit to any job posting.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Direct InMail Messaging</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Reach hiring managers and peer connections directly without waiting for manual acceptance.
              </p>
            </div>
          </div>
        </div>

        {/* ── Payment History ── */}
        {payments.length > 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Payment & Invoicing History</h3>
              <p className="text-xs text-gray-500 mt-0.5">Records of past subscription transactions and receipt status.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold">Plan Name</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Amount</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Payment Gateway</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Status</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{p.plan?.name || 'Standard Plan'}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">
                        {p.currency} {p.amount}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                          p.gateway?.toLowerCase() === 'esewa' ? 'bg-[#60BB46]/10 text-[#4c9735]' : 'bg-[#5C2D91]/10 text-[#5C2D91]'
                        }`}>
                          <CreditCard size={12} /> {p.gateway}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={12} /> Success
                          </span>
                        ) : p.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                            <XCircle size={12} /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700 capitalize">
                            <Clock size={12} /> {p.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {new Date(p.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FAQ Section ── */}
        <div className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm space-y-5">
          <div className="text-center max-w-lg mx-auto mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Frequently Asked Questions</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Everything you need to know about payments and billing.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {[
              {
                q: 'How does payment with eSewa or Khalti work?',
                a: 'Clicking either gateway button redirects you securely to eSewa or Khalti. After authorizing your digital wallet payment, you will be redirected back to QuickJobs and your plan activates instantly.',
              },
              {
                q: 'Can I cancel my subscription at any time?',
                a: 'Yes, you can cancel whenever you wish from this page. You will maintain complete access to all premium features until your paid billing cycle reaches its expiration date.',
              },
              {
                q: 'Will my plan automatically renew?',
                a: 'Digital wallet payments in Nepal operate on a per-cycle basis. Before your plan expires, you will receive a notification allowing you to renew seamlessly.',
              },
              {
                q: 'Can I upgrade or switch plans later?',
                a: 'Absolutely. Choosing a new plan will replace your active tier and adjust your benefits immediately.',
              },
            ].map((faq, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-semibold text-gray-900 hover:bg-gray-100/60 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180 text-primary' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}