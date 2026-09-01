import { useEffect, useState } from 'react';
import { LifeBuoy, MessageSquareText, Clock, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { fetchMyTickets, SupportTicket } from '../../../api/supportApi';

const STATUS_STYLES: Record<SupportTicket['status'], { label: string; className: string; icon: React.ElementType }> = {
  open: { label: 'Open', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Inbox },
  in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  resolved: { label: 'Resolved', className: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
};

const UserSupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchMyTickets();
        setTickets(data);
      } catch (err) {
        console.error('Failed to load support tickets:', err);
        setError('Could not load your support tickets. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <LifeBuoy className="text-primary" size={24} />
          <h1 className="text-2xl font-bold text-gray-800">My Support Tickets</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Track the messages you've sent our support team and read their replies here.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <MessageSquareText size={40} className="mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-800 mb-1">No support tickets yet</h3>
          <p className="text-sm text-gray-500">
            When you contact support, your messages and their replies will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const status = STATUS_STYLES[ticket.status];
            const StatusIcon = status.icon;
            return (
              <div key={ticket._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{ticket.subject}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                      {' · '}
                      <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.className}`}>
                    <StatusIcon size={12} />
                    {status.label}
                  </span>
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm text-gray-700 mb-3">
                  {ticket.message}
                </div>

                {ticket.adminReply ? (
                  <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-500">
                      Support Team Reply
                      {ticket.repliedAt && (
                        <span className="font-normal normal-case text-violet-400">
                          {' · '}
                          {new Date(ticket.repliedAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                      )}
                    </p>
                    {ticket.adminReply}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Our support team hasn't replied yet — we'll get back to you soon.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserSupportTickets;