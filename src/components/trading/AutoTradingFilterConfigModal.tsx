import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  Filter,
  Coins,
  Cpu,
  Flame,
  Check,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Sparkles,
  Sliders,
  DollarSign,
  TrendingUp,
  Layers,
  Info
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface AutoTradingFilterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutoTradingFilterConfigModal: React.FC<AutoTradingFilterConfigModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    profile,
    positions,
    updateProfileSettings,
    executeTrade,
    purgeAllMockData,
    addToast
  } = useApp();

  // Local state initialized with profile or safe defaults
  const [cryptoFilterMode, setCryptoFilterMode] = useState<'TOP_MAJOR' | 'TOP_VOLUME' | 'AI_STRICT_90' | 'ALL_PERMITTED' | 'CRYPTO_DISABLED'>('TOP_MAJOR');
  const [maxHoldingsCount, setMaxHoldingsCount] = useState<number>(5);
  const [maxCryptoHoldingsCount, setMaxCryptoHoldingsCount] = useState<number>(2);
  const [minAiConfidenceScore, setMinAiConfidenceScore] = useState<number>(85);
  const [maxAllocPercentPerPosition, setMaxAllocPercentPerPosition] = useState<number>(15);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCleaningAltcoins, setIsCleaningAltcoins] = useState<boolean>(false);
  const [isResettingBalance, setIsResettingBalance] = useState<boolean>(false);

  useEffect(() => {
    if (profile) {
      setCryptoFilterMode(profile.cryptoFilterMode || 'TOP_MAJOR');
      setMaxHoldingsCount(profile.maxHoldingsCount || 5);
      setMaxCryptoHoldingsCount(profile.maxCryptoHoldingsCount || 2);
      setMinAiConfidenceScore(profile.minAiConfidenceScore || 85);
      setMaxAllocPercentPerPosition(profile.maxAllocPercentPerPosition || 15);
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const cryptoPositions = (positions || []).filter(
    p => p.market === 'BTC' || p.symbol.startsWith('KRW-') || ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'SUI'].includes(p.symbol)
  );

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateProfileSettings({
        cryptoFilterMode,
        maxHoldingsCount,
        maxCryptoHoldingsCount,
        minAiConfidenceScore,
        maxAllocPercentPerPosition
      });
      addToast({
        type: "SUCCESS",
        title: "🛡️ AI 자율매매 필터 저장 완료",
        message: `업비트 필터(${cryptoFilterMode}) 및 최대 보유 종목(${maxHoldingsCount}개), 코인(${maxCryptoHoldingsCount}개) 제한이 즉시 적용되었습니다.`
      });
      onClose();
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "설정 저장 실패",
        message: err.message || "설정 저장 중 오류가 발생했습니다."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // One-click cleanup: Sell non-major altcoins
  const handleCleanAltcoins = async () => {
    if (!cryptoPositions || cryptoPositions.length === 0) {
      addToast({
        type: "INFO",
        title: "보유 코인 없음",
        message: "현재 정리할 가상자산 보유 종목이 없습니다."
      });
      return;
    }

    const altcoins = cryptoPositions.filter(
      p => !['BTC', 'ETH', 'KRW-BTC', 'KRW-ETH'].includes(p.symbol)
    );

    if (altcoins.length === 0) {
      addToast({
        type: "INFO",
        title: "알트코인 없음",
        message: "현재 비트코인/이더리움 외 잡알트코인이 없습니다."
      });
      return;
    }

    setIsCleaningAltcoins(true);
    let soldCount = 0;
    try {
      for (const coin of altcoins) {
        const liveP = coin.currentPrice || coin.avgPrice || 1000;
        await executeTrade(
          coin.symbol,
          coin.name,
          'BTC',
          'SELL',
          coin.quantity,
          liveP,
          'AI 잡알트코인 일괄 클린업 청산',
          '사용자 요청에 따른 무차별 매수 코인 일괄 현금화 및 예수금 회수',
          true
        );
        soldCount++;
      }
      addToast({
        type: "SUCCESS",
        title: `🪙 ${soldCount}개 알트코인 전량 청산 완료`,
        message: `불필요한 알트코인을 전량 매도하여 예수금으로 회수했습니다.`
      });
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "알트코인 정리 오류",
        message: err.message || "일부 코인 매도 중 오류가 발생했습니다."
      });
    } finally {
      setIsCleaningAltcoins(false);
    }
  };

  // Reset Mock Balance & Clear Portfolio
  const handleResetMockAccount = async (targetBalance: number) => {
    setIsResettingBalance(true);
    try {
      await updateProfileSettings({
        balance: targetBalance,
        initialBalance: targetBalance
      });
      if (purgeAllMockData) {
        await purgeAllMockData();
      }
      addToast({
        type: "SUCCESS",
        title: `🔄 모의투자 ${(targetBalance / 10000).toLocaleString()}만원 초기화 완료`,
        message: `모든 가상 보유종목을 비우고 예수금을 ${(targetBalance ?? 0).toLocaleString()}원으로 초기화했습니다.`
      });
      onClose();
    } catch (err: any) {
      addToast({
        type: "ERROR",
        title: "모의투자 초기화 실패",
        message: err.message || "초기화 중 오류가 발생했습니다."
      });
    } finally {
      setIsResettingBalance(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 p-5 border-b border-indigo-800/40 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
              <Filter className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  🛡️ AI 자율매매 필터 &amp; 주식 리스크 제어 센터
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  원금보호 가드
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                국내주식 및 미국주식 전용 자율매매 필터, 최대 보유 종목 수 및 1종목당 비중을 정밀 제어합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200">
          {/* Issue Explanation Notice Banner */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>주식(국내/미국) 전용 AI 포트폴리오 관제 안내</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-400/90 leading-relaxed">
              본 시스템은 <strong>국내 주식(코스피/코스닥) 및 국외 주식(미국 나스닥/S&amp;P500)</strong>만을 매매 대상으로 합니다.
              아래 자율매매 필터 및 최대 보유 종목 수를 설정하여 비중을 정밀 제어하세요.
            </p>
          </div>

          {/* Section 2: Position Limits & Risk Controls Sliders */}
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>포트폴리오 보유 종목 수 &amp; 비중 한도 설정</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Max Total Holdings */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">최대 총 보유 종목 수 (전체)</span>
                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-300 rounded font-mono font-black">
                    {maxHoldingsCount}개 종목
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={maxHoldingsCount}
                  onChange={(e) => setMaxHoldingsCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[10px] text-slate-500">
                  전체 포트폴리오가 이 개수에 도달하면 신규 매수를 즉시 중단합니다. (기본 권장: 5개)
                </p>
              </div>

              {/* Max Crypto Holdings */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">업비트 코인 최대 보유 수량</span>
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 rounded font-mono font-black">
                    {maxCryptoHoldingsCount}개 코인
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={maxCryptoHoldingsCount}
                  onChange={(e) => setMaxCryptoHoldingsCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[10px] text-slate-500">
                  코인이 이 개수를 채우면 추가 코인 매수를 차단합니다. 0개 설정 시 코인 매수 금지. (기본: 2개)
                </p>
              </div>

              {/* Max Alloc Percent per Position */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">1종목당 최대 진입 비중</span>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 rounded font-mono font-black">
                    {maxAllocPercentPerPosition}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={maxAllocPercentPerPosition}
                  onChange={(e) => setMaxAllocPercentPerPosition(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <p className="text-[10px] text-slate-500">
                  한 종목에 예수금의 {maxAllocPercentPerPosition}% 이상 몰빵하지 않고 안전하게 분산 진입합니다.
                </p>
              </div>

              {/* Min AI Confidence Score */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">AI 16대 뇌엔진 최소 승인 점수</span>
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-300 rounded font-mono font-black">
                    {minAiConfidenceScore}점 이상
                  </span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="95"
                  step="1"
                  value={minAiConfidenceScore}
                  onChange={(e) => setMinAiConfidenceScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <p className="text-[10px] text-slate-500">
                  AI 종합 점수가 {minAiConfidenceScore}점 미만인 애매한 타점은 매수를 원천 거부합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: One-Click Quick Cleanup & Reset Tools */}
          <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl space-y-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-cyan-500" />
                <span>🧹 모의투자 자산 1초 클린업 &amp; 리셋 도구</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">
                기존에 무차별 매수된 코인을 즉시 정리할 수 있습니다.
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCleanAltcoins}
                disabled={isCleaningAltcoins}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isCleaningAltcoins ? "청산 진행 중..." : "⚡ 잡알트코인 일괄 매도 (현금화)"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetMockAccount(50000000)}
                disabled={isResettingBalance}
                className="py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isResettingBalance ? "초기화 중..." : "🔄 5,000만원 원터치 초기화 (추천)"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 hidden sm:block">
            <span>설정한 필터는 실시간 자율매매 엔진에 즉시 반영됩니다.</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex-1 sm:flex-initial py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "저장 중..." : "필터 설정 적용하기"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
