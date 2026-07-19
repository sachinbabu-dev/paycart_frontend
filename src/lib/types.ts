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
