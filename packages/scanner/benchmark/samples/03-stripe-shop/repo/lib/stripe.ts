import Stripe from "stripe";

export const stripe = new Stripe("{{STRIPE_LIVE_KEY}}", {
  apiVersion: "2024-06-20",
});

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
