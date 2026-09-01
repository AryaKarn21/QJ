import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import { submitTicket } from '../../../api/supportApi';

const Contact = () => {
  const isLoggedIn = !!localStorage.getItem('token');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLoggedIn && (!name.trim() || !email.trim())) {
      setError('Please fill in your name and email.');
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in a subject and message.');
      return;
    }

    setSubmitting(true);
    try {
      await submitTicket({
        name: isLoggedIn ? undefined : name,
        email: isLoggedIn ? undefined : email,
        subject,
        message,
        category,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      setError('Something went wrong submitting your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-white px-6 text-center">
        <CheckCircle2 size={48} className="mb-4 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-800">Message sent</h1>
        <p className="mt-2 max-w-md text-gray-600">
          Thanks for reaching out — our support team will get back to you soon at{' '}
          <span className="font-medium">{isLoggedIn ? 'your account email' : email}</span>.
        </p>
        {isLoggedIn && (
          <Link
            to="/user/support"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            View My Support Tickets
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-white px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <MessageSquare size={40} className="mx-auto mb-3 text-primary" />
          <h1 className="text-3xl font-bold text-gray-800">Contact Support</h1>
          <p className="mt-2 text-gray-600">
            Have a question or ran into an issue? Send us a message and we'll get back to you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoggedIn && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="general">General Question</option>
              <option value="technical">Technical Issue</option>
              <option value="billing">Billing</option>
              <option value="account">Account</option>
              <option value="job_posting">Job Posting</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Mail size={18} />
            {submitting ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contact;