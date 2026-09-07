import React from 'react';
import { useApp } from '../context/AppContext';
import { InsufficientFundItem } from '../types';
import { AlertTriangle, Trash2, RefreshCw, AlertCircle, ShoppingCart } from 'lucide-react';

export const InsufficientFundStocksList: React.FC = () => {
  const { 
    insufficientFundStocks, 
    removeInsufficientFundStock, 
    clearInsufficientFundStocks,
    executeTrade,
    addToast
  } = useApp();

  const handleRetryTrade = async (item: InsufficientFundItem) => {
    try {
      addToast({
        type: 'INFO',
        title: '재주문 시도',
        message: `[${item.name}] 예수금 충전 후 주문을 다시 시도합니다...`
      });
      await executeTrade(
        item.symbol,
        item.name,
        item.market,
        item.side,
        item.qty,
        item.price,
        "잔고부족 재시도"
      );
      // 성공 시 목록에서 자동 제거
      removeInsufficientFundStock(item.symbol);
    } catch (err: any) {
      addToast({
        type: 'ERROR',
        title: '재주문 실패',
        message: err.message || '여전히 예수금 부족 또는 주문 오류입니다.'
      });
    }
  };

  if (!insufficientFundStocks || insufficientFundStocks.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm text-center">
        <div className="flex items-center justify-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">잔고 부족 종목 필터: 격리된 종목 없음</h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          현재 예수금 부족으로 체결 실패 및 자동 차단 목록에 등록된 종목이 없습니다. 모든 주문이 정상 실행되었거나 대기 중입니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-amber-300 dark:border-amber-900/60 shadow-md space-y-4">
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              🚫 잔고 부족 종목 자동 매수 차단 필터
              <span className="px-2.5 py-0.5 text-xs bg-amber-500 text-white rounded-full font-mono font-bold shadow-xs">
                {insufficientFundStocks.length}건 차단 중
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              실거래 주문 시 예수금/잔고 부족으로 거부된 종목입니다. <strong>AI 자율매매 파이프라인의 다음 매수 시도에서 자동으로 제외</strong>됩니다.
            </p>
          </div>
        </div>

        <button
          onClick={clearInsufficientFundStocks}
          className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-300 dark:border-rose-900/60 transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>차단 목록 전체 해제</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {insufficientFundStocks.map((item) => (
          <div 
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap">
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                  item.market === 'KOREA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300/40' :
                  item.market === 'US' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-300/40' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300/40'
                }`}>
                  {item.market}
                </span>
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">
                  {item.name} ({item.symbol})
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded">
                  🛡️ 구매 시도 자동 제외됨
                </span>
              </div>

              <div className="text-xs text-zinc-600 dark:text-zinc-300 flex flex-wrap gap-x-3 gap-y-1 font-mono">
                <span>신청 수량: <strong>{(item.qty ?? 0).toLocaleString()}주/개</strong></span>
                <span>주문 단가: <strong>{item.market === 'US' ? `${(item.price ?? 0).toLocaleString()}` : `${(item.price ?? 0).toLocaleString()}원`}</strong></span>
                <span>필요 금액: <strong className="text-rose-600 dark:text-rose-400">{item.market === 'US' ? `${(item.cost ?? 0).toLocaleString()}` : `${(item.cost ?? 0).toLocaleString()}원`}</strong></span>
              </div>

              <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40 px-2 py-0.5 rounded italic">
                거부 사유: {item.reason} ({new Date(item.timestamp).toLocaleTimeString()})
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => handleRetryTrade(item)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>잔고 충전후 재시도</span>
              </button>

              <button
                onClick={() => removeInsufficientFundStock(item.symbol)}
                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                title="차단 목록에서 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
