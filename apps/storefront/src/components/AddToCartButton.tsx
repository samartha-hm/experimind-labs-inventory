'use client';
import { useCartStore } from "@/store/useCartStore";
import { Plus, Check, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function AddToCartButton({
  product,
  fullWidth = false,
}: {
  product: any;
  fullWidth?: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const getItemQuantity = useCartStore((state) => state.getItemQuantity);
  const [mounted, setMounted] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'added' | 'max' | null; msg?: string }>({
    type: null,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentInCart = mounted && product?.id ? getItemQuantity(product.id) : 0;
  const maxStock = typeof product?.stockQty === 'number' ? product.stockQty : 99;
  const isOutOfStock = maxStock <= 0;
  const isMaxReached = currentInCart >= maxStock;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product || isOutOfStock || isMaxReached) return;

    const result = addItem({
      id: product.id,
      name: product.name,
      price: product.basePrice,
      quantity: 1,
      imageUrl: product.imageUrl,
      sku: product.sku,
      maxStock: maxStock,
    });

    if (result.success) {
      setFeedback({ type: 'added', msg: 'Added to Cart' });
    } else {
      setFeedback({ type: 'max', msg: result.message || 'Stock limit reached' });
    }

    setTimeout(() => {
      setFeedback({ type: null });
    }, 2000);
  };

  if (isOutOfStock) {
    return (
      <button
        disabled
        className={`bg-slate-100 text-slate-400 font-bold cursor-not-allowed flex items-center justify-center text-xs ${
          fullWidth ? 'w-full py-4 rounded-2xl' : 'px-3 py-1.5 rounded-full'
        }`}
      >
        Out of Stock
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={isMaxReached && feedback.type === null}
      className={`transition-all flex items-center justify-center font-bold text-xs tracking-wide shadow-xs active:scale-95 duration-200 ${
        fullWidth
          ? 'w-full py-4 rounded-2xl text-sm font-extrabold shadow-md'
          : 'px-4 py-2 rounded-full'
      } ${
        feedback.type === 'added'
          ? 'bg-emerald-600 text-white shadow-emerald-600/20'
          : feedback.type === 'max' || isMaxReached
          ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 hover:shadow-indigo-600/30 cursor-pointer'
      }`}
      aria-label="Add to Cart"
    >
      {feedback.type === 'added' ? (
        <span className="flex items-center gap-1.5 animate-fadeIn">
          <Check className="h-4 w-4" />
          <span>Added!</span>
        </span>
      ) : feedback.type === 'max' ? (
        <span className="flex items-center gap-1.5 text-amber-700 animate-fadeIn">
          <AlertCircle className="h-4 w-4" />
          <span>Max Limit ({maxStock})</span>
        </span>
      ) : isMaxReached ? (
        <span>Max in Cart ({maxStock})</span>
      ) : (
        <span className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          <span>{fullWidth ? 'Add to Cart' : 'Add'}</span>
        </span>
      )}
    </button>
  );
}
