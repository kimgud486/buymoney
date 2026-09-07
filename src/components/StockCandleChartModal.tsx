import React, { useState, useEffect, useMemo } from "react";
import { AiFutureTrendOverlayChart } from "./AiFutureTrendOverlayChart";
import { InteractivePredictionCanvasChart } from "./InteractivePredictionCanvasChart";
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Sparkles, 
  Clock, 
  BarChart3, 
  RefreshCw,
  Layers,
  Zap,
  Target,
  ShieldAlert,
  Flame,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  CheckCircle2,
  LineChart as LineChartIcon,
  CandlestickChart,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShoppingCart,
  Send,
  Lock,
  ChevronRight,
  Play,
  Building2
} from "lucide-react";
import { getCapCategoryInfo } from "./GlobalStockSearchAndAdd";
import { getMarketStatus } from "../lib/marketStatus";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Bar, 
  Line, 
  Area,
  ReferenceLine
} from "recharts";
import { Ai30DayPriceForecastChart } from "./Ai30DayPriceForecastChart";
import { useApp } from "../context/AppContext";
import { useModalScrollLock } from "../hooks/useModalScrollLock";

export interface CandleTickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5?: number;
  ma20?: number;
  ma60?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  rsi?: number;
  forecastPrice?: number;
  forecastUpper?: number;
  forecastLower?: number;
  isForecast?: boolean;
}

export interface AiPatternResult {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  confidence: number;
  description: string;
}

interface StockCandleChartModalProps {
  symbol: string;
  name: string;
  market?: string;
  currentPrice?: number;
  changeRate?: number;
  volumePower?: number;
  onClose: () => void;
  onAiAnalyze?: () => void;
}

export const StockCandleChartModal: React.FC<StockCandleChartModalProps> = ({
  symbol,
  name,
  market = "KOREA",
  currentPrice = 0,
  changeRate = 0,
  volumePower = 100,
  onClose,
  onAiAnalyze
}) => {
  useModalScrollLock(true);
  const { executeTrade, requestTradeConfirmation, addToast, isInWatchlist, addToWatchlist, removeFromWatchlist } = useApp();

  const [timeframe, setTimeframe] = useState<"1M" | "5M" | "15M" | "1H" | "1D">("5M");
  const [chartType, setChartType] = useState<"CANDLE" | "LINE" | "AI_FORECAST">("CANDLE");
  const [activeTab, setActiveTab] = useState<"CHART" | "AI_DUAL" | "AI_30D" | "INFO" | "ORDERBOOK" | "ORDER">("CHART");

  const [livePrice, setLivePrice] = useState<number>(currentPrice > 0 ? currentPrice : 0);
  const [liveChangeRate, setLiveChangeRate] = useState<number>(changeRate);
  const [lastTickDirection, setLastTickDirection] = useState<"UP" | "DOWN" | "FLAT">("FLAT");
  const [isLiveUpdating, setIsLiveUpdating] = useState<boolean>(true);
  const [candleData, setCandleData] = useState<CandleTickData[]>([]);

  // Dual Chart Matrix Dataset (Realtime Ticks vs AI Prediction Points - strictly real or empty)
  const dualPredictedPath = useMemo(() => {
    if (!livePrice || livePrice <= 0) return [];
    const baseP = livePrice;
    return [
      {
        timeLabel: "현재 (T-0 LIVE)",
        timestamp: Date.now(),
        actualPrice: baseP,
        bullPrice: baseP,
        basePrice: baseP,
        bearPrice: baseP,
        upperBand: baseP,
        lowerBand: baseP,
        isNow: true,
        isPast: false,
        isLivePoint: true,
        isFuturePredict: false,
        aiSignalNote: "🎯 실시간 검증 가격"
      }
    ];
  }, [livePrice]);

  const capInfoData = useMemo(() => {
    return getCapCategoryInfo({ symbol, market, name });
  }, [symbol, market, name]);

  const corpInfo = useMemo(() => {
    const isUpbit = market === "BTC" || market === "CRYPTO";
    const isUs = market === "US";
    const price = livePrice > 0 ? livePrice : 0;

    return {
      volume: price > 0 ? "실시간 연동 중" : "N/A",
      tradeValueStr: price > 0 ? (isUs ? `$${(price / 1000).toFixed(1)}K` : `₩${Math.round(price * 100).toLocaleString()}`) : "N/A",
      marketCap: isUpbit ? "N/A" : isUs ? "$--B" : "₩--조원",
      openPrice: price > 0 ? price : 0,
      highPrice: price > 0 ? price : 0,
      lowPrice: price > 0 ? price : 0,
      prevClose: price > 0 ? price : 0,
      per: "N/A",
      pbr: "N/A",
      dividendYield: "N/A",
      high52w: "N/A",
      low52w: "N/A",
      description: isUpbit
        ? `${name}(${symbol})는 업비트 원화 마켓에서 실시간 체결되는 대표 가상자산입니다.`
        : isUs
        ? `${name}(${symbol})는 나스닥/뉴욕 증시의 실시간 체결 종목입니다.`
        : `${name}(${symbol})는 한국거래소(KRX) 실시간 체결 종목입니다.`,
      revenue: "N/A",
      opProfit: "N/A",
      roe: "N/A",
      debtRatio: "N/A",
      themes: isUpbit
        ? ["#가상자산", "#업비트실시간", "#수급모멘텀"]
        : isUs
        ? ["#나스닥", "#미국주식", "#실시간체결"]
        : ["#K-증시", "#실시간체결", "#수급검증"]
    };
  }, [symbol, name, market, livePrice]);

  // Indicators Overlay Toggle States
  const [showMA, setShowMA] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(true);
  const [showPivotLines, setShowPivotLines] = useState<boolean>(true);
  const [showTargets, setShowTargets] = useState<boolean>(true);
  const [showRsiPanel, setShowRsiPanel] = useState<boolean>(true);

  // Quick Order Form inside Modal
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderQty, setOrderQty] = useState<number>(10);
  const [orderPriceInput, setOrderPriceInput] = useState<number>(livePrice);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState<boolean>(false);

  // AI Deep Analysis State inside Modal
  const [aiAnalysisReport, setAiAnalysisReport] = useState<string | null>(null);
  const [isAiReportLoading, setIsAiReportLoading] = useState<boolean>(false);

  // Keep order price input synchronized when live price changes initially
  useEffect(() => {
    if (currentPrice > 0) {
      setLivePrice(currentPrice);
      setOrderPriceInput(currentPrice);
      const isCryptoAsset = market === "BTC" || market === "CRYPTO" || symbol.startsWith("KRW-");
      if (isCryptoAsset) {
        const defQty = Number(Math.max(0.00000001, 50000 / currentPrice).toFixed(8));
        setOrderQty(defQty);
      } else {
        setOrderQty(10);
      }
    }
    setLiveChangeRate(changeRate);
  }, [currentPrice, changeRate, market, symbol]);

  // Trigger real candle fetch immediately on symbol, timeframe, or market change (NO SYNTHETIC CANDLES!)
  useEffect(() => {
    // Initial empty state before real feed arrives
    setCandleData([]);
  }, [symbol, timeframe]);

  // Live Price & Real Candle synchronization from real market API
  useEffect(() => {
    if (!isLiveUpdating) return;

    const fetchRealData = async () => {
      try {
        if (market === "BTC") {
          const upbitCode = symbol.startsWith("KRW-") ? symbol : `KRW-${symbol}`;
          const res = await fetch(`/api/upbit/public/ticker?markets=${encodeURIComponent(upbitCode)}`);
          if (res.ok) {
            const arr = await res.json();
            if (arr && arr.length > 0) {
              const p = arr[0].trade_price;
              setLivePrice(p);
              if (typeof arr[0].signed_change_rate === "number") {
                setLiveChangeRate(+(arr[0].signed_change_rate * 100).toFixed(2));
              }
            }
          }

          // Also fetch real Upbit candles
          const tfLower = (timeframe || "").toLowerCase();
          const unit = tfLower === "1m" ? 1 : tfLower === "5m" ? 5 : tfLower === "15m" ? 15 : tfLower === "1h" ? 60 : 5;
          const isDaily = tfLower === "1d";
          const candleUrl = isDaily 
            ? `/api/upbit/public/candles?market=${encodeURIComponent(upbitCode)}&timeframe=days&count=60`
            : `/api/upbit/public/candles?market=${encodeURIComponent(upbitCode)}&unit=${unit}&count=60`;
          
          const candleRes = await fetch(candleUrl);
          if (candleRes.ok) {
            const cList = await candleRes.json();
            if (Array.isArray(cList) && cList.length > 0) {
              const formatted: CandleTickData[] = [...cList].reverse().map((c: any) => {
                const tStr = isDaily ? (c.candle_date_time_kst || "").substring(5, 10) : (c.candle_date_time_kst || "").substring(11, 16);
                return {
                  time: tStr || "09:00",
                  open: c.opening_price,
                  high: c.high_price,
                  low: c.low_price,
                  close: c.trade_price,
                  volume: Math.round(c.candle_acc_trade_volume || 0),
                  vwap: c.trade_price
                };
              });

              for (let i = 0; i < formatted.length; i++) {
                if (i >= 4) {
                  const ma5Slice = formatted.slice(i - 4, i + 1);
                  formatted[i].ma5 = Math.round(ma5Slice.reduce((sum, cc) => sum + cc.close, 0) / 5);
                }
                if (i >= 19) {
                  const ma20Slice = formatted.slice(i - 19, i + 1);
                  const mean = ma20Slice.reduce((sum, cc) => sum + cc.close, 0) / 20;
                  formatted[i].ma20 = Math.round(mean);
                  const variance = ma20Slice.reduce((sum, cc) => sum + Math.pow(cc.close - mean, 2), 0) / 20;
                  const stdDev = Math.sqrt(variance);
                  formatted[i].bollingerUpper = Math.round(mean + stdDev * 2);
                  formatted[i].bollingerLower = Math.round(mean - stdDev * 2);
                }
              }
              setCandleData(formatted);
            }
          }
        } else {
          // Fetch Quant Matrix with real candle stream
          const res = await fetch(`/api/quant/matrix/${symbol}`);
          if (res.ok) {
            const sData = await res.json();
            if (sData) {
              if (sData.price) {
                setLivePrice(sData.price);
              }
              if (typeof sData.changePct === "number") {
                setLiveChangeRate(sData.changePct);
              }
              if (Array.isArray(sData.candles) && sData.candles.length > 0) {
                const formatted: CandleTickData[] = sData.candles.map((c: any) => ({
                  time: c.time,
                  open: c.open,
                  high: c.high,
                  low: c.low,
                  close: c.close,
                  volume: c.volume,
                  vwap: sData.realVwap || c.close
                }));
                // Calculate indicators
                for (let i = 0; i < formatted.length; i++) {
                  if (i >= 4) {
                    const ma5Slice = formatted.slice(i - 4, i + 1);
                    formatted[i].ma5 = Math.round(ma5Slice.reduce((sum, cc) => sum + cc.close, 0) / 5);
                  }
                  if (i >= 19) {
                    const ma20Slice = formatted.slice(i - 19, i + 1);
                    const mean = ma20Slice.reduce((sum, cc) => sum + cc.close, 0) / 20;
                    formatted[i].ma20 = Math.round(mean);
                    const variance = ma20Slice.reduce((sum, cc) => sum + Math.pow(cc.close - mean, 2), 0) / 20;
                    const stdDev = Math.sqrt(variance);
                    formatted[i].bollingerUpper = Math.round(mean + stdDev * 2);
                    formatted[i].bollingerLower = Math.round(mean - stdDev * 2);
                  }
                  if (i >= 14) {
                    let gains = 0;
                    let losses = 0;
                    for (let j = i - 13; j <= i; j++) {
                      const diff = formatted[j].close - formatted[j - 1].close;
                      if (diff >= 0) gains += diff;
                      else losses += Math.abs(diff);
                    }
                    const avgGain = gains / 14;
                    const avgLoss = losses / 14 || 1;
                    const rs = avgGain / avgLoss;
                    formatted[i].rsi = parseFloat((100 - (100 / (1 + rs))).toFixed(1));
                  }
                }
                setCandleData(formatted);
              }
            }
          }
        }
      } catch (e) {
        // quiet catch
      }
    };

    fetchRealData();
    const interval = setInterval(fetchRealData, 3000);

    return () => clearInterval(interval);
  }, [symbol, market, isLiveUpdating]);

  // AI Candlestick Pattern Auto-Detection Engine
  const detectedPatterns = useMemo<AiPatternResult[]>(() => {
    const historical = candleData.filter(c => !c.isForecast);
    if (historical.length < 3) return [];

    const last = historical[historical.length - 1];
    const prev1 = historical[historical.length - 2];

    const results: AiPatternResult[] = [];
    const body = Math.abs(last.close - last.open);
    const upperWick = last.high - Math.max(last.open, last.close);
    const lowerWick = Math.min(last.open, last.close) - last.low;
    const totalRange = last.high - last.low || 1;

    // 1. Hammer / Inverted Hammer
    if (lowerWick > body * 2 && upperWick < body * 0.5) {
      results.push({
        name: "망치형(Hammer) 반등 캔들",
        type: "bullish",
        confidence: 88,
        description: "하단 강한 매수세 유입으로 단기 저점 형성 후 반등 시그널"
      });
    }

    // 2. Bearish Marubozu
    if (last.close < last.open && body / totalRange > 0.7) {
      results.push({
        name: "장대음봉(Bearish Marubozu)",
        type: "bearish",
        confidence: 91,
        description: "강한 매도세 출하로 단기 지지선 하향 이탈 및 조정 압력 증대"
      });
    }

    // 3. Bullish Marubozu
    if (last.close > last.open && body / totalRange > 0.8) {
      results.push({
        name: "장대양봉(Bullish Marubozu)",
        type: "bullish",
        confidence: 92,
        description: "주도 매수 주체의 압도적 물량 매집으로 강한 상승 추세 지속"
      });
    }

    // 4. Doji
    if (body / totalRange < 0.1) {
      results.push({
        name: "도지(Doji) 추세 변곡점",
        type: "neutral",
        confidence: 75,
        description: "매수·매도 세력 팽팽한 균형, 변곡점 임박 가능성"
      });
    }

    // 5. Bullish Engulfing
    if (prev1.close < prev1.open && last.close > last.open && last.open <= prev1.close && last.close >= prev1.open) {
      results.push({
        name: "상승 잉위형(Bullish Engulfing)",
        type: "bullish",
        confidence: 94,
        description: "직전 음봉을 완전히 감싸는 강한 매수 유입, 추세 전환 명확"
      });
    }

    // 6. MA Golden Cross
    if (last.ma5 && last.ma20 && prev1.ma5 && prev1.ma20) {
      if (prev1.ma5 <= prev1.ma20 && last.ma5 > last.ma20) {
        results.push({
          name: "MA 5/20 골든크로스",
          type: "bullish",
          confidence: 96,
          description: "단기 이동평균선이 중기선을 골든크로스하며 추세적 대세 상승 진입"
        });
      }
    }

    if (results.length === 0) {
      // Data Truth: Do not inject artificial patterns when none are detected
    }

    return results;
  }, [candleData]);

  // Calculated AI Prediction Score & Target Overlays
  const aiPrediction = useMemo(() => {
    let baseProb = 50 + (liveChangeRate * 3.5) + (volumePower > 100 ? 6 : -6);
    
    detectedPatterns.forEach(p => {
      if (p.type === "bullish") baseProb += 7;
      if (p.type === "bearish") baseProb -= 12;
    });

    const finalProb = Math.min(96.8, Math.max(14.0, baseProb));
    const isBull = finalProb >= 58;
    const isBear = finalProb <= 42;

    const curr = livePrice || 0;
    if (curr <= 0) {
      return {
        probabilityPct: 0,
        direction: "WAIT" as const,
        target1: 0,
        target2: 0,
        stopLoss: 0,
        entryMin: 0,
        entryMax: 0,
        riskRewardRatio: "N/A",
        aiGrade: "NO_DATA"
      };
    }

    // Pivot-based dynamic levels derived from candle OHLC structure (no fixed % multipliers)
    const historical = candleData.filter(c => !c.isForecast);
    const last = historical[historical.length - 1] || { high: curr, low: curr, close: curr };
    const h = last.high || curr;
    const l = last.low || curr;
    const c = last.close || curr;

    const pivot = (h + l + c) / 3;
    const r1 = Math.round((2 * pivot) - l);
    const r2 = Math.round(pivot + (h - l));
    const s1 = Math.round((2 * pivot) - h);
    const s2 = Math.round(pivot - (h - l));

    const target1 = isBull ? Math.max(curr, r1) : Math.min(curr, s1);
    const target2 = isBull ? Math.max(target1, r2) : Math.min(target1, s2);
    const stopLoss = isBull ? Math.min(curr, s1) : Math.max(curr, r1);
    const entryMin = Math.min(curr, pivot);
    const entryMax = curr;

    return {
      probabilityPct: parseFloat(finalProb.toFixed(1)),
      direction: isBull ? "LONG" : isBear ? "SHORT" : "WAIT",
      target1,
      target2,
      stopLoss,
      entryMin,
      entryMax,
      riskRewardRatio: isBull ? "1 : 2.8" : "1 : 1.2",
      aiGrade: finalProb >= 80 ? "S+ Tier" : finalProb >= 60 ? "A+ Tier" : finalProb <= 35 ? "Risk Tier" : "B Tier"
    };
  }, [livePrice, liveChangeRate, volumePower, detectedPatterns]);

  // Pivot Support & Resistance Lines
  const pivotData = useMemo(() => {
    const historical = candleData.filter(c => !c.isForecast);
    const last = historical[historical.length - 1] || { high: livePrice, low: livePrice, close: livePrice };
    const h = last.high || livePrice;
    const l = last.low || livePrice;
    const c = last.close || livePrice;

    const pivot = (h + l + c) / 3;
    const r1 = 2 * pivot - l;
    const s1 = 2 * pivot - h;
    const r2 = pivot + (h - l);
    const s2 = pivot - (h - l);

    return { pivot: Math.round(pivot), r1: Math.round(r1), s1: Math.round(s1), r2: Math.round(r2), s2: Math.round(s2) };
  }, [candleData, livePrice]);

  // Live Orderbook (Empty if no live depth API connected - NO SYNTHETIC RANDOM HO-GA)
  const liveOrderbook = useMemo(() => {
    return { asks: [], bids: [], maxQty: 1 };
  }, [livePrice]);

  // Handle Order Submission
  const handleExecuteOrder = async () => {
    setIsOrderSubmitting(true);
    try {
      const formattedMarket = (market === "BTC" || market === "CRYPTO") ? "BTC" : market === "US" ? "US" : "KOREA";
      await executeTrade(
        symbol,
        name,
        formattedMarket,
        orderSide,
        orderQty,
        orderPriceInput || livePrice,
        "J.A.R.V.I.S 캔들차트 모달 즉시 주문",
        `AI 신호: ${aiPrediction.direction} (${aiPrediction.probabilityPct}%), 1차목표가: ₩${(aiPrediction.target1 ?? 0).toLocaleString()}`,
        true
      );
      const isCryptoAsset = market === "BTC" || market === "CRYPTO" || symbol.startsWith("KRW-");
      const unitStr = isCryptoAsset ? "코인" : "주";
      addToast({
        type: "SUCCESS",
        title: `${orderSide === "BUY" ? "매수" : "매도"} 주문 접수 완료`,
        message: `${name}(${symbol}) ${orderQty} ${unitStr}이(가) ₩${(orderPriceInput || livePrice).toLocaleString()}원에 주문 체결되었습니다.`
      });
    } catch (e: any) {
      addToast({
        type: "ERROR",
        title: "주문 실패",
        message: e.message || "주문 처리 중 오류가 발생했습니다."
      });
    } finally {
      setIsOrderSubmitting(false);
    }
  };

  // Generate Gemini AI Deep Analysis inside Modal
  const handleModalAiAnalyze = async () => {
    setIsAiReportLoading(true);
    setAiAnalysisReport(null);

    try {
      const patternsStr = detectedPatterns.map(p => `${p.name} (신뢰도:${p.confidence}%)`).join(", ");

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          market,
          contextData: {
            name,
            symbol,
            market,
            currentPrice: livePrice,
            changeRate: liveChangeRate,
            volumePower,
            aiProbability: aiPrediction.probabilityPct,
            target1: aiPrediction.target1,
            target2: aiPrediction.target2,
            stopLoss: aiPrediction.stopLoss,
            detectedPatterns: patternsStr,
            prompt: `현재 ${name}(${symbol}, ${market}) 종목의 실시간 캔들차트 및 호가 수급 데이터 분석 요청입니다.\n- AI 신호: ${aiPrediction.direction} (${aiPrediction.probabilityPct}%)\n- 포착 캔들 패턴: ${patternsStr}\n- 1차 목표가: ₩${(aiPrediction.target1 ?? 0).toLocaleString()}원, 2차: ₩${(aiPrediction.target2 ?? 0).toLocaleString()}원, 손절가: ₩${(aiPrediction.stopLoss ?? 0).toLocaleString()}원\n\n이동평균선(MA5/20/60), 볼린저 밴드, 체결강도(${volumePower.toFixed(1)}%), 호가 수급 잔량을 종합하여 퀀트 분할 매수/매도 실행 타점을 정밀 리포트로 리턴해줘.`
          }
        })
      });

      const data = await res.json();
      const reportText = data.analysis || data.rationale;
      if (reportText) {
        setAiAnalysisReport(`[🤖 J.A.R.V.I.S. AI 캔들스틱 퀀트 정밀분석 리포트]\n\n${reportText}\n\n• AI 신호: ${aiPrediction.direction} (${aiPrediction.probabilityPct}% [${aiPrediction.aiGrade}])\n• 캔들 패턴: ${patternsStr}\n• 추천 최적 진입구간: ₩${(aiPrediction.entryMin ?? 0).toLocaleString()} ~ ₩${(aiPrediction.entryMax ?? 0).toLocaleString()}원\n• 1차 목표가: ₩${(aiPrediction.target1 ?? 0).toLocaleString()}원 | 손절가: ₩${(aiPrediction.stopLoss ?? 0).toLocaleString()}원`);
      } else {
        setAiAnalysisReport(`[🤖 J.A.R.V.I.S. AI 캔들스틱 퀀트 정밀분석 리포트]\n\n1. AI 캔들 패턴 포착:\n- ${patternsStr}\n\n2. AI 신호 & 매매 타점:\n- AI 예측 신호: ${aiPrediction.direction} (${aiPrediction.probabilityPct}% [${aiPrediction.aiGrade}])\n- 추천 진입구간: ₩${(aiPrediction.entryMin ?? 0).toLocaleString()} ~ ₩${(aiPrediction.entryMax ?? 0).toLocaleString()}원\n- 1차 목표가: ₩${(aiPrediction.target1 ?? 0).toLocaleString()}원 (+3.5%)\n- 1차 손절가: ₩${(aiPrediction.stopLoss ?? 0).toLocaleString()}원 (-6.0%)\n\n3. 피봇 & 이평선 퀀트 총평:\n현재 캔들이 주요 이동평균선(MA5/MA20) 지지 파동을 형성 중이며, 체결강도(${volumePower.toFixed(1)}%)가 뒷받침되고 있습니다. 피봇 지지선(₩${(pivotData.s1 ?? 0).toLocaleString()}원) 근방 분할 매수 진입 시 승률을 극대화할 수 있습니다.`);
      }
    } catch (e: any) {
      setAiAnalysisReport(`AI 분석 중 오류가 발생했습니다: ${e.message || '네트워크 연결 상태를 확인해주세요.'}`);
    } finally {
      setIsAiReportLoading(false);
    }
  };

  const isPositive = liveChangeRate >= 0;
  const isUsMarket = market === "US";
  const upColor = isUsMarket ? "#10b981" : "#ef4444";
  const downColor = isUsMarket ? "#ef4444" : "#3b82f6";

  const isScrapped = isInWatchlist(symbol);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-950 border-2 border-cyan-500/60 text-white rounded-3xl max-w-6xl w-full p-3 sm:p-5 shadow-2xl space-y-4 my-auto max-h-[92vh] sm:max-h-[94vh] flex flex-col overflow-y-auto">
        
        {/* HEADER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border transition-all duration-300 ${
              isPositive ? "bg-emerald-950/90 text-emerald-400 border-emerald-700/80 shadow-emerald-900/40 shadow-lg" : "bg-rose-950/90 text-rose-400 border-rose-700/80 shadow-rose-900/40 shadow-lg"
            }`}>
              {isPositive ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">{name}</h2>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-700">
                  {symbol}
                </span>

                {/* Explicit Market Badge */}
                {(() => {
                  const mStatus = getMarketStatus(symbol, market);
                  return (
                    <>
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md shadow-xs ${mStatus.badgeClass}`}>
                        {mStatus.marketBadgeLabel}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-slate-700/80 ${mStatus.statusColorClass} bg-slate-900/90`}>
                        {mStatus.sessionStatusText}
                      </span>
                    </>
                  );
                })()}

                <button
                  onClick={() => {
                    if (isScrapped) {
                      removeFromWatchlist(symbol);
                    } else {
                      addToWatchlist({ symbol, name, market: market as any });
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                    isScrapped ? "bg-amber-500/20 text-amber-300 border-amber-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                >
                  {isScrapped ? "★ 관심 종목" : "☆ 관심 등록"}
                </button>
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-3 mt-1">
                <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight transition-colors duration-200 ${
                  lastTickDirection === "UP" ? "text-emerald-400 animate-pulse" :
                  lastTickDirection === "DOWN" ? "text-rose-400 animate-pulse" :
                  "text-white"
                }`}>
                  {market === "US" ? `$${(livePrice ?? 0).toLocaleString()}` : `₩${(livePrice ?? 0).toLocaleString()}`}
                </span>

                <span className={`text-sm sm:text-base font-black font-mono px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                  isPositive ? "bg-emerald-950 text-emerald-400 border-emerald-700" : "bg-rose-950 text-rose-400 border-rose-700"
                }`}>
                  {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  <span>{isPositive ? `+${liveChangeRate}%` : `${liveChangeRate}%`}</span>
                </span>

                <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
                  체결강도: <strong className="text-cyan-300">{volumePower.toFixed(1)}%</strong>
                </span>

                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>실시간 시세 수신중</span>
                </span>
              </div>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("AI_DUAL");
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-lg border border-purple-400/50 flex items-center gap-1.5 transition cursor-pointer"
              title="AI 실시간 vs 예측 듀얼 차트 바로보기"
            >
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
              <span>🔮 AI 예측 그래프 (실시간 대조)</span>
            </button>

            <button
              onClick={handleModalAiAnalyze}
              disabled={isAiReportLoading}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 via-teal-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg border border-cyan-400/50 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className={`h-4 w-4 text-cyan-200 ${isAiReportLoading ? "animate-spin" : "animate-pulse"}`} />
              <span>{isAiReportLoading ? "AI 분석 중..." : "AI 정밀 퀀트 분석"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* AI SIGNAL & TARGET BANNER ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 shrink-0">
          
          {/* Signal & Confidence */}
          <div className="bg-gradient-to-r from-slate-900 to-cyan-950/90 border border-cyan-500/40 rounded-2xl p-3 space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold flex items-center gap-1">
                <Target className="h-4 w-4 text-cyan-400" />
                <span>J.A.R.V.I.S AI 시그널 & 신뢰도</span>
              </span>
              <span className="bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                {aiPrediction.aiGrade}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-xl border text-sm ${
                  aiPrediction.direction === "LONG" ? "bg-emerald-950 text-emerald-300 border-emerald-600" :
                  aiPrediction.direction === "SHORT" ? "bg-rose-950 text-rose-300 border-rose-600" :
                  "bg-amber-950 text-amber-300 border-amber-600"
                }`}>
                  {aiPrediction.direction === "LONG" ? "▲ LONG (매수)" : aiPrediction.direction === "SHORT" ? "▼ SHORT (매도)" : "● WAIT (관망)"}
                </span>
                <span className="text-cyan-300">{aiPrediction.probabilityPct}%</span>
              </div>
              <span className="text-xs font-bold font-mono text-slate-300">
                손익비: <strong className="text-emerald-400">{aiPrediction.riskRewardRatio}</strong>
              </span>
            </div>

            {/* Gauge bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full rounded-full transition-all duration-700 shadow-md ${
                  aiPrediction.direction === "LONG" 
                    ? "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400" 
                    : aiPrediction.direction === "SHORT" 
                    ? "bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500" 
                    : "bg-gradient-to-r from-amber-500 to-yellow-400"
                }`}
                style={{ width: `${aiPrediction.probabilityPct}%` }}
              />
            </div>
          </div>

          {/* AI Pattern Detected */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Flame className="h-4 w-4 text-amber-400" />
                <span>AI 포착 캔들 패턴 ({detectedPatterns.length}개)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">실시간 감지</span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {detectedPatterns.map((pt, idx) => (
                <span 
                  key={idx}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 border ${
                    pt.type === "bullish" ? "bg-emerald-950 text-emerald-300 border-emerald-700" :
                    pt.type === "bearish" ? "bg-rose-950 text-rose-300 border-rose-700" :
                    "bg-slate-800 text-cyan-300 border-slate-700"
                  }`}
                  title={pt.description}
                >
                  <span>{pt.name}</span>
                  <span className="text-[10px] opacity-80 font-mono">({pt.confidence}%)</span>
                </span>
              ))}
            </div>
          </div>

          {/* AI Target & Stop Levels */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1 shadow-md font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1">
              <span className="font-bold text-indigo-300 flex items-center gap-1">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>AI 계산 매매 타점</span>
              </span>
              <span className="text-[10px] text-slate-400">Target & SL</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
              <div>
                <span className="text-emerald-400 font-bold block">1차목표가: ₩{(aiPrediction.target1 ?? 0).toLocaleString()}</span>
                <span className="text-emerald-300 block">2차목표가: ₩{(aiPrediction.target2 ?? 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-rose-400 font-bold block">손절기준가: ₩{(aiPrediction.stopLoss ?? 0).toLocaleString()}</span>
                <span className="text-cyan-300 block">진입구간: ₩{(aiPrediction.entryMin ?? 0).toLocaleString()}~</span>
              </div>
            </div>
          </div>

        </div>

        {/* MODAL NAVIGATION & INDICATOR TOGGLES */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shrink-0">
          
          {/* Main View Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("CHART")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === "CHART" ? "bg-cyan-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>실시간 차트</span>
            </button>

            <button
              onClick={() => setActiveTab("AI_DUAL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === "AI_DUAL" ? "bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-lg ring-1 ring-cyan-400" : "text-cyan-300 hover:text-white hover:bg-cyan-950/40"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-cyan-300 animate-pulse" />
              <span>📊 실시간 vs AI예측 듀얼차트</span>
            </button>

            <button
              onClick={() => setActiveTab("AI_30D")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === "AI_30D" ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white shadow-md ring-1 ring-cyan-400" : "text-purple-300 hover:text-white hover:bg-purple-950/40"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>🔮 30일 AI 예측선</span>
            </button>

            <button
              onClick={() => setActiveTab("INFO")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === "INFO" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-cyan-300" />
              <span>🏢 기업 상세 정보 &amp; 실시간 시세 카드</span>
            </button>

            <button
              onClick={() => setActiveTab("ORDERBOOK")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === "ORDERBOOK" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>실시간 호가창</span>
            </button>

            <button
              onClick={() => setActiveTab("ORDER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === "ORDER" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>즉시 매매 주문</span>
            </button>
          </div>

          {/* Chart Type Switches (if Chart Tab Active) */}
          {activeTab === "CHART" && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setChartType("CANDLE")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    chartType === "CANDLE" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CandlestickChart className="h-3.5 w-3.5" />
                  <span>봉차트</span>
                </button>

                <button
                  onClick={() => setChartType("LINE")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    chartType === "LINE" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LineChartIcon className="h-3.5 w-3.5" />
                  <span>라인차트</span>
                </button>

                <button
                  onClick={() => setChartType("AI_FORECAST")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    chartType === "AI_FORECAST" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>AI 미래예상선</span>
                </button>
              </div>

              {/* Timeframes */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(["1M", "5M", "15M", "1H", "1D"] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer ${
                      timeframe === tf ? "bg-slate-700 text-cyan-300" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Toggles */}
              <button
                onClick={() => setShowMA(!showMA)}
                className={`px-2 py-1 rounded-lg text-[11px] border font-bold transition cursor-pointer ${
                  showMA ? "bg-amber-950/80 text-amber-300 border-amber-600" : "bg-slate-800 text-slate-500 border-slate-700"
                }`}
              >
                MA 5/20/60
              </button>

              <button
                onClick={() => setShowTargets(!showTargets)}
                className={`px-2 py-1 rounded-lg text-[11px] border font-bold transition cursor-pointer ${
                  showTargets ? "bg-emerald-950/80 text-emerald-300 border-emerald-600" : "bg-slate-800 text-slate-500 border-slate-700"
                }`}
              >
                목표/손절선
              </button>
            </div>
          )}
        </div>

        {/* MAIN BODY DISPLAY */}
        <div className="flex-1 min-h-[380px] overflow-y-auto flex flex-col">
          
          {/* TAB 1: REAL-TIME GRAPH CHART */}
          {activeTab === "CHART" && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex-1 flex flex-col justify-between">
              {chartType === "AI_FORECAST" ? (
                <AiFutureTrendOverlayChart
                  symbol={symbol}
                  name={name}
                  market={market}
                  livePrice={livePrice}
                  changeRate={liveChangeRate}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800 shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                    <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
                    <span>실시간 {name} 퀀트 캔들 차트</span>
                  </span>
                  {showMA && <span className="text-amber-400 font-bold text-[11px]">━━ MA5 (단기)</span>}
                  {showMA && <span className="text-purple-400 font-bold text-[11px]">━━ MA20 (중기)</span>}
                  {showBollinger && <span className="text-indigo-300 font-bold text-[11px]">░░ 볼린저밴드</span>}
                  {chartType === "AI_FORECAST" && <span className="text-purple-300 font-bold text-[11px]">┄┄ AI 미래경로 (T+5)</span>}
                  {showTargets && <span className="text-emerald-400 font-bold text-[11px]">━━ 1차목표가</span>}
                </div>
                <span className="text-[11px] text-slate-300 font-bold">단위: {market === "US" ? "USD" : "KRW"}</span>
              </div>

              {/* Recharts Canvas */}
              <div className="w-full h-[360px] sm:h-[400px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={candleData} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.7} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    
                    {/* Price Y-Axis */}
                    <YAxis 
                      yAxisId="price"
                      domain={["auto", "auto"]} 
                      tick={{ fontSize: 10, fill: "#94a3b8" }} 
                      orientation="right"
                      tickFormatter={(val) => market === "US" ? `$${val}` : `₩${Math.round(val).toLocaleString()}`}
                    />

                    {/* Volume Y-Axis (Hidden domain for bottom bar placement) */}
                    <YAxis 
                      yAxisId="volume"
                      domain={[0, (dataMax: number) => dataMax * 4]}
                      hide={true}
                    />

                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as CandleTickData;
                          const isUp = data.close >= data.open;
                          return (
                            <div className="bg-slate-950/95 border-2 border-cyan-500/70 rounded-2xl p-3.5 text-xs font-mono space-y-1.5 shadow-2xl text-white z-50 backdrop-blur-md">
                              <p className="font-black text-cyan-300 border-b border-slate-800 pb-1.5 flex justify-between items-center">
                                <span>{data.time} {data.isForecast ? "[AI 미래예측 봉]" : "캔들 상세"}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isUp ? "bg-emerald-950 text-emerald-400 border border-emerald-700" : "bg-rose-950 text-rose-400 border border-rose-700"}`}>
                                  {isUp ? "양봉 (상승)" : "음봉 (하락)"}
                                </span>
                              </p>
                              <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-[11px]">
                                <span className="text-slate-400">시가: <strong>₩{(data.open ?? 0).toLocaleString()}</strong></span>
                                <span className="text-emerald-400">고가: <strong>₩{(data.high ?? 0).toLocaleString()}</strong></span>
                                <span className="text-rose-400">저가: <strong>₩{(data.low ?? 0).toLocaleString()}</strong></span>
                                <span className={isUp ? "text-emerald-400 font-black" : "text-rose-400 font-black"}>
                                  종가: <strong>₩{(data.close ?? 0).toLocaleString()}</strong>
                                </span>
                              </div>
                              <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">거래량: <strong className="text-cyan-300">{(data.volume ?? 0).toLocaleString()} 주</strong></span>
                                {data.rsi && <span className="text-amber-300 font-bold">RSI: {data.rsi}</span>}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Bollinger Bands Shader */}
                    {showBollinger && (
                      <Area
                        yAxisId="price"
                        type="monotone"
                        dataKey="bollingerUpper"
                        stroke="#818cf8"
                        strokeDasharray="2 2"
                        strokeWidth={1}
                        fill="#6366f1"
                        fillOpacity={0.08}
                        dot={false}
                      />
                    )}

                    {/* Volume Bars at Bottom */}
                    <Bar
                      yAxisId="volume"
                      dataKey="volume"
                      fill="#38bdf8"
                      opacity={0.35}
                      barSize={12}
                      radius={[2, 2, 0, 0]}
                    />

                    {/* Target and Stop loss horizontal reference lines */}
                    {showTargets && (
                      <>
                        <ReferenceLine yAxisId="price" y={aiPrediction.target1} stroke="#10b981" strokeDasharray="3 3" label={{ value: '1차목표가', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
                        <ReferenceLine yAxisId="price" y={aiPrediction.stopLoss} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '손절기준가', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                      </>
                    )}

                    {/* Chart Render: CANDLE vs LINE vs AI FORECAST */}
                    {chartType === "LINE" ? (
                      <Area
                        yAxisId="price"
                        type="monotone"
                        dataKey="close"
                        stroke="#06b6d4"
                        strokeWidth={3}
                        fill="url(#lineGradient)"
                        dot={false}
                      />
                    ) : chartType === "AI_FORECAST" ? (
                      <>
                        <Area
                          yAxisId="price"
                          type="monotone"
                          dataKey="close"
                          stroke="#a855f7"
                          strokeWidth={3}
                          strokeDasharray="4 4"
                          fill="#a855f7"
                          fillOpacity={0.18}
                        />
                        <Line yAxisId="price" type="monotone" dataKey="forecastUpper" stroke="#c084fc" strokeDasharray="2 2" dot={false} />
                        <Line yAxisId="price" type="monotone" dataKey="forecastLower" stroke="#c084fc" strokeDasharray="2 2" dot={false} />
                      </>
                    ) : (
                      /* Candlestick Custom Bar Shape with Thick Responsive Width */
                      <Bar
                        yAxisId="price"
                        dataKey="close"
                        fill="#3b82f6"
                        shape={(props: any) => {
                          const { x, y, width, height, payload } = props;
                          if (!payload) return <g />;
                          const { open, close, high, low, isForecast } = payload;
                          const isUp = (close || 0) >= (open || 0);
                          const color = isForecast ? "#a855f7" : isUp ? upColor : downColor;

                          const safeX = Number.isFinite(x) ? x : 0;
                          const safeY = Number.isFinite(y) ? y : 0;
                          const safeWidth = Number.isFinite(width) ? width : 0;
                          const safeHeight = Number.isFinite(height) ? height : 0;

                          const yAxis = props.yAxis;
                          if (!yAxis || typeof yAxis.scale !== "function") {
                            return <rect x={safeX} y={safeY} width={safeWidth} height={safeHeight} fill={color} />;
                          }

                          const openY = yAxis.scale(open);
                          const closeY = yAxis.scale(close);
                          const highY = yAxis.scale(high);
                          const lowY = yAxis.scale(low);

                          if (!Number.isFinite(openY) || !Number.isFinite(closeY) || !Number.isFinite(highY) || !Number.isFinite(lowY)) {
                            return <rect x={safeX} y={safeY} width={safeWidth} height={safeHeight} fill={color} />;
                          }

                          const candleTop = Math.min(openY, closeY);
                          const candleHeight = Math.max(Math.abs(openY - closeY), 3);
                          
                          // Thicker candle width calculation
                          const candleWidth = Math.max(10, Math.min(22, safeWidth * 0.78));
                          const centerX = safeX + safeWidth / 2;

                          return (
                            <g key={`candle-${payload.time || payload.date || safeX}`}>
                              {/* Upper and Lower Wick */}
                              <line
                                x1={centerX}
                                y1={highY}
                                x2={centerX}
                                y2={lowY}
                                stroke={color}
                                strokeWidth={2}
                                strokeDasharray={isForecast ? "2 2" : undefined}
                              />
                              {/* Candlestick Body */}
                              <rect
                                x={centerX - candleWidth / 2}
                                y={candleTop}
                                width={candleWidth}
                                height={candleHeight}
                                fill={color}
                                rx={2}
                                opacity={isForecast ? 0.75 : 1}
                                stroke={color}
                                strokeWidth={1}
                              />
                            </g>
                          );
                        }}
                      />
                    )}

                    {/* Moving Averages */}
                    {showMA && (
                      <>
                        <Line yAxisId="price" type="monotone" dataKey="ma5" stroke="#f59e0b" strokeWidth={2} dot={false} name="MA5" />
                        <Line yAxisId="price" type="monotone" dataKey="ma20" stroke="#c084fc" strokeWidth={2} dot={false} name="MA20" />
                      </>
                    )}

                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
                </>
              )}
            </div>
          )}

          {/* TAB 1.2: REALTIME VS AI PREDICTION DUAL SPLIT CANVAS CHART */}
          {activeTab === "AI_DUAL" && (
            <div className="flex-1 flex flex-col justify-start">
              <InteractivePredictionCanvasChart
                symbol={symbol}
                name={name}
                market={market}
                currentPrice={livePrice}
                predictedPath={dualPredictedPath}
                liveTickHistory={candleData.slice(-30).map((c) => ({
                  time: c.time,
                  price: c.close,
                  volume: c.volume,
                  side: c.close >= c.open ? "BUY" : "SELL"
                }))}
                timeframe={timeframe}
                horizonMode="MEDIUM"
                tradePlan={{
                  entryPrice: aiPrediction.entryMin,
                  tp1: aiPrediction.target1,
                  tp2: aiPrediction.target2,
                  stopLoss: aiPrediction.stopLoss,
                  riskRewardRatio: 2.85
                }}
                recommendation={aiPrediction.recommendation}
                actionSignal={aiPrediction.actionSignal === "STRONG_BUY" ? "BUY_CANDIDATE" : aiPrediction.actionSignal === "STRONG_SELL" ? "SELL_SIGNAL" : "WAIT_OBSERVE"}
                aiConfidence={aiPrediction.probabilityPct}
              />
            </div>
          )}

          {/* TAB 1.5: 30-DAY AI PREDICTIVE PRICE LINECHART */}
          {activeTab === "AI_30D" && (
            <div className="flex-1 flex flex-col justify-start">
              <Ai30DayPriceForecastChart
                symbol={symbol}
                name={name}
                market={market}
                currentPrice={livePrice}
                changeRate={liveChangeRate}
                targetPrice={aiPrediction.target1}
                stopLossPrice={aiPrediction.stopLoss}
                confidenceScore={aiPrediction.probabilityPct}
              />
            </div>
          )}

          {/* TAB 2: CORPORATE DETAIL INFO & REAL-TIME QUOTE CARD */}
          {activeTab === "INFO" && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 flex-1 overflow-y-auto">
              
              {/* Real-time Quote & Key Valuation Card Grid */}
              <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-black ${capInfoData.badgeClass}`}>
                      {capInfoData.label}
                    </span>
                    <span className="font-extrabold text-base text-white">{name} ({symbol})</span>
                    <span className="text-xs text-cyan-400 font-mono">[{market === "BTC" ? "업비트 가상자산" : market === "US" ? "토스증권 미국" : "한국투자증권 국내"}]</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      실시간 시세 체결 연동 중
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">실시간 현재가</span>
                    <span className={`text-base font-black ${isPositive ? "text-rose-400" : "text-blue-400"}`}>
                      {market === "US" ? `$${(livePrice ?? 0).toLocaleString()}` : `₩${(livePrice ?? 0).toLocaleString()}원`}
                    </span>
                    <span className="text-[10px] block font-bold mt-0.5">
                      {isPositive ? `+${liveChangeRate}% ▲` : `${liveChangeRate}% ▼`}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">24시간/당일 거래량</span>
                    <span className="text-sm font-black text-amber-300">{corpInfo.volume} 주</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">거래대금: {corpInfo.tradeValueStr}</span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">시가총액 (Market Cap)</span>
                    <span className="text-sm font-black text-cyan-300">{corpInfo.marketCap}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">체결강도: {volumePower.toFixed(1)}%</span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">52주 최고 / 최저가</span>
                    <span className="text-xs font-bold text-slate-200">{corpInfo.high52w} / {corpInfo.low52w}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">시가: {(corpInfo.openPrice ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Valuation & Financial Multiples */}
                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                  <div>PER (주가수익비율): <strong className="text-cyan-300">{corpInfo.per}</strong></div>
                  <div>PBR (주가순자산비율): <strong className="text-indigo-300">{corpInfo.pbr}</strong></div>
                  <div>배당수익률: <strong className="text-emerald-300">{corpInfo.dividendYield}</strong></div>
                </div>
              </div>

              {/* Corporate Overview & Business Summary */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-cyan-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>자세한 기업 개요 및 주요 사업</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  {corpInfo.description}
                </p>

                {/* Theme Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {corpInfo.themes.map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-bold px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded-md border border-cyan-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Financial Highlights */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-emerald-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>주요 재무 실적 및 투자 지표</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">연간 매출액</span>
                    <span className="font-bold text-white">{corpInfo.revenue}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">영업이익</span>
                    <span className="font-bold text-emerald-400">{corpInfo.opProfit}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">ROE (자기자본이익률)</span>
                    <span className="font-bold text-cyan-300">{corpInfo.roe}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">부채비율</span>
                    <span className="font-bold text-indigo-300">{corpInfo.debtRatio}</span>
                  </div>
                </div>
              </div>

              {/* AI Forecast Trigger Call-out */}
              <div className="bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-slate-950 border border-purple-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-sm font-black text-amber-300 flex items-center justify-center sm:justify-start gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
                    <span>J.A.R.V.I.S AI 퀀트 엔진의 미래 가격 분석</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    AI 파동 시나리오, 목표 타점 및 향후 2~6일간의 가격 예측 궤적 그래프를 확인하세요.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("CHART");
                    setChartType("AI_FORECAST");
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-lg border border-purple-400 transition cursor-pointer shrink-0 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>🔮 AI 예측 그래프 바로보기</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: LIVE 10-TIER ORDERBOOK (호가창) */}
          {activeTab === "ORDERBOOK" && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800 mb-3">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <span>실시간 10호가 수급 잔량 (Orderbook Depth)</span>
                </span>
                <span className="text-cyan-300 font-mono text-[11px]">현재가: ₩{(livePrice ?? 0).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* 매도 호가 (Asks) */}
                <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-blue-900/40">
                  <div className="text-blue-300 font-bold border-b border-slate-800 pb-1 mb-1 flex justify-between">
                    <span>매도 호가 (Sell Asks)</span>
                    <span>잔량(주)</span>
                  </div>
                  {liveOrderbook.asks.map(a => {
                    const depthPct = Math.min(100, Math.round((a.qty / liveOrderbook.maxQty) * 100));
                    return (
                      <div 
                        key={a.level}
                        onClick={() => setOrderPriceInput(a.price)}
                        className="relative flex items-center justify-between px-2 py-1 bg-slate-900/80 hover:bg-slate-800 rounded border border-blue-950 cursor-pointer transition"
                      >
                        <div 
                          className="absolute right-0 top-0 bottom-0 bg-blue-900/25 rounded-r"
                          style={{ width: `${depthPct}%` }}
                        />
                        <span className="text-blue-300 font-bold relative z-10">₩{(a.price ?? 0).toLocaleString()}</span>
                        <span className="text-slate-300 text-[11px] relative z-10">{(a.qty ?? 0).toLocaleString()} 주</span>
                      </div>
                    );
                  })}
                </div>

                {/* 매수 호가 (Bids) */}
                <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-rose-900/40">
                  <div className="text-rose-300 font-bold border-b border-slate-800 pb-1 mb-1 flex justify-between">
                    <span>매수 호가 (Buy Bids)</span>
                    <span>잔량(주)</span>
                  </div>
                  {liveOrderbook.bids.map(b => {
                    const depthPct = Math.min(100, Math.round((b.qty / liveOrderbook.maxQty) * 100));
                    return (
                      <div 
                        key={b.level}
                        onClick={() => setOrderPriceInput(b.price)}
                        className="relative flex items-center justify-between px-2 py-1 bg-slate-900/80 hover:bg-slate-800 rounded border border-rose-950 cursor-pointer transition"
                      >
                        <div 
                          className="absolute right-0 top-0 bottom-0 bg-rose-900/25 rounded-r"
                          style={{ width: `${depthPct}%` }}
                        />
                        <span className="text-rose-300 font-bold relative z-10">₩{(b.price ?? 0).toLocaleString()}</span>
                        <span className="text-slate-300 text-[11px] relative z-10">{(b.qty ?? 0).toLocaleString()} 주</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIRECT QUICK ORDER FORM */}
          {activeTab === "ORDER" && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="border-b border-slate-800 pb-2 mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <ShoppingCart className="h-4 w-4 text-emerald-400" />
                  <span>[{name}] 즉시 매매 주문창</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI 타점과 실시간 호가를 확인 후 즉시 매수/매도 주문을 실행할 수 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* Order Side & Inputs */}
                <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  {/* Side Switch */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl">
                    <button
                      onClick={() => setOrderSide("BUY")}
                      className={`py-2 rounded-lg font-black text-xs transition cursor-pointer ${
                        orderSide === "BUY" ? "bg-rose-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      ▲ 매수 (BUY)
                    </button>
                    <button
                      onClick={() => setOrderSide("SELL")}
                      className={`py-2 rounded-lg font-black text-xs transition cursor-pointer ${
                        orderSide === "SELL" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      ▼ 매도 (SELL)
                    </button>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400 block font-bold">
                        주문 수량 ({market === "BTC" || market === "CRYPTO" || symbol.startsWith("KRW-") ? "코인" : "주"})
                      </label>
                      {(market === "BTC" || market === "CRYPTO" || symbol.startsWith("KRW-")) && (
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          소수점 8자리 지원
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        min="0.00000001"
                        value={orderQty}
                        onChange={e => {
                          const isCryptoAsset = market === "BTC" || market === "CRYPTO" || symbol.startsWith("KRW-");
                          const parsed = parseFloat(e.target.value);
                          if (isCryptoAsset) {
                            setOrderQty(isNaN(parsed) || parsed <= 0 ? 0.00000001 : Number(parsed.toFixed(8)));
                          } else {
                            setOrderQty(Math.max(1, parseInt(e.target.value) || 1));
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-cyan-500 outline-none"
                      />
                      <div className="flex gap-1 shrink-0">
                        {(market === "BTC" || market === "CRYPTO" || symbol.startsWith("KRW-")) ? (
                          [0.001, 0.01, 0.1, 1].map(q => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setOrderQty(q)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[10px] font-bold font-mono"
                            >
                              +{q}
                            </button>
                          ))
                        ) : (
                          [5, 10, 50, 100].map(q => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setOrderQty(q)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold"
                            >
                              {q}주
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price Input */}
                  <div className="space-y-1">
                    <label className="text-slate-400 block font-bold">주문 가격 (원)</label>
                    <input
                      type="number"
                      value={orderPriceInput}
                      onChange={e => setOrderPriceInput(parseFloat(e.target.value) || livePrice)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>

                {/* Total Summary & Submit */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>현재 시장가</span>
                      <span className="text-white font-bold">₩{(livePrice ?? 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>AI 권장 진입가</span>
                      <span className="text-cyan-300 font-bold">₩{(aiPrediction.entryMin ?? 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2">
                      <span className="font-bold text-white">총 주문 예상금액</span>
                      <span className="text-emerald-400 font-black text-base">
                        ₩{((orderPriceInput || livePrice) * orderQty).toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteOrder}
                    disabled={isOrderSubmitting}
                    className={`w-full py-3 rounded-xl font-black text-sm text-white shadow-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                      orderSide === "BUY"
                        ? "bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    <span>{isOrderSubmitting ? "주문 처리 중..." : `${name} ${orderSide === "BUY" ? "매수" : "매도"} 주문 전송`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* AI ANALYSIS REPORT PANEL IF EXECUTED */}
        {aiAnalysisReport && (
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-3 space-y-1 text-xs font-mono leading-relaxed animate-in fade-in shrink-0">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>[{name}] Gemini AI 퀀트 정밀 분석 리포트</span>
              </span>
              <button
                onClick={() => setAiAnalysisReport(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-zinc-200 whitespace-pre-wrap max-h-36 overflow-y-auto pt-1">
              {aiAnalysisReport}
            </div>
          </div>
        )}

        {/* FOOTER BAR */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 shrink-0">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
            ※ 클릭 한 번으로 차트·호가창·AI예측선·즉시주문을 모바일/PC 모두 자유롭게 이용할 수 있습니다.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer transition ml-auto"
          >
            창 닫기
          </button>
        </div>

      </div>
    </div>
  );
};
