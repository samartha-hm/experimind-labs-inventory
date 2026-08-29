import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sku: string;
  maxStock?: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => { success: boolean; message?: string };
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => { success: boolean; message?: string };
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
  getItemQuantity: (id: string) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (newItem) => {
        let success = true;
        let message = '';
        const maxStock = typeof newItem.maxStock === 'number' ? newItem.maxStock : 99;

        set((state) => {
          const existing = state.items.find((i) => i.id === newItem.id);
          if (existing) {
            const desiredQty = existing.quantity + newItem.quantity;
            if (desiredQty > maxStock) {
              success = false;
              message = `Only ${maxStock} unit${maxStock === 1 ? '' : 's'} available in stock.`;
              return {
                items: state.items.map((i) =>
                  i.id === newItem.id ? { ...i, quantity: maxStock, maxStock } : i
                ),
              };
            }
            return {
              items: state.items.map((i) =>
                i.id === newItem.id ? { ...i, quantity: desiredQty, maxStock } : i
              ),
            };
          }

          if (newItem.quantity > maxStock) {
            success = false;
            message = `Only ${maxStock} unit${maxStock === 1 ? '' : 's'} available in stock.`;
            return { items: [...state.items, { ...newItem, quantity: maxStock, maxStock }] };
          }

          return { items: [...state.items, { ...newItem, maxStock }] };
        });

        return { success, message };
      },
      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id),
      })),
      updateQuantity: (id, quantity) => {
        let success = true;
        let message = '';

        set((state) => {
          const item = state.items.find((i) => i.id === id);
          if (!item) return state;

          const maxStock = typeof item.maxStock === 'number' ? item.maxStock : 99;
          if (quantity > maxStock) {
            success = false;
            message = `Maximum stock limit of ${maxStock} reached.`;
            return {
              items: state.items.map((i) => (i.id === id ? { ...i, quantity: maxStock } : i)),
            };
          }

          const safeQty = Math.max(1, quantity);
          return {
            items: state.items.map((i) => (i.id === id ? { ...i, quantity: safeQty } : i)),
          };
        });

        return { success, message };
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      itemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
      getItemQuantity: (id) => {
        const item = get().items.find((i) => i.id === id);
        return item ? item.quantity : 0;
      },
    }),
    {
      name: 'experimind-cart',
    }
  )
);
