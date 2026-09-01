import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { StatusBadge, statusToTone } from '../ui/StatusBadge';
import { adminGetSubscriptionById } from '../../api/subscriptionApi';

export default function AdminSubscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminSubscriptionDetail', id],
    queryFn: () => adminGetSubscriptionById(id as string),
    enabled: !!id,
    retry: false,
  });

  return (
    <div className="p-6">
      <button
        onClick={() => navigate('/admin/subscriptions')}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft size={15} /> Back to Subscriptions
      </button>

      {isLoading ? (
        <div className="flex items-center gap-2 py-16 text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : isError || !data ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          Couldn't load this subscription.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-admin-card border border-adminBorder bg-adminCard p-5 shadow-admin-card dark:border-slate-700">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Subscriber</h2>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{data.subscription.user?.name ?? 'Deleted user'}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{data.subscription.user?.email}</p>
              <p className="mt-1 text-xs capitalize text-slate-400">{data.subscription.user?.role}</p>
            </section>

            <section className="rounded-admin-card border border-adminBorder bg-adminCard p-5 shadow-admin-card dark:border-slate-700">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Payment History</h2>
              {data.payments.length === 0 ? (
                <p className="text-sm text-slate-400">No payment attempts recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2 pr-4">Gateway</th>
                        <th className="pb-2 pr-4">Reference</th>
                        <th className="pb-2 pr-4">Amount</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p) => (
                        <tr key={p._id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600 dark:text-slate-300">
                            {new Date(p.createdAt).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 capitalize text-slate-600 dark:text-slate-300">{p.gateway}</td>
                          <td className="max-w-[160px] truncate py-2.5 pr-4 text-slate-500 dark:text-slate-400">{p.referenceId}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600 dark:text-slate-300">
                            {p.currency} {p.amount}
                          </td>
                          <td className="py-2.5">
                            <StatusBadge label={p.status} tone={statusToTone(p.status)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-admin-card border border-adminBorder bg-adminCard p-5 shadow-admin-card dark:border-slate-700">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Subscription</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <StatusBadge label={data.subscription.status} tone={statusToTone(data.subscription.status)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Plan</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{data.subscription.plan?.name ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Price</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {data.subscription.plan ? `${data.subscription.plan.currency} ${data.subscription.plan.price} / ${data.subscription.plan.billingCycle}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Gateway</span>
                  <span className="capitalize text-slate-700 dark:text-slate-200">{data.subscription.gateway}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Start date</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {data.subscription.startDate ? new Date(data.subscription.startDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Renewal / end date</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {data.subscription.endDate ? new Date(data.subscription.endDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Auto-renew</span>
                  <span className="text-slate-700 dark:text-slate-200">{data.subscription.autoRenew ? 'Yes' : 'No'}</span>
                </div>
                {data.subscription.status === 'cancelled' && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    This subscription was cancelled — auto-renew is off and it will not be billed again.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
