import Stripe from "stripe";

// 판매자 대시보드의 환불 버튼
const stripe = new Stripe(import.meta.env.VITE_STRIPE_KEY, {
  apiVersion: "2024-06-20",
});

export async function refundOrder(paymentIntentId: string, amount?: number) {
  return stripe.refunds.create({ payment_intent: paymentIntentId, amount });
}

export async function listRecentCharges() {
  const { data } = await stripe.charges.list({ limit: 20 });
  return data;
}
