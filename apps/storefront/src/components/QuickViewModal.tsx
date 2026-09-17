'use client';
import React, { useState } from 'react';
import { X, Sparkles, Star, Award, CheckCircle2, ShoppingBag, Box, Truck, ShieldCheck, ArrowRight } from 'lucide-react';
import SafeProductImage from './SafeProductImage';
import { useCartStore } from '@/store/useCartStore';
import Link from 'next/link';

interface QuickViewModalProps {
  product: any;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  if (!product) return null;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.basePrice,
      imageUrl: product.imageUrl,
      category: product.category,
      quantity: quantity
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 sm:p-8 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Media Column */}
          <div className="md:col-span-5 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100 p-6 flex items-center justify-center aspect-square relative overflow-hidden">
            <SafeProductImage
              src={product.imageUrl}
              alt={product.name}
              category={product.category}
              className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
            />

            {product.badge && (
              <span className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                {product.badge}
              </span>
            )}
          </div>

          {/* Details Column */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-md">
                  {product.category || 'STEM Kit'}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {product.gradeLevel || 'Grades 6–10'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {product.name}
              </h2>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{product.rating || '4.9'}</span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {product.reviewsCount || 48} verified educator reviews
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {product.description || 'Hands-on experiential learning kit designed by educational researchers at ExperiMind Labs.'}
            </p>

            {/* In the Box Highlights */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>What's in the Box:</span>
              </div>
              <ul className="text-slate-600 text-[11px] space-y-1 pl-5 list-disc">
                <li>Complete precision lab apparatus & component set</li>
                <li>Illustrated student activity workbook & experiment cards</li>
                <li>Curriculum-aligned teacher facilitation primer (NEP 2020)</li>
              </ul>
            </div>

            {/* Price & Quantity Selector */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  ₹{Number(product.basePrice || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-emerald-600 font-bold">Inclusive of GST</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 text-xs font-bold">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-3 py-2 text-slate-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  className={`flex-grow py-2.5 px-5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md ${
                    added
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{added ? 'Added to Cart!' : 'Add to Cart'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <div className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pan-India 3–5 Days Dispatch</span>
                </div>
                <Link
                  href={`/product/${product.id}`}
                  onClick={onClose}
                  className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                >
                  <span>Full Product Specs</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
