import type {
  AuthCredentials,
  AuthResponse,
  CheckoutResponse,
  InventoryItem,
  Order,
  OrderEvent,
  Product,
} from "./types";

const CLIENT_BASE = "/api/paycart";
const SERVER_BASE =
  process.env.PAYCART_API_URL ??
  "https://paycartbackend-production.up.railway.app";

function baseUrl(): string {
  return typeof window === "undefined" ? SERVER_BASE : CLIENT_BASE;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  cache?: RequestCache;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, headers = {}, cache } = opts;
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (token) finalHeaders["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: cache ?? "no-store",
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    let message = res.statusText || "Request failed";
    if (parsed && typeof parsed === "object" && "message" in parsed) {
      const raw = (parsed as { message: unknown }).message;
      if (raw) message = Array.isArray(raw) ? raw.join(", ") : String(raw);
    }
    throw new ApiError(res.status, message, parsed);
  }
  return parsed as T;
}

export const api = {
  listProducts: () => request<Product[]>("/products"),
  getProduct: (sku: string) =>
    request<Product>(`/products/${encodeURIComponent(sku)}`),
  listInventory: () => request<InventoryItem[]>("/inventory"),
  getInventory: (productId: string) =>
    request<InventoryItem>(`/inventory/${encodeURIComponent(productId)}`),
  signup: (creds: AuthCredentials) =>
    request<AuthResponse>("/auth/signup", { method: "POST", body: creds }),
  login: (creds: AuthCredentials) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: creds }),
  createOrder: (
    items: { productId: string; quantity: number }[],
    token: string,
  ) =>
    request<Order>("/orders", {
      method: "POST",
      body: { items },
      token,
    }),
  getOrder: (id: string, token: string) =>
    request<Order>(`/orders/${encodeURIComponent(id)}`, { token }),
  getOrderEvents: (id: string, token: string) =>
    request<OrderEvent[]>(`/orders/${encodeURIComponent(id)}/events`, { token }),
  checkout: (orderId: string, idempotencyKey: string, token: string) =>
    request<CheckoutResponse>(
      `/orders/${encodeURIComponent(orderId)}/checkout`,
      {
        method: "POST",
        token,
        headers: {
          "Idempotency-Key": idempotencyKey,
          "idempotency-key": idempotencyKey,
        },
      },
    ),
  mintStreamToken: (token: string) =>
    request<{ streamToken: string; expiresIn: number }>(
      "/auth/stream-token",
      { method: "POST", token },
    ),
};

export function orderStreamUrl(orderId: string, streamToken: string): string {
  return `/api/paycart/orders/${encodeURIComponent(orderId)}/stream?token=${encodeURIComponent(streamToken)}`;
}

export function pickAccessToken(res: AuthResponse): string | null {
  return res.accessToken ?? res.access_token ?? res.token ?? null;
}

export function pickClientSecret(res: CheckoutResponse): string | null {
  return res.clientSecret ?? res.client_secret ?? null;
}
