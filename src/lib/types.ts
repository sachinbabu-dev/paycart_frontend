export type ProductType = "one_time" | "recurring";
export type BillingInterval = "month" | "year";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  type: ProductType;
  unitPrice: string;
  currency: string;
  billingInterval: BillingInterval | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  productId: string;
  stockQuantity: number;
  updatedAt: string;
}

export type OrderStatus =
  | "pending"
  | "payment_pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "cancelled"
  | "failed";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: string;
  currency: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  eventType: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

// The docs mark auth responses as generic `object`. Handle common shapes.
export interface AuthResponse {
  accessToken?: string;
  access_token?: string;
  token?: string;
  user?: { id?: string; email?: string };
  email?: string;
  id?: string;
}

export interface CheckoutResponse {
  clientSecret?: string;
  client_secret?: string;
  paymentIntentId?: string;
  publishableKey?: string;
}

export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "trialing"
  | "paused";

export interface Subscription {
  id: string;
  userId: string;
  productId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  latestInvoiceId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribeResponse {
  id?: string;
  subscriptionId?: string;
  clientSecret?: string;
  client_secret?: string;
  status?: SubscriptionStatus;
  subscription?: Subscription;
}

export type StreamMessage =
  | {
      kind: "snapshot";
      order: Order;
      events: OrderEvent[];
    }
  | {
      kind: "event";
      type: string;
      aggregateId: string;
      payload: Record<string, unknown>;
      occurredAt: string;
    }
  | { kind: "ping" };

export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  eventType: string;
  fromStatus: SubscriptionStatus | null;
  toStatus: SubscriptionStatus | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export type SubscriptionStreamMessage =
  | {
      kind: "snapshot";
      subscription: Subscription;
      events: SubscriptionEvent[];
    }
  | {
      kind: "event";
      type: string;
      aggregateId: string;
      payload: Record<string, unknown>;
      occurredAt: string;
    }
  | { kind: "keepalive"; ts: string };

export interface CartLine {
  productId: string;
  sku: string;
  name: string;
  unitPrice: string;
  currency: string;
  quantity: number;
  type: ProductType;
  billingInterval: BillingInterval | null;
}
