import React, { useState, useEffect } from 'react';
import ShopTab from './features/storefront/components/ShopTab';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import { InventoryItem } from './types';

function StorefrontContent() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetch('/api/public/storefront/catalog')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInventory(data);
        }
      })
      .catch(err => {
        console.error('Failed to load catalog:', err);
        showToast('error', 'Failed to load catalog', err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePlaceOrder = async (orderData: any) => {
    try {
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.phone,
          items: orderData.items.map((i: any) => ({
            itemId: i.assetId,
            quantity: i.quantity,
          })),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place order');
      }

      // Decrement stock locally for immediate feedback
      for (const it of orderData.items) {
        setInventory(prev => prev.map(item => {
          if (item.id === it.assetId) {
            return { ...item, stockQty: Math.max(0, item.stockQty - it.quantity) };
          }
          return item;
        }));
      }

    } catch (err: any) {
      console.error('Storefront order placement error:', err);
      showToast('error', 'Order Placement Failed', err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <ShopTab inventory={inventory} onPlaceOrder={handlePlaceOrder} />
      </div>
    </div>
  );
}

export default function StorefrontApp() {
  return (
    <ToastProvider>
      <ToastContainer />
      <StorefrontContent />
    </ToastProvider>
  );
}
