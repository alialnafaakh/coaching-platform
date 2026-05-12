import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export const SESSION_PRICE_CENTS = 5000; // $50.00
export const ORIGINAL_PRICE_CENTS = 10000; // $100.00 (for display)
