import React, { useState, useRef } from "react";
import { TrendingUp, TrendingDown, ArrowRight, ArrowLeft, ShoppingBag, DollarSign } from "lucide-react";
import { StockItem } from "../../data/stockUniverse";

interface SwipeableStockListItemProps {
  stock: StockItem;
  rankIndex?: number;
  isSelected?: boolean;
  onSelect: (stock: StockItem) => void;
  onSwipeBuy: (stock: StockItem) => void;
  onSwipeSell: (stock: StockItem) => void;
}

export const SwipeableStockListItem: React.FC<SwipeableStockListItemProps> = ({
  stock,
  rankIndex,
  isSelected,
  onSelect,
  onSwipeBuy,
  onSwipeSell
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  const SWIPE_THRESHOLD = 65; // pixels to trigger buy/sell

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    if (Math.abs(diff) < 140) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > SWIPE_THRESHOLD) {
      // Swiped Right -> BUY
      onSwipeBuy(stock);
    } else if (swipeOffset < -SWIPE_THRESHOLD) {
      // Swiped Left -> SELL
      onSwipeSell(stock);
    } else if (Math.abs(swipeOffset) < 10) {
      // Tap detected! Trigger selection immediately
      onSelect(stock);
    }

    // Reset position
    setSwipeOffset(0);
    setTouchStartX(null);
    setIsSwiping(false);
    touchStartPos.current = null;
  };

  const isUS = stock.market === "US" || (stock.symbol && !/^\d{6}$/.test(stock.symbol) && stock.symbol !== "BTC" && !stock.symbol.startsWith("KRW-"));

  return (
    <div className="relative overflow-hidden rounded-xl my-1 select-none touch-pan-y">
      {/* Background Reveal Actions Layer */}
      <div className="absolute inset-0 flex items-center justify-between font-bold text-xs px-3 rounded-xl">
        {/* Left reveal (Swiping Right -> BUY) */}
        <div className={`flex items-center gap-1.5 text-white font-black transition-opacity ${
          swipeOffset > 15 ? "opacity-100" : "opacity-0"
        }`}>
          <div className="p-1 rounded-md bg-emerald-600 shadow-xs flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>매수 (BUY)</span>
          </div>
        </div>

        {/* Right reveal (Swiping Left -> SELL) */}
        <div className={`flex items-center gap-1.5 text-white font-black transition-opacity ${
          swipeOffset < -15 ? "opacity-100" : "opacity-0"
        }`}>
          <div className="p-1 rounded-md bg-rose-600 shadow-xs flex items-center gap-1">
            <span>매도 (SELL)</span>
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Swipeable Foreground Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onSelect(stock)}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        className={`relative z-10 p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between text-xs font-sans bg-white dark:bg-slate-900 ${
          isSelected
            ? "bg-blue-50/90 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 ring-1 ring-blue-300"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200/80 dark:border-slate-800"
        }`}
      >
        <div className="flex items-center gap-2">
          {rankIndex !== undefined && (
            <span className="w-4 text-center font-mono font-bold text-slate-400 dark:text-slate-500 text-[10px]">
              {rankIndex}
            </span>
          )}
          <div>
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
              <span>{stock.name}</span>
              <span className="text-[9px] px-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 font-mono">
                {stock.categoryLabel || stock.category}
              </span>

              {/* VISUAL LONG/SHORT SIGNAL BADGE */}
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-black border flex items-center gap-0.5 ${
                stock.signal === "LONG" || stock.changeRate >= 0
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
              }`}>
                {stock.signal === "LONG" || stock.changeRate >= 0 ? (
                  <>▲ <span className="text-[8px]">🚀 LONG</span></>
                ) : (
                  <>▼ <span className="text-[8px]">📉 SHORT</span></>
                )}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{stock.symbol}</div>
          </div>
        </div>

        <div className="text-right font-mono">
          <div className="font-black text-slate-900 dark:text-white">
            {isUS ? `$${(stock.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${(stock.price ?? 0).toLocaleString()}원`}
          </div>
          <div className={`text-[10px] font-bold ${
            stock.changeRate >= 0 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
          }`}>
            {stock.changeRate >= 0 ? "+" : ""}{stock.changeRate}%
          </div>
        </div>
      </div>
    </div>
  );
};
