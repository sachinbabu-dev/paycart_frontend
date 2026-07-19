"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartLine, Product } from "./types";
import { cookieBackedStorage } from "./cookies";

interface AuthState {
  token: string | null;
  email: string | null;
  setSession: (token: string, email: string) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      setSession: (token, email) => set({ token, email }),
      clear: () => set({ token: null, email: null }),
    }),
    {
      name: "kaffeine-auth",
      storage: createJSONStorage(() => cookieBackedStorage),
    },
  ),
);

interface CartState {
  lines: CartLine[];
  add: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (product, quantity = 1) => {
        const existing = get().lines.find((l) => l.productId === product.sku);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.productId === product.sku
                ? { ...l, quantity: l.quantity + quantity }
                : l,
            ),
          });
          return;
        }
        set({
          lines: [
            ...get().lines,
            {
              productId: product.sku,
              sku: product.sku,
              name: product.name,
              unitPrice: product.unitPrice,
              currency: product.currency,
              quantity,
              type: product.type,
              billingInterval: product.billingInterval,
            },
          ],
        });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ lines: get().lines.filter((l) => l.productId !== productId) });
          return;
        }
        set({
          lines: get().lines.map((l) =>
            l.productId === productId ? { ...l, quantity } : l,
          ),
        });
      },
      remove: (productId) =>
        set({ lines: get().lines.filter((l) => l.productId !== productId) }),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "kaffeine-cart",
      storage: createJSONStorage(() => cookieBackedStorage),
    },
  ),
);

interface OrdersState {
  recent: string[]; // recent order IDs (locally tracked)
  push: (id: string) => void;
  clear: () => void;
}

export const useRecentOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      recent: [],
      push: (id) => {
        const next = [id, ...get().recent.filter((x) => x !== id)].slice(0, 20);
        set({ recent: next });
      },
      clear: () => set({ recent: [] }),
    }),
    {
      name: "kaffeine-recent-orders",
      storage: createJSONStorage(() => cookieBackedStorage),
    },
  ),
);

export function cartTotal(lines: CartLine[]): {
  amount: number;
  currency: string;
} {
  const amount = lines.reduce(
    (sum, l) => sum + Number(l.unitPrice) * l.quantity,
    0,
  );
  const currency = lines[0]?.currency ?? "USD";
  return { amount, currency };
}
