const CHECKOUT_RESUME_KEY = "kurio.checkout-resume";

export type CheckoutResume = {
  userId: string;
  walletId: string;
  idempotencyKey: string;
};

export function readCheckoutResume(userId: string): CheckoutResume | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_RESUME_KEY);
    const value = raw ? (JSON.parse(raw) as CheckoutResume) : null;
    return value?.userId === userId && value.walletId && value.idempotencyKey
      ? value
      : null;
  } catch {
    return null;
  }
}

export function saveCheckoutResume(value: CheckoutResume) {
  localStorage.setItem(CHECKOUT_RESUME_KEY, JSON.stringify(value));
}

export function clearCheckoutResume() {
  localStorage.removeItem(CHECKOUT_RESUME_KEY);
}
