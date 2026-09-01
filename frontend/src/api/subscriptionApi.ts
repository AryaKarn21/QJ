import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export type Gateway = 'esewa' | 'khalti';

export interface Plan {
  _id: string;
  name: string;
  role: 'employer' | 'jobseeker' | 'both';
  description?: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  _id: string;
  user: string;
  plan: Plan;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed';
  startDate?: string;
  endDate?: string;
  autoRenew: boolean;
  gateway: Gateway;
  lastPayment?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  user: string;
  subscription: string;
  plan: { _id: string; name: string; billingCycle: 'monthly' | 'yearly' } | null;
  amount: number;
  currency: string;
  gateway: Gateway;
  referenceId: string;
  gatewayTransactionId?: string | null;
  status: 'initiated' | 'success' | 'failed' | 'refunded';
  createdAt: string;
}

export interface AdminSubscriptionRow extends Omit<Subscription, 'user' | 'plan'> {
  user: { _id: string; name: string; email: string; role: string };
  plan: { _id: string; name: string; price: number; billingCycle: 'monthly' | 'yearly' };
}

type PlanPayload = Omit<Plan, '_id' | 'createdAt' | 'updatedAt'>;

// ── Plans (public read; admin write — enforced server-side too) ───────────

export const getPlans = async (
  role?: 'employer' | 'jobseeker',
  includeInactive?: boolean
): Promise<Plan[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/subscriptions/plans`, {
    ...getAuthHeader(),
    params: {
      role: role || undefined,
      includeInactive: includeInactive || undefined,
    },
  });
  return res.data as Plan[];
};

export const getPlanById = async (id: string): Promise<Plan> => {
  const res = await axios.get(`${API_BASE_URL}/api/subscriptions/plans/${id}`, getAuthHeader());
  return res.data as Plan;
};

export const createPlan = async (payload: PlanPayload): Promise<Plan> => {
  const res = await axios.post(`${API_BASE_URL}/api/subscriptions/plans`, payload, getAuthHeader());
  return res.data as Plan;
};

export const updatePlan = async (id: string, payload: Partial<PlanPayload>): Promise<Plan> => {
  const res = await axios.put(`${API_BASE_URL}/api/subscriptions/plans/${id}`, payload, getAuthHeader());
  return res.data as Plan;
};

export const deletePlan = async (id: string): Promise<{ message: string }> => {
  const res = await axios.delete(`${API_BASE_URL}/api/subscriptions/plans/${id}`, getAuthHeader());
  return res.data as { message: string };
};

// ── My subscription (employer / jobseeker) ────────────────────────────────

export const getMySubscription = async (): Promise<Subscription | null> => {
  const res = await axios.get(`${API_BASE_URL}/api/subscriptions/me`, getAuthHeader());
  return (res.data.subscription as Subscription | null) ?? null;
};

export const getMyPaymentHistory = async (): Promise<Payment[]> => {
  const res = await axios.get(`${API_BASE_URL}/api/subscriptions/me/payments`, getAuthHeader());
  return res.data as Payment[];
};

export const cancelMySubscription = async (): Promise<Subscription> => {
  const res = await axios.post(`${API_BASE_URL}/api/subscriptions/cancel`, {}, getAuthHeader());
  return res.data.subscription as Subscription;
};

// ── Checkout ────────────────────────────────────────────────────────────
// The backend returns a different shape per gateway: eSewa needs an actual
// HTML form POST (it signs the payload and only accepts form submissions),
// while Khalti hands back a hosted payment URL to redirect to. Both leave
// the current page, so callers don't get a normal resolved value back.

interface EsewaCheckoutResponse {
  gateway: 'esewa';
  redirectMethod: 'form-post';
  gatewayUrl: string;
  fields: Record<string, string>;
  referenceId: string;
}

interface KhaltiCheckoutResponse {
  gateway: 'khalti';
  redirectMethod: 'redirect';
  paymentUrl: string;
  referenceId: string;
}

export const startCheckout = async (planId: string, gateway: Gateway): Promise<void> => {
  const res = await axios.post(
    `${API_BASE_URL}/api/subscriptions/checkout`,
    { planId, gateway },
    getAuthHeader()
  );
  const data = res.data as EsewaCheckoutResponse | KhaltiCheckoutResponse;

  if (data.gateway === 'esewa') {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = data.gatewayUrl;
    Object.entries(data.fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    return;
  }

  window.location.href = data.paymentUrl;
};

// Called from the Khalti return-URL landing page (/subscription/callback)
// once Khalti redirects back with a `pidx` — the backend re-verifies with
// Khalti's lookup API before activating, so this must complete before the
// subscription is considered active.
export const verifyKhaltiPayment = async (
  pidx: string
): Promise<{ status: string; detail?: string }> => {
  const res = await axios.post(
    `${API_BASE_URL}/api/subscriptions/verify/khalti`,
    { pidx },
    getAuthHeader()
  );
  return res.data as { status: string; detail?: string };
};

// ── Admin ──────────────────────────────────────────────────────────────

export const adminGetAllSubscriptions = async (opts?: {
  status?: Subscription['status'];
  page?: number;
  limit?: number;
}): Promise<{ subscriptions: AdminSubscriptionRow[]; total: number; page: number; limit: number }> => {
  const res = await axios.get(`${API_BASE_URL}/api/subscriptions/admin/all`, {
    ...getAuthHeader(),
    params: {
      status: opts?.status || undefined,
      page: opts?.page || undefined,
      limit: opts?.limit || undefined,
    },
  });
  return res.data;
};

export interface AdminSubscriptionDetail extends Omit<Subscription, 'user' | 'plan'> {
  user: { _id: string; name: string; email: string; role: string };
  plan: Plan;
}

export const adminGetSubscriptionById = async (
  id: string
): Promise<{ subscription: AdminSubscriptionDetail; payments: Payment[] }> => {
  const res = await axios.get(`${API_BASE_URL}/api/subscriptions/admin/${id}`, getAuthHeader());
  return res.data;
};
