"use client";

import { useState } from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import Notice from "./Notice";

interface Props {
  orderId: string;
}

export default function CheckoutForm({ orderId }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const returnUrl = `${window.location.origin}/orders/${orderId}`;
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (err) {
      setError(err.message ?? "Payment failed.");
      setBusy(false);
    }
    // On success Stripe redirects to return_url.
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <PaymentElement />
      {error && <Notice title="Payment error" tone="error">{error}</Notice>}
      <button
        type="submit"
        disabled={!stripe || busy}
        className="btn-primary justify-center"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Pay now
      </button>
    </form>
  );
}
