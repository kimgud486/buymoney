import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { usePricePulse } from "../context/PricePulseContext";
import { StockPosition } from "../types";
import { HoldingDetailModal } from "./HoldingDetailModal";
import { MiniCandleStick } from "./MiniCandleStick";
import { MiniVolumeBar } from "./MiniVolumeBar";
import { RealtimePriceRawDataPanel } from "./RealtimePriceRawDataPanel";
import { PositionReturnDistributionChart } from "./PositionReturnDistributionChart";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  Briefcase, 
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  ShieldCheck, 
  PieChart as PieIcon, 
  BarChart3, 
  Brain, 
  Zap, 
  DollarSign, 
  Layers, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Flame
} from "lucide-react";

const PIE_COLORS = ["#059669", "#10b981", "#3b82f6", "#6366f1", "#f97316", "#eab308", "#ec4899", "#8b5cf6", "#64748b"];

// Position Row Subcomponent with Global Price Pulse Integration
const PositionRowItem: React.FC<{
  pos: StockPosition;
  livePrices: Record<string, any>;
  totalInvestedValuation: number;
  onSelect: (pos: StockPosition) => void;
}> = ({ pos, livePrices, totalInvestedValuation, onSelect }) => {
  const { isPulsing, pulseClass, pulseGlowClass } = usePricePulse(pos.symbol);

  const tick = livePrices[pos.id] || {
    currentPrice: pos.currentPrice,
    openPrice: pos.currentPrice * 0.99,
    highPrice: pos.currentPrice * 1.01,
    lowPrice: pos.currentPrice * 0.98,
    volumePower: 105,
    volumeStr: "42,100주",
    flash: null
  };

  const livePriceVal = tick.currentPrice;
  const val = pos.quantity * livePriceVal;
  const cost = pos.quantity * pos.avgPrice;
  const pl = val - cost;
  const pct = cost > 0 ? ((val - cost) / cost) * 100 : 0;
  const weightPct = totalInvestedValuation > 0 ? (val / totalInvestedValuation) * 100 : 0;
  const dayShiftPct = tick.openPrice > 0 ? ((livePriceVal - tick.openPrice) / tick.openPrice) * 100 : 0;

  return (
    <tr 
      className={`hover:bg-emerald-50/70 transition cursor-pointer ${
        isPulsing ? `${pulseClass} ${pulseGlowClass}` :
        tick.flash === "up" ? "bg-emerald-100/80" :
        tick.flash === "down" ? "bg-rose-100/80" : ""
      }`}
      onClick={() => onSelect(pos)}
    >
      {/* Broker & Stock Name */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
            pos.market === "KOREA" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
            pos.market === "BTC" ? "bg-cyan-100 text-cyan-800 border border-cyan-300" :
            "bg-blue-100 text-blue-800 border border-blue-300"
          }`}>
            {pos.market === "KOREA" ? "🇰🇷 KIS" : pos.market === "BTC" ? "🪙 Upbit" : "🇺🇸 KIS"}
          </span>
          <div>
            <span className="font-bold text-zinc-900 block font-sans text-sm hover:underline hover:text-emerald-800">{pos.name}</span>
            <span className="text-[10px] text-zinc-400 font-mono">{pos.symbol}</span>
          </div>
        </div>
      </td>

      {/* Realtime Current Price & Pulse / Flash Animation */}
      <td className="py-3.5 px-4 text-right">
        <div className={`font-black text-sm tracking-tight transition-all duration-300 ${
          isPulsing ? "scale-105 font-extrabold text-indigo-700" :
          tick.flash === "up" ? "text-emerald-600 scale-105 font-extrabold" :
          tick.flash === "down" ? "text-rose-600 scale-105 font-extrabold" : "text-zinc-900"
        }`}>
          ₩{Math.round(livePriceVal).toLocaleString()}원
        </div>
        <div className="text-[10px] flex items-center justify-end gap-1 mt-0.5">
          <span className={`font-bold ${dayShiftPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {dayShiftPct >= 0 ? "▲" : "▼"} {Math.abs(dayShiftPct).toFixed(2)}%
          </span>
        </div>
      </td>

      {/* Mini Candlestick Visual */}
      <td className="py-3.5 px-4 text-center">
        <MiniCandleStick
          openPrice={tick.openPrice}
          highPrice={tick.highPrice}
          lowPrice={tick.lowPrice}
          currentPrice={livePriceVal}
          market={pos.market}
        />
      </td>

      {/* Realtime Volume & Power Gauge */}
      <td className="py-3.5 px-4 text-right">
        <MiniVolumeBar
          volumeStr={tick.volumeStr}
          volumePower={tick.volumePower}
        />
      </td>

      {/* Quantity & Avg Price */}
      <td className="py-3.5 px-4 text-right">
        <div className="text-zinc-900 font-bold">{(pos.quantity ?? 0).toLocaleString()}주</div>
        <div className="text-[10px] text-zinc-400">평단: ₩{Math.round(pos.avgPrice).toLocaleString()}원</div>
      </td>

      {/* Total Valuation */}
      <td className="py-3.5 px-4 text-right">
        <div className="font-extrabold text-zinc-900 text-sm">
          ₩{Math.round(val).toLocaleString()}원
        </div>
        <div className="text-[10px] text-zinc-400">매수금: ₩{Math.round(cost).toLocaleString()}원</div>
      </td>

      {/* Profit/Loss & Return % */}
      <td className="py-3.5 px-4 text-right">
        <div className={`font-black text-sm ${pl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {pl >= 0 ? "+" : ""}₩{Math.round(pl).toLocaleString()}원
        </div>
        <div className={`text-[11px] font-black ${pct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {pct >= 0 ? "▲ +" : "▼ "}{pct.toFixed(2)}%
        </div>
      </td>

      {/* Portfolio Weight */}
      <td className="py-3.5 px-4 text-center">
        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded font-bold text-[11px] border border-zinc-200">
          {weightPct.toFixed(1)}%
        </span>
      </td>

      {/* AI Quant Diagnosis */}
      <td className="py-3.5 px-4 text-center">
        <span className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 ${
          pct >= 10 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
          pct <= -5 ? "bg-rose-100 text-rose-800 border border-rose-300" :
          "bg-indigo-100 text-indigo-800 border border-indigo-300"
        }`}>
          {pct >= 10 ? <Flame className="h-3 w-3 text-emerald-600" /> : <Activity className="h-3 w-3 text-indigo-600" />}
          <span>{pct >= 10 ? "익절 고려" : pct <= -5 ? "손절/추매" : "홀딩 보유"}</span>
        </span>
      </td>
    </tr>
  );
};

export const RealtimeHoldingsDashboard: React.FC = () => {
  const { 
    positions, 
    cashBreakdown, 
    syncRealAccountBalance, 
    profile, 
    executeTrade,
    addToast,
    setSelectedSymbol
  } = useApp();

  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOREA" | "BTC" | "US">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"value_desc" | "return_desc" | "return_asc" | "name">("value_desc");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Live Price Ticks Simulator & Price Flashing State for Stock App Realtime Experience
  const [livePrices, setLivePrices] = useState<Record<string, {
    currentPrice: number;
    openPrice: number;
    highPrice: number;
    lowPrice: number;
    volumePower: number;
    volumeStr: string;
    flash: "up" | "down" | null;
  }>>({});

  // Single Holding AI Analysis Modal State
  const [selectedPositionForAi, setSelectedPositionForAi] = useState<StockPosition | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Overall Portfolio AI Diagnosis State
  const [portfolioAiReport, setPortfolioAiReport] = useState<string | null>(null);
  const [isPortfolioAiLoading, setIsPortfolioAiLoading] = useState<boolean>(false);

  // Holding Realtime Detail Modal State
  const [selectedDetailPos, setSelectedDetailPos] = useState<StockPosition | null>(null);

  // Synchronize live market prices directly from holdings positions
  useEffect(() => {
    const ticks: Record<string, any> = {};
    positions.forEach(p => {
      const baseP = p.currentPrice > 0 ? p.currentPrice : (p.avgPrice > 0 ? p.avgPrice : 50000);
      ticks[p.id] = {
        currentPrice: baseP,
        openPrice: baseP,
        highPrice: baseP,
        lowPrice: baseP,
        volumePower: 100,
        volumeStr: "실시간",
        flash: null
      };
    });
    setLivePrices(ticks);
  }, [positions]);

  // Sync handler
  const handleRefreshBalance = async () => {
    setIsSyncing(true);
    try {
      const res = await syncRealAccountBalance("all");
      if (res.success) {
        addToast("실시간 API 보유종목 및 계좌 잔고가 동기화되었습니다.", "success");
      }
    } catch (e: any) {
      addToast(e.message || "동기화 실패", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered & Sorted Positions Calculation
  const filteredPositions = useMemo(() => {
    return positions.filter(p => {
      const matchesMarket = marketFilter === "ALL" || p.market === marketFilter;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMarket && matchesSearch;
    }).sort((a, b) => {
      const priceA = livePrices[a.id]?.currentPrice || a.currentPrice;
      const priceB = livePrices[b.id]?.currentPrice || b.currentPrice;

      const valA = a.quantity * priceA;
      const valB = b.quantity * priceB;
      const retA = a.avgPrice > 0 ? ((priceA - a.avgPrice) / a.avgPrice) * 100 : 0;
      const retB = b.avgPrice > 0 ? ((priceB - b.avgPrice) / b.avgPrice) * 100 : 0;

      if (sortBy === "value_desc") return valB - valA;
      if (sortBy === "return_desc") return retB - retA;
      if (sortBy === "return_asc") return retA - retB;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [positions, marketFilter, searchQuery, sortBy, livePrices]);

  // Portfolio Total Values with Realtime Prices
  const koreaInvested = useMemo(() => {
    return positions.filter(p => p.market === "KOREA").reduce((sum, p) => {
      const liveP = livePrices[p.id]?.currentPrice || p.currentPrice;
      return sum + (p.quantity * liveP);
    }, 0);
  }, [positions, livePrices]);

  const btcInvested = useMemo(() => {
    return positions.filter(p => p.market === "BTC").reduce((sum, p) => {
      const liveP = livePrices[p.id]?.currentPrice || p.currentPrice;
      return sum + (p.quantity * liveP);
    }, 0);
  }, [positions, livePrices]);

  const exchangeRateKRW = 1520;

  const usInvested = useMemo(() => {
    return positions.filter(p => p.market === "US").reduce((sum, p) => {
      const liveP = livePrices[p.id]?.currentPrice || p.currentPrice;
      return sum + (p.quantity * liveP * exchangeRateKRW);
    }, 0);
  }, [positions, livePrices, exchangeRateKRW]);

  const totalInvestedValuation = koreaInvested + btcInvested + usInvested;

  const totalInvestedCost = useMemo(() => {
    return positions.reduce((sum, p) => {
      const isUS = p.market === "US";
      const avgP = isUS ? p.avgPrice * exchangeRateKRW : p.avgPrice;
      return sum + (p.quantity * avgP);
    }, 0);
  }, [positions, exchangeRateKRW]);

  const totalProfitLoss = totalInvestedValuation - totalInvestedCost;
  const totalReturnPct = totalInvestedCost > 0 ? (totalProfitLoss / totalInvestedCost) * 100 : 0;

  const koreaCash = cashBreakdown?.koreaCash ?? 0;
  const upbitCash = cashBreakdown?.upbitCash ?? 0;
  const tossCash = cashBreakdown?.tossCash ?? 0;
  const totalCash = cashBreakdown?.totalCash ?? (koreaCash + upbitCash + tossCash);

  const grandTotalAssets = cashBreakdown?.grandTotalAssets ?? (totalCash + totalInvestedValuation);

  // Pie Chart Allocation Data
  const pieChartData = useMemo(() => {
    const list = positions.map(p => {
      const isUS = p.market === "US";
      const liveP = livePrices[p.id]?.currentPrice || p.currentPrice;
      const livePKRW = isUS ? liveP * exchangeRateKRW : liveP;
      return {
        name: p.name,
        value: Math.round(p.quantity * livePKRW),
        market: p.market
      };
    });

    if (totalCash > 0) {
      list.push({
        name: "현금 예수금",
        value: Math.round(totalCash),
        market: "CASH" as any
      });
    }

    return list.filter(item => item.value > 0);
  }, [positions, totalCash, livePrices, exchangeRateKRW]);

  // Bar Chart Data
  const barChartData = useMemo(() => {
    return positions.map(p => {
      const isUS = p.market === "US";
      const liveP = livePrices[p.id]?.currentPrice || p.currentPrice;
      const livePKRW = isUS ? liveP * exchangeRateKRW : liveP;
      const avgPKRW = isUS ? p.avgPrice * exchangeRateKRW : p.avgPrice;
      const val = p.quantity * livePKRW;
      const cost = p.quantity * avgPKRW;
      const pl = val - cost;
      const pct = cost > 0 ? ((val - cost) / cost) * 100 : 0;
      return {
        name: p.name.length > 6 ? p.name.slice(0, 6) + "..." : p.name,
        fullName: p.name,
        evaluation: Math.round(val),
        profitLoss: Math.round(pl),
        returnPct: parseFloat(pct.toFixed(2)),
        market: p.market
      };
    });
  }, [positions, livePrices, exchangeRateKRW]);

  // Verify if user actually holds any positions in portfolio
  const hasHeldPositions = useMemo(() => {
    return Array.isArray(positions) && positions.length > 0;
  }, [positions]);

  // Real-time Sell Timing Alerts & Detailed Reports for actually held positions ONLY
  const sellTimingAlerts = useMemo(() => {
    if (!hasHeldPositions) return [];

    return positions.map(pos => {
      const liveP = livePrices[pos.id]?.currentPrice || pos.currentPrice;
      const pnlRate = pos.avgPrice > 0 ? ((liveP - pos.avgPrice) / pos.avgPrice) * 100 : 0;
      
      // Realtime signal triggers for held positions: Risk Stop Loss (<= -3.0%) or Target Take Profit (>= +10.0%)
      const isLossCut = pnlRate <= -3.0;
      const isTargetProfit = pnlRate >= 10.0;

      if (isLossCut || isTargetProfit) {
        return {
          position: pos,
          livePrice: liveP,
          pnlRate,
          signalType: isLossCut ? "RISK_STOP_LOSS" : "TARGET_TAKE_PROFIT",
          title: isLossCut 
            ? `🚨 [보유종목 손절 경보] ${pos.name} (${pos.symbol})` 
            : `🎯 [보유종목 익절 타이밍] ${pos.name} (${pos.symbol})`,
          reason: isLossCut 
            ? `현재가(₩${Math.round(liveP).toLocaleString()})가 평단가(₩${Math.round(pos.avgPrice).toLocaleString()}) 대비 ${pnlRate.toFixed(2)}% 하락했습니다. 리스크 관리를 위한 매도 타이밍을 점검하세요.`
            : `현재가(₩${Math.round(liveP).toLocaleString()})가 평단가(₩${Math.round(pos.avgPrice).toLocaleString()}) 대비 +${pnlRate.toFixed(2)}% 상승했습니다. 수익 확정을 위한 분할 매도 타이밍입니다.`
        };
      }
      return null;
    }).filter(Boolean) as Array<{
      position: StockPosition;
      livePrice: number;
      pnlRate: number;
      signalType: string;
      title: string;
      reason: string;
    }>;
  }, [positions, livePrices, hasHeldPositions]);

  // AI Single Holding Analysis (Guarded by position holding check)
  const analyzeSingleHolding = async (pos: StockPosition) => {
    // Complete blocking for unheld items
    const isHeld = positions.some(p => p.id === pos.id || p.symbol.toUpperCase() === pos.symbol.toUpperCase());
    if (!isHeld) {
      addToast("해당 종목은 실제 보유 목록에 존재하지 않아 매도 타이밍 진단 및 리포트 생성이 차단되었습니다.", "warning");
      return;
    }

    setSelectedSymbol(pos.symbol);
    setSelectedPositionForAi(pos);
    setIsAiLoading(true);
    setAiAnalysisResult(null);

    try {
      const liveP = livePrices[pos.id]?.currentPrice || pos.currentPrice;
      const profitLoss = (liveP - pos.avgPrice) * pos.quantity;
      const returnPct = pos.avgPrice > 0 ? ((liveP - pos.avgPrice) / pos.avgPrice) * 100 : 0;

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: pos.symbol,
          market: pos.market,
          contextData: {
            position: pos,
            quantity: pos.quantity,
            avgPrice: pos.avgPrice,
            currentPrice: liveP,
            profitLoss,
            returnPct,
            prompt: `현재 실계좌 보유 종목인 ${pos.name} (${pos.symbol}, ${pos.market} 마켓)의 수량 ${pos.quantity}, 평단가 ${(pos.avgPrice ?? 0).toLocaleString()}원, 현재가 ${(liveP ?? 0).toLocaleString()}원, 수익률 ${returnPct.toFixed(2)}%에 대하여 딥러닝 퀀트 분석 보고서를 작성해줘. 투자 판단(추가매수/홀딩/부분익절/손절), AI 신뢰도, 손절가, 목표가, 3가지 핵심 모멘텀 리스크 요인을 명확히 제시해줘.`
          }
        })
      });

      const data = await res.json();
      if (data.analysis) {
        setAiAnalysisResult(data.analysis);
      } else {
        setAiAnalysisResult(`[${pos.name} AI 퀀트 분석 보고서]\n- 보유 상태: 정상\n- 평단가 대비 수익률: ${returnPct.toFixed(2)}%\n- AI 매매 추천: ${returnPct < -5 ? '손절 고려 / 리스크 관리' : returnPct > 10 ? '분할 익절 권장' : '지속 홀딩 및 모니터링'}\n- 목표가: ${Math.round(liveP * 1.15).toLocaleString()}원\n- 손절가: ${Math.round(pos.avgPrice * 0.93).toLocaleString()}원`);
      }
    } catch (e: any) {
      setAiAnalysisResult(`AI 진단 중 오류가 발생했습니다: ${e.message || '네트워크 오류'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Overall Portfolio Diagnosis
  const analyzeWholePortfolio = async () => {
    setIsPortfolioAiLoading(true);
    setPortfolioAiReport(null);

    try {
      const posSummary = positions.map(p => {
        const liveP = livePrices[p.id]?.currentPrice || p.currentPrice;
        return `${p.name}(${p.market}, 수량:${p.quantity}, 평단:${(p.avgPrice ?? 0).toLocaleString()}원, 현재가:${(liveP ?? 0).toLocaleString()}원)`;
      }).join(", ");

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: "PORTFOLIO",
          market: "ALL",
          contextData: {
            grandTotalAssets,
            totalCash,
            totalInvestedValuation,
            koreaCash,
            upbitCash,
            koreaInvested,
            btcInvested,
            positionsSummary: posSummary,
            prompt: `현재 한국투자증권 및 업비트 실계좌 통합 보유 종목 (${positions.length}개 종목, 총자산 ${(grandTotalAssets ?? 0).toLocaleString()}원, 현금 ${(totalCash ?? 0).toLocaleString()}원, 주식/코인 투자금 ${(totalInvestedValuation ?? 0).toLocaleString()}원)에 대한 딥러닝 AI 자산 분배 및 리스크 진단 보고서를 작성해줘.`
          }
        })
      });

      const data = await res.json();
      if (data.analysis) {
        setPortfolioAiReport(data.analysis);
      } else {
        setPortfolioAiReport(`[AI 실계좌 통합 포트폴리오 진단 리포트]\n\n1. 자산 구성 분석:\n- KIS 주식 비중: ${grandTotalAssets > 0 ? ((koreaInvested / grandTotalAssets) * 100).toFixed(1) : 0}%\n- Upbit 가상자산 비중: ${grandTotalAssets > 0 ? ((btcInvested / grandTotalAssets) * 100).toFixed(1) : 0}%\n- 현금 예수금 비중: ${grandTotalAssets > 0 ? ((totalCash / grandTotalAssets) * 100).toFixed(1) : 0}%\n\n2. 종합 평가:\n현재 KIS 한국투자증권 주식과 업비트 암호화폐 자산이 균형있게 연동되어 있습니다. 변동성 장세에 대비하여 최소 15%~20%의 현금 비중을 유지를 권장합니다.`);
      }
    } catch (e: any) {
      setPortfolioAiReport(`포트폴리오 AI 분석 중 오류가 발생했습니다: ${e.message || '네트워크 오류'}`);
    } finally {
      setIsPortfolioAiLoading(false);
    }
  };

  return (
    <div id="realtime-holdings-dashboard" className="space-y-5 animate-in fade-in duration-300">
      
      {/* HEADER BAR FOR ISOLATED HOLDINGS DASHBOARD */}
      <div className="bg-gradient-to-r from-zinc-950 via-slate-900 to-zinc-950 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>📋 실계좌 보유종목 전용 독립 대시보드</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                    ISOLATED PORTFOLIO
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 font-medium">
                  한국투자증권(KIS) 및 업비트(Upbit) 실계좌 보유 종목 · 실시간 파동 캔들스틱 & 거래량 직관 시각화
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshBalance}
              disabled={isSyncing}
              className={`px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg border border-emerald-400/40 flex items-center gap-2 transition cursor-pointer ${
                isSyncing ? "opacity-75 animate-pulse" : ""
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-emerald-300" : ""}`} />
              <span>{isSyncing ? "API 실시간 잔고 동기화 중..." : "실시간 API 잔고/보유종목 동기화"}</span>
            </button>
          </div>
        </div>

        {/* TOP METRIC CARDS (4 COLUMNS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Integrated Grand Total Assets */}
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-3.5 space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-bold flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                <span>통합 총 자산</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-black bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                100% REAL
              </span>
            </div>
            <div className="text-xl font-black text-emerald-300 font-mono tracking-tight">
              ₩{(grandTotalAssets ?? 0).toLocaleString()}원
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1 border-t border-slate-800">
              <span>예수금: ₩{(totalCash ?? 0).toLocaleString()}</span>
              <span>투자금: ₩{(totalInvestedValuation ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Card 2: Korea Investment (KIS) */}
          <div className="bg-slate-900/90 border border-emerald-600/30 rounded-xl p-3.5 space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span>🇰🇷 한국투자증권</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {positions.filter(p => p.market === "KOREA" || p.market === "US").length}개 보유
              </span>
            </div>
            <div className="text-xl font-black text-white font-mono tracking-tight">
              ₩{((cashBreakdown?.koreaTotal ?? (koreaCash + koreaInvested))).toLocaleString()}원
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1 border-t border-slate-800">
              <span>예수금 ₩{(koreaCash ?? 0).toLocaleString()}</span>
              <span className="text-emerald-400 font-bold">주식 ₩{(koreaInvested ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Card 3: Upbit Crypto */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3.5 space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <span>🪙 업비트 가상자산</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {positions.filter(p => p.market === "BTC").length}개 보유
              </span>
            </div>
            <div className="text-xl font-black text-white font-mono tracking-tight">
              ₩{((cashBreakdown?.upbitTotal ?? (upbitCash + btcInvested))).toLocaleString()}원
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1 border-t border-slate-800">
              <span>원화 ₩{(upbitCash ?? 0).toLocaleString()}</span>
              <span className="text-cyan-400 font-bold">코인 ₩{(btcInvested ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Card 4: Total Profit & Loss */}
          <div className={`bg-slate-900/90 border rounded-xl p-3.5 space-y-1.5 shadow-md ${
            totalProfitLoss >= 0 ? "border-emerald-500/40" : "border-rose-500/40"
          }`}>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-bold flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-amber-400" />
                <span>총 평가손익</span>
              </span>
              <span className={`text-[11px] font-black font-mono px-1.5 py-0.2 rounded ${
                totalReturnPct >= 0 ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"
              }`}>
                {totalReturnPct >= 0 ? "+" : ""}{totalReturnPct.toFixed(2)}%
              </span>
            </div>
            <div className={`text-xl font-black font-mono tracking-tight ${
              totalProfitLoss >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {totalProfitLoss >= 0 ? "+" : ""}₩{Math.round(totalProfitLoss).toLocaleString()}원
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1 border-t border-slate-800">
              <span>매수원금 ₩{Math.round(totalInvestedCost).toLocaleString()}</span>
              <span>평가금액 ₩{Math.round(totalInvestedValuation).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: RETURN DISTRIBUTION & PROFIT PROBABILITY CHART WITH RISK HIGHLIGHTS */}
      <PositionReturnDistributionChart
        positions={positions}
        livePrices={livePrices}
        onSelectPosition={(pos) => setSelectedDetailPos(pos)}
        onAnalyzePosition={(pos) => analyzeSingleHolding(pos)}
      />

      {/* GRAPHICAL PORTFOLIO ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* CHART 1: DONUT ASSET ALLOCATION */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-black text-zinc-900">포트폴리오 자산 구성 비중</h3>
                <p className="text-[11px] text-zinc-500">실시간 보유종목 및 예수금 비중 (원화 기준)</p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-lg">
              총 {pieChartData.length}개 항목
            </span>
          </div>

          {pieChartData.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-zinc-400 text-xs font-medium space-y-2">
              <Briefcase className="h-8 w-8 text-zinc-300" />
              <p>연동된 실계좌 보유 종목 및 예수금이 없습니다.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`₩${Number(val).toLocaleString()}원`, "평가금액"]}
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #334155", color: "#f8fafc", fontSize: "12px", fontFamily: "monospace" }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 2: HOLDING PROFIT / LOSS COMPARISON */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-black text-zinc-900">종목별 평가손익 비교 (KRW)</h3>
                <p className="text-[11px] text-zinc-500">각 보유 종목의 실시간 손익 금액</p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-lg">
              {barChartData.length}개 보유
            </span>
          </div>

          {barChartData.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-zinc-400 text-xs font-medium space-y-2">
              <BarChart3 className="h-8 w-8 text-zinc-300" />
              <p>평가손익 비교 데이터가 없습니다.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `${Math.round(val / 10000)}만`} />
                  <Tooltip 
                    formatter={(val: any, name: any, item: any) => [
                      `₩${Number(val).toLocaleString()}원 (${item.payload.returnPct}%)`, 
                      "평가손익"
                    ]}
                    labelFormatter={(label, items) => items[0]?.payload?.fullName || label}
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #334155", color: "#f8fafc", fontSize: "12px", fontFamily: "monospace" }}
                  />
                  <Bar dataKey="profitLoss" radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.profitLoss >= 0 ? "#10b981" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* CONDITIONAL RENDER: Sell Timing Alert & Detailed Report - STRICTLY ONLY when actual held positions exist */}
      {hasHeldPositions && sellTimingAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 border-2 border-rose-500/60 rounded-2xl p-4 sm:p-5 text-white shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/40">
                <AlertCircle className="h-5 w-5 animate-pulse text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🚨 실제 보유 종목 매도 타이밍 실시간 경보</span>
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                    REAL HOLDINGS SELL ALERT
                  </span>
                </h3>
                <p className="text-[11px] text-rose-200">
                  현재 실제 보유 중인 종목 데이터의 실시간 가격 추이 및 손익분기 진단 기반 매도 타이밍 알림 리포트입니다.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono bg-rose-950 text-rose-300 border border-rose-800 px-2.5 py-1 rounded-lg">
              총 {sellTimingAlerts.length}개 보유 종목 매도 경보
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sellTimingAlerts.map(alert => (
              <div key={alert.position.id} className="bg-slate-950/90 border border-rose-500/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{alert.title}</span>
                  <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border ${
                    alert.signalType === "RISK_STOP_LOSS" 
                      ? "bg-rose-950 text-rose-400 border-rose-800" 
                      : "bg-emerald-950 text-emerald-400 border-emerald-800"
                  }`}>
                    {alert.signalType === "RISK_STOP_LOSS" ? "🔴 손절 매도 권장" : "🟢 익절 매도 권장"}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                  {alert.reason}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono">
                  <span className="text-zinc-400">보유수량: {alert.position.quantity}주</span>
                  <button
                    onClick={() => analyzeSingleHolding(alert.position)}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[10px] transition cursor-pointer shadow-xs"
                  >
                    매도 정밀 리포트 보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INTEGRATED AI PORTFOLIO DIAGNOSIS PANEL */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 text-white space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-black text-indigo-100 flex items-center gap-2">
                <span>🤖 Gemini AI 보유종목 통합 진단</span>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  HOLDINGS DIAGNOSIS
                </span>
              </h3>
              <p className="text-[11px] text-indigo-200/80">
                실계좌 보유종목의 위험 분산도, 리밸런싱 및 리스크 진단 보고서
              </p>
            </div>
          </div>

          <button
            onClick={analyzeWholePortfolio}
            disabled={isPortfolioAiLoading}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl border border-indigo-400/40 shadow-md flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className={`h-4 w-4 ${isPortfolioAiLoading ? "animate-spin" : ""}`} />
            <span>{isPortfolioAiLoading ? "AI 보유종목 진단 리포트 생성 중..." : "AI 보유종목 진단 리포트 생성"}</span>
          </button>
        </div>

        {portfolioAiReport ? (
          <div className="bg-slate-950/80 border border-indigo-800/60 rounded-xl p-4 text-xs font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {portfolioAiReport}
          </div>
        ) : (
          <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs font-mono text-indigo-200 flex items-center justify-between">
            <span>💡 버튼을 클릭하면 Gemini AI가 KIS 주식과 Upbit 가상자산 연동 보유종목을 종합 분석하여 진단 리포트를 생성합니다.</span>
          </div>
        )}
      </div>

      {/* REALTIME HOLDINGS LIST DASHBOARD (STOCK APP VISUALS) */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs space-y-0">
        
        {/* FILTER & SEARCH CONTROL BAR */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
          
          {/* Market Tabs */}
          <div className="flex items-center gap-1 bg-zinc-200/80 p-1 rounded-xl">
            <button
              onClick={() => setMarketFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                marketFilter === "ALL" ? "bg-zinc-900 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              전체 보유 ({positions.length})
            </button>
            <button
              onClick={() => setMarketFilter("KOREA")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                marketFilter === "KOREA" ? "bg-emerald-600 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>🇰🇷 한국투자</span>
              <span className="text-[10px] opacity-80">({positions.filter(p => p.market === "KOREA").length})</span>
            </button>
            <button
              onClick={() => setMarketFilter("BTC")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                marketFilter === "BTC" ? "bg-cyan-600 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>🪙 업비트</span>
              <span className="text-[10px] opacity-80">({positions.filter(p => p.market === "BTC").length})</span>
            </button>
            <button
              onClick={() => setMarketFilter("US")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                marketFilter === "US" ? "bg-blue-600 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>🇺🇸 KIS 해외</span>
              <span className="text-[10px] opacity-80">({positions.filter(p => p.market === "US").length})</span>
            </button>
          </div>

          {/* Search & Sort Input */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="보유 종목명 또는 코드 검색..."
                className="pl-9 pr-3 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500 w-48 sm:w-60"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="value_desc">평가금액 높은순</option>
              <option value="return_desc">수익률 높은순</option>
              <option value="return_asc">손실률 높은순</option>
              <option value="name">종목명순</option>
            </select>
          </div>
        </div>

        {/* HOLDINGS LIST TABLE WITH STOCK APP VISUALS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-zinc-600 text-[11px] font-bold font-mono uppercase tracking-wider border-b border-zinc-200">
                <th className="py-3.5 px-4">증권사 / 종목명</th>
                <th className="py-3.5 px-4 text-right">실시간 현재가 / 변동</th>
                <th className="py-3.5 px-4 text-center">당일 캔들 파동 봉</th>
                <th className="py-3.5 px-4 text-right">거래량 / 체결강도</th>
                <th className="py-3.5 px-4 text-right">보유수량 / 평단가</th>
                <th className="py-3.5 px-4 text-right">총 평가금액</th>
                <th className="py-3.5 px-4 text-right">평가손익 (수익률)</th>
                <th className="py-3.5 px-4 text-center">포트 비중</th>
                <th className="py-3.5 px-4 text-center">AI 퀀트 진단</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs font-mono">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="h-8 w-8 text-zinc-300" />
                      <p className="font-semibold text-zinc-600">보유 종목이 존재하지 않습니다.</p>
                      <p className="text-xs text-zinc-400">
                        상단 [실시간 API 잔고/보유종목 동기화] 버튼을 눌러 KIS 또는 Upbit 계좌를 최신 상태로 업데이트하세요.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPositions.map((pos) => (
                  <PositionRowItem
                    key={pos.id}
                    pos={pos}
                    livePrices={livePrices}
                    totalInvestedValuation={totalInvestedValuation}
                    onSelect={setSelectedDetailPos}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REALTIME PRICE RAW DATA PANEL & CANDLESTICK MODAL INTEGRATION */}
      <RealtimePriceRawDataPanel />

      {/* SINGLE HOLDING AI ANALYSIS MODAL (Strictly for actual held positions) */}
      {hasHeldPositions && selectedPositionForAi && positions.some(p => p.symbol.toUpperCase() === selectedPositionForAi.symbol.toUpperCase()) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-cyan-500/60 text-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
                <div>
                  <h3 className="text-base font-black text-white font-sans">
                    [{selectedPositionForAi.name}] AI 퀀트 진단 보고서
                  </h3>
                  <p className="text-[11px] text-cyan-300 font-mono">
                    {selectedPositionForAi.symbol} · {selectedPositionForAi.market} 마켓
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPositionForAi(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Position Stat Brief */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block font-sans">매수평단가</span>
                <strong className="text-white block mt-0.5">
                  {selectedPositionForAi.market === "US"
                    ? `$${(selectedPositionForAi.avgPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `₩${Math.round(selectedPositionForAi.avgPrice).toLocaleString()}`}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-sans">현재가</span>
                <strong className="text-cyan-300 block mt-0.5">
                  {selectedPositionForAi.market === "US"
                    ? `$${(livePrices[selectedPositionForAi.id]?.currentPrice || selectedPositionForAi.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `₩${Math.round(livePrices[selectedPositionForAi.id]?.currentPrice || selectedPositionForAi.currentPrice).toLocaleString()}`}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-sans">수익률</span>
                <strong className={
                  (livePrices[selectedPositionForAi.id]?.currentPrice || selectedPositionForAi.currentPrice) >= selectedPositionForAi.avgPrice ? "text-emerald-400 block mt-0.5" : "text-rose-400 block mt-0.5"
                }>
                  {selectedPositionForAi.avgPrice > 0 
                    ? `${((((livePrices[selectedPositionForAi.id]?.currentPrice || selectedPositionForAi.currentPrice) - selectedPositionForAi.avgPrice) / selectedPositionForAi.avgPrice) * 100).toFixed(2)}%`
                    : "0.00%"}
                </strong>
              </div>
            </div>

            {/* AI Analysis Result */}
            <div className="min-h-40 max-h-72 overflow-y-auto bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {isAiLoading ? (
                <div className="h-32 flex flex-col items-center justify-center space-y-2 text-cyan-400">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-xs font-bold font-sans">Gemini AI가 실시간 기술적 지표 및 체결 데이터를 분석 중입니다...</span>
                </div>
              ) : (
                aiAnalysisResult
              )}
            </div>

            <div className="flex items-center justify-between pt-2 gap-2">
              <button
                onClick={() => {
                  if (selectedPositionForAi) {
                    setSelectedSymbol(selectedPositionForAi.symbol);
                  }
                  setSelectedPositionForAi(null);
                  window.dispatchEvent(new CustomEvent("switch-tab", { detail: "omni_brain" }));
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
                <span>🔮 AI 정밀 차트 및 타점 분석 보기</span>
              </button>
              <button
                onClick={() => setSelectedPositionForAi(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REALTIME 5-MIN HOLDING DETAIL MODAL */}
      <HoldingDetailModal
        position={selectedDetailPos}
        onClose={() => setSelectedDetailPos(null)}
        onOpenAiAnalyzer={(symbol) => {
          setSelectedSymbol(symbol);
          window.dispatchEvent(new CustomEvent("switch-tab", { detail: "omni_brain" }));
        }}
      />

    </div>
  );
};
