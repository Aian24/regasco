'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Product, CylinderOption } from '@/types';
import { Plus, Minus, Repeat, PackagePlus, Flame } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { flyItemToCart } from '@/lib/flyToCart';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { cart, addToCart, updateQuantity } = useCart();
  const [option, setOption] = useState<CylinderOption>('REFILL');
  const imageRef = useRef<HTMLDivElement>(null);

  const cartKey = `${product.id}_${option}`;
  const currentQuantity = cart[cartKey]?.quantity || 0;
  const currentPrice =
    option === 'REFILL' ? product.priceRefill : product.priceNewTank;

  const handleIncrement = (e?: React.MouseEvent) => {
    const sourceEl = imageRef.current || (e?.currentTarget as HTMLElement);
    flyItemToCart(sourceEl, product.imageUrl, () => {
      addToCart(product, option, 1);
    });
  };

  const handleDecrement = () => {
    if (currentQuantity > 0) {
      updateQuantity(product.id, option, currentQuantity - 1);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 hover:border-orange-300 p-4 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      {/* Top badges */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {product.badge ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xs">
              {product.badge}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              Authentic Regasco
            </span>
          )}
        </div>

        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
          {product.weightKg} KG
        </span>
      </div>

      {/* Product Image Shot (Grab / Foodpanda style) */}
      <div
        ref={imageRef}
        className="relative w-full aspect-square max-h-52 bg-gradient-to-b from-slate-50 via-white to-orange-50/20 rounded-2xl flex items-center justify-center p-3 mb-3 overflow-hidden"
      >
        <div className="relative w-full h-full transform group-hover:scale-105 transition-transform duration-300">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            className="object-contain drop-shadow-md"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition-colors leading-snug">
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Grab/Foodpanda style Type Selector (Refill vs New Tank) */}
          <div className="mt-3 p-1 bg-slate-100 rounded-xl grid grid-cols-2 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setOption('REFILL')}
              className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                option === 'REFILL'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Refill</span>
            </button>
            <button
              type="button"
              onClick={() => setOption('NEW_TANK')}
              className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                option === 'NEW_TANK'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>New Tank</span>
            </button>
          </div>
        </div>

        {/* Price and Add to Basket Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">
              {option === 'REFILL' ? 'Refill Price' : 'New Tank Price'}
            </span>
            <span className="text-xl font-black text-slate-900">
              ₱{currentPrice.toLocaleString()}
            </span>
          </div>

          {/* Stepper or Add button */}
          {currentQuantity === 0 ? (
            <button
              type="button"
              onClick={(e) => handleIncrement(e)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add to Basket</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl p-1">
              <button
                type="button"
                onClick={handleDecrement}
                className="w-8 h-8 rounded-xl bg-white hover:bg-orange-100 text-orange-700 flex items-center justify-center active:scale-90 transition shadow-xs cursor-pointer"
              >
                <Minus className="w-4 h-4 stroke-[2.5]" />
              </button>
              <span className="w-6 text-center text-sm font-black text-orange-950">
                {currentQuantity}
              </span>
              <button
                type="button"
                onClick={(e) => handleIncrement(e)}
                className="w-8 h-8 rounded-xl bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center active:scale-90 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
