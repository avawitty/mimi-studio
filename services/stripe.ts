import { PlanTier, type BillingInterval } from '../constants';
import { auth } from './firebaseInit';

const authenticatedRequest = async (path: string, body?: Record<string, unknown>) => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error('Sign in with Google or email before managing a subscription.');
  }

  const token = await user.getIdToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // API returns the standard envelope { error: { message } }; tolerate legacy string too.
    const message =
      (data?.error && typeof data.error === 'object' ? data.error.message : data?.error) ||
      'Stripe request failed';
    throw new Error(message);
  }
  return data;
};

export const createCheckoutSession = async (
  plan: Exclude<PlanTier, 'free'>,
  interval: BillingInterval = 'month',
) => {
  try {
    const data = await authenticatedRequest('/api/create-checkout-session', { plan, interval });

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const openBillingPortal = async () => {
  const data = await authenticatedRequest('/api/create-billing-portal-session');
  if (!data.url) throw new Error('No billing portal URL returned');
  window.location.href = data.url;
};
