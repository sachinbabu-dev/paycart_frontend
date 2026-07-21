"use client";

import { useState } from "react";
import {
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";
import Notice from "./Notice";

interface Props {
  subscriptionId: string;
}

export default function SubscribeForm({ subscriptionId }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExpress, setHasExpress] = useState(false);
  // Track PaymentElement mount so we don't call confirmPayment before Stripe
  // has actually mounted an element — otherwise Stripe throws
  // IntegrationError: "elements should have a mounted Payment Element…".
  const [paymentReady, setPaymentReady] = useState(false);

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/account/subscriptions/${subscriptionId}`
      : "/";

  async function submit() {
    if (!stripe || !elements || !paymentReady) return;
    setBusy(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (err) {
      setError(err.message ?? "Payment failed.");
      setBusy(false);
    }
  }

  async function onExpressConfirm(
    _event: StripeExpressCheckoutElementConfirmEvent,
  ) {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (err) {
      setError(err.message ?? "Payment failed.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-5"
    >
      <div className={hasExpress ? "flex flex-col gap-4" : "hidden"}>
        <ExpressCheckoutElement
          onReady={(event) => {
            setHasExpress(
              Boolean(
                event.availablePaymentMethods &&
                  Object.values(event.availablePaymentMethods).some(Boolean),
              ),
            );
          }}
          onConfirm={onExpressConfirm}
          options={{
            buttonHeight: 48,
            buttonTheme: { applePay: "black", googlePay: "black" },
            paymentMethods: {
              applePay: "always",
              googlePay: "always",
              link: "auto",
            },
          }}
        />
        <div className="flex items-center gap-3 text-ink-mute">
          <span className="flex-1 h-px bg-ink/15" />
          <span className="stamp">or use a card</span>
          <span className="flex-1 h-px bg-ink/15" />
        </div>
      </div>

      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setPaymentReady(true)}
        onLoadError={(event) => {
          setError(
            event.error?.message ??
              "Stripe couldn't load the payment form for this subscription.",
          );
        }}
      />

      {!paymentReady && !error && (
        <div className="flex items-center gap-2 text-ink-mute text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Preparing payment form…
        </div>
      )}

      {error && (
        <Notice title="Subscription payment error" tone="error">
          {error}
        </Notice>
      )}

      <button
        type="submit"
        disabled={!stripe || busy || !paymentReady}
        className="btn-primary justify-center"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirm subscription
      </button>
    </form>
  );
}
