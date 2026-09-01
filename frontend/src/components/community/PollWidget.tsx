import { useState } from 'react';
import { toast } from 'react-toastify';
import { votePoll } from '../../api/communityApi';
import { useCurrentUser } from '../../utils/currentUser';
import type { PollData } from '../../types/community';

export function PollWidget({ postId, pollData }: { postId: string; pollData: PollData }) {
  const { isAuthenticated, userId } = useCurrentUser();
  const [data, setData] = useState(pollData);
  const [busy, setBusy] = useState(false);

  const totalVotes = data.options.reduce((sum, o) => sum + o.votes.length, 0);
  const hasVoted = !!userId && data.options.some((o) => o.votes.includes(userId));
  const isExpired = data.expiresAt ? new Date(data.expiresAt) < new Date() : false;

  const handleVote = async (optionId: string) => {
    if (!isAuthenticated) return toast.info('Log in to vote in this poll.');
    if (isExpired || busy) return;
    setBusy(true);
    try {
      const updated = await votePoll(postId, optionId);
      setData(updated);
    } catch {
      toast.error('Could not record your vote. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {data.options.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
        const selected = !!userId && option.votes.includes(userId);
        return (
          <button
            key={option._id}
            type="button"
            disabled={busy || isExpired}
            onClick={() => handleVote(option._id)}
            className="relative w-full overflow-hidden rounded-lg border border-gray-200 text-left text-sm disabled:cursor-default"
          >
            {(hasVoted || isExpired) && (
              <div
                className={`absolute inset-y-0 left-0 ${selected ? 'bg-primary/20' : 'bg-secondary'}`}
                style={{ width: `${pct}%` }}
              />
            )}
            <div className="relative flex items-center justify-between px-3 py-2">
              <span className={`font-medium ${selected ? 'text-primary' : 'text-dark'}`}>{option.text}</span>
              {(hasVoted || isExpired) && (
                <span className="text-xs text-gray-500">
                  {pct}% ({option.votes.length})
                </span>
              )}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-gray-500">
        {totalVotes} vote{totalVotes === 1 ? '' : 's'}
        {isExpired ? ' · Poll closed' : data.expiresAt ? ` · Closes ${new Date(data.expiresAt).toLocaleDateString()}` : ''}
      </p>
    </div>
  );
}
