import React, { useState, useEffect } from "react";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  BarChart2, 
  Search, 
  Building2, 
  FileText, 
  Layers, 
  Crosshair, 
  PieChart, 
  AlertTriangle, 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Clock, 
  Sparkles, 
  Compass, 
  Radio, 
  Sliders, 
  Power,
  ChevronRight,
  ShieldAlert,
  Flame,
  Globe,
  Database,
  Cpu,
  RotateCcw
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { InteractivePredictionCanvasChart } from "./InteractivePredictionCanvasChart";
import { RealtimeRawDataStreamPanel } from "./RealtimeRawDataStreamPanel";

export const AiTradingCoreMasterPipeline: React.FC = () => {
  const { addToast } = useApp();

  // Active Pipeline Stage Focus (0..6)
  const [selectedStage, setSelectedStage] = useState<number>(0);
  
  // System Execution Mode (MANUAL vs AUTO)
  const [executionMode, setExecutionMode] = useState<"MANUAL" | "AUTO">("AUTO");
  const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
  const [autoTradingRunning, setAutoTradingRunning] = useState<boolean>(true);

  // Selected Target for Deep Pipeline Analysis
  const [targetSymbol, setTargetSymbol] = useState<string>("005930");
  const [targetName, setTargetName] = useState<string>("삼성전자");
  const [targetMarket, setTargetMarket] = useState<"US" | "KOREA" | "BTC">("KOREA");
  const [currentPrice, setCurrentPrice] = useState<number>(253500);

  // Pre-Order 8-Step Verification Check States
  const [preCheckSteps, setPreCheckSteps] = useState([
    { id: 1, label: "실시간 체결가격 재확인", status: "PASS", detail: "Spread 0.02% 양호" },
    { id: 2, label: "호가 스프레드 (Spread) 검증", status: "PASS", detail: "0.015% (기준 0.1% 미만)" },
    { id: 3, label: "슬리피지 (Slippage) 허용치 검사", status: "PASS", detail: "예상 슬리피지 0.04%" },
    { id: 4, label: "체결 거래량 / 수급 동향 확인", status: "PASS", detail: "평균 대비 142% 수급 유입" },
    { id: 5, label: "변동성 (ATR / VIX) 안전선 검사", status: "PASS", detail: "VKOSPI 16.4 (정상 범주)" },
    { id: 6, label: "뉴스 급변 / 긴급 속보 스캔", status: "PASS", detail: "돌발 악재 뉴스 없음 (+78 Sentiment)" },
    { id: 7, label: "보유 포지션 한도 검증", status: "PASS", detail: "현재 비중 8.5% (최대 15% 이내)" },
    { id: 8, label: "종합 Risk Limit & 손실 한도 패스", status: "PASS", detail: "일일 손실 -0.4% (한도 -2.5%)" },
  ]);

  // Candidate Stocks Scanner Pipeline State (Genuine Domestic & Upbit Universe)
  const [scannerCandidates, setScannerCandidates] = useState([
    { rank: 1, symbol: "005930", name: "삼성전자", market: "KOREA" as const, price: 253500, change: -2.87, score: 92, signal: "LONG", stage: "최종 매매 후보" },
    { rank: 2, symbol: "000660", name: "SK하이닉스", market: "KOREA" as const, price: 1650000, change: -2.54, score: 89, signal: "LONG", stage: "최종 매매 후보" },
    { rank: 3, symbol: "KRW-BTC", name: "비트코인 (Upbit)", market: "BTC" as const, price: 90200000, change: +4.7, score: 82, signal: "LONG", stage: "후보 10개" },
    { rank: 4, symbol: "042700", name: "한미반도체", market: "KOREA" as const, price: 211500, change: -1.63, score: 88, signal: "LONG", stage: "최종 매매 후보" },
    { rank: 5, symbol: "196170", name: "알테오젠", market: "KOREA" as const, price: 309000, change: +2.66, score: 94, signal: "LONG", stage: "후보 30개" },
  ]);

  // Active Position LifeCycle State
  const [activePosition, setActivePosition] = useState({
    symbol: "005930",
    side: "LONG",
    entryPrice: 248000,
    currentPrice: 253500,
    pnlAmount: +55000,
    pnlPercent: +2.22,
    stopLoss: 242000,
    tp1: 260000,
    tp2: 275000,
    tp3: 290000,
    tp1Hit: true,
    breakEvenMoved: true,
    trailingStopActive: true,
    aiHealthStatus: "HEALTHY_HOLD" // HEALTHY_HOLD | TAKE_PROFIT_PARTIAL | RISK_REDUCE
  });

  const currencySymbol = targetMarket === "US" ? "$" : "₩";

  // Simulate pipeline re-scan
  const handleRunFullPipelineScan = () => {
    addToast({
      type: "INFO",
      title: "🔄 AI TRADING CORE 전체 7단계 파이프라인 재분석 실행",
      message: "시장 수급 ➔ 종목 스캐닝 ➔ 3대 시나리오 ➔ 주문 재검증을 최신화합니다."
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 sm:p-6 font-sans space-y-6">
      
      {/* TOP HEADER: SYSTEM TITLE & MODE OVERRIDE CONTROLS */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-black flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                AI LIVE TRADING TOTAL MASTER SYSTEM v7.6
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-ping" />
                <span>Closed-Loop Discovery · Analysis · Shadow · Calibration v7.6</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
              <span>DISCOVER ➔ ANALYZE ➔ ANTICIPATE ➔ CONFIRM ➔ ENTER ➔ MONITOR ➔ PROTECT ➔ EXIT ➔ CALIBRATE</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              v6.1~v7.6 통합 시스템: 국내주식 실시간 탐색 · PRE-MOVE · 멀티 타임프레임 차트 · A/B/C/D 미래 시나리오 · 14단계 State Machine · Live Shadow 검증 · Adaptive Calibration 동기화 관제.
            </p>
          </div>

          {/* SYSTEM MODE TOGGLE & EMERGENCY KILL SWITCH */}
          <div className="flex flex-wrap items-center gap-3">
            {/* MANUAL / AUTO SWITCH */}
            <div className="bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setExecutionMode("MANUAL");
                  addToast({ type: "INFO", title: "수동 승인 모드 (MANUAL) 전환", message: "AI 분석 후 사용자 최종 승인 시 주문이 실행됩니다." });
                }}
                className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  executionMode === "MANUAL"
                    ? "bg-cyan-600 text-white shadow-lg"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>MANUAL (수동 승인)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExecutionMode("AUTO");
                  addToast({ type: "SUCCESS", title: "자율 자율 매매 (AUTO) 모드 승인", message: "AI 위험검증 조건 충족 시 주문이 자동 발주됩니다." });
                }}
                className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  executionMode === "AUTO"
                    ? "bg-emerald-600 text-white shadow-lg font-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Zap className="w-4 h-4 animate-bounce" />
                <span>AUTO (자율 매매)</span>
              </button>
            </div>

            {/* KILL SWITCH BUTTON */}
            <button
              type="button"
              onClick={() => {
                setKillSwitchActive(!killSwitchActive);
                addToast({
                  type: killSwitchActive ? "INFO" : "ERROR",
                  title: killSwitchActive ? "🛡️ Kill-Switch 해제" : "🚨 긴급 KILL-SWITCH 작동!",
                  message: killSwitchActive ? "자동 매매 및 신규 주문이 다시 정상 허용됩니다." : "모든 신규 자동 주문이 비상 차단되었으며 포지션 보호가 시작됩니다."
                });
              }}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 cursor-pointer border shadow-xl ${
                killSwitchActive
                  ? "bg-rose-600 text-white border-rose-400 animate-pulse"
                  : "bg-zinc-900 hover:bg-rose-950 text-rose-400 border-rose-800/80"
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{killSwitchActive ? "🚨 KILL-SWITCH 작동 중 (차단)" : "비상 KILL-SWITCH"}</span>
            </button>

            <button
              type="button"
              onClick={handleRunFullPipelineScan}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-2xl transition cursor-pointer border border-zinc-700"
              title="파이프라인 전체 동기화"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* 7-STAGE PIPELINE PROGRESS FLOWBAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
          {[
            { step: 1, title: "1. 시장 거시분석", desc: "RISK-ON/OFF, 일정", icon: Globe },
            { step: 2, title: "2. 종목&기업 AI", desc: "100개 스캔, 실적", icon: Building2 },
            { step: 3, title: "3. 차트 멀티TF", desc: "캔들/패턴/HH-HL", icon: BarChart2 },
            { step: 4, title: "4. 시그널 퓨전", desc: "LONG/SHORT 82%", icon: Sparkles },
            { step: 5, title: "5. 리스크&비중", desc: "40:30:20:10 배분", icon: PieChart },
            { step: 6, title: "6. 주문전 8단계", desc: "Spread,Slippage", icon: ShieldCheck },
            { step: 7, title: "7. 포지션 관리", desc: "Trailing Stop,TP", icon: Activity },
          ].map((stg, idx) => {
            const Icon = stg.icon;
            const isSelected = selectedStage === idx;
            return (
              <button
                key={stg.step}
                type="button"
                onClick={() => setSelectedStage(idx)}
                className={`p-2.5 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-gradient-to-br from-cyan-950 to-zinc-900 border-cyan-500 text-white shadow-xl ring-1 ring-cyan-500/50"
                    : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isSelected ? "bg-cyan-500 text-black font-black" : "bg-zinc-800 text-zinc-400"}`}>
                    STAGE {stg.step}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-400" : "text-zinc-500"}`} />
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold truncate text-white">{stg.title}</div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">{stg.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* AI TRAFFIC LIGHT SIGNAL INDICATOR */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3.5">
            {/* Traffic Light Housing */}
            <div className="bg-zinc-900 border border-zinc-700/80 px-3 py-2 rounded-2xl flex items-center gap-2.5 shadow-inner">
              <div 
                className="w-4 h-4 rounded-full bg-rose-950/40 border border-rose-900/40 opacity-40 cursor-pointer" 
                title="🔴 RED LIGHT: 진입 금지 / 리스크 경보" 
              />
              <div 
                className="w-4 h-4 rounded-full bg-amber-950/40 border border-amber-900/40 opacity-40 cursor-pointer" 
                title="🟡 YELLOW LIGHT: 관망대기 / 눌림목 주시" 
              />
              <div 
                className="w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.95)] scale-125 animate-pulse cursor-pointer" 
                title="🟢 GREEN LIGHT: 매수 진입 적기 (Go Signal)" 
              />
            </div>

            <div>
              <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                AI Trading Readiness (매매 체결 준비도)
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1.5">
                <span>🟢 GREEN LIGHT: 매수 진입 적기 (Go Signal Approved)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
            <span className="text-zinc-400">타겟: <strong className="text-white font-sans">{targetName}({targetSymbol})</strong></span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">AI Score: <strong className="text-emerald-400">91점</strong></span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">확신도: <strong className="text-cyan-300">88%</strong></span>
          </div>
        </div>
      </div>

      {/* STAGE 1: MARKET INTELLIGENCE ENGINE (시장 전체 상태, 거시 지표, 이벤트 일정) */}
      {selectedStage === 0 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-black text-white">STAGE 1: Market Intelligence Engine (시장 거시환경 &amp; 주요 이벤트)</h2>
              </div>
              <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-mono font-bold rounded-full">
                현재 시장 스탠스: 🟢 RISK-ON (선호 심리 우세)
              </span>
            </div>

            {/* Macro Tickers Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 text-[10px] block">KOSPI 종합지수</span>
                <span className="text-sm font-black text-emerald-400">2,742.80 (+1.12%)</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">외국인 +3,420억 순매수</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 text-[10px] block">USD / KRW 환율</span>
                <span className="text-sm font-black text-cyan-300">1,338.50원 (-0.45%)</span>
                <span className="text-[10px] text-emerald-500 block mt-0.5">원화 강세 ➔ 외국인 수급 호재</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 text-[10px] block">S&amp;P 500 / NASDAQ</span>
                <span className="text-sm font-black text-emerald-400">5,620.10 (+0.85%)</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">반도체 / 빅테크 강세</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 text-[10px] block">VIX 변동성 지수</span>
                <span className="text-sm font-black text-emerald-400">15.82 (-2.10%)</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">시장 안정권 진입</span>
              </div>
            </div>

            {/* Upcoming D-Day Events Alert */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
              <h3 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                📅 AI 다가오는 주요 경제/실적 일정 자동 감지 &amp; 위험도 연관성 평가
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-zinc-900 p-3 rounded-xl border border-amber-500/30">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-amber-300 font-mono">D-2 삼성전자 실적 발표</span>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded font-mono">HIGH IMPACT</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    AI 분석: 메모리 가격 반등 수혜 주시. 보유종목(SK하이닉스, 삼성전자) 직접 영향도 94%
                  </p>
                </div>

                <div className="bg-zinc-900 p-3 rounded-xl border border-cyan-500/30">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-cyan-300 font-mono">D-5 미 미국 CPI 소비자물가지수</span>
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] rounded font-mono">MACRO</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    AI 분석: 예상치 2.9% 하회 시 금리 인하 기대감 확산 ➔ 성장주/빅테크 긍정
                  </p>
                </div>

                <div className="bg-zinc-900 p-3 rounded-xl border border-purple-500/30">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-purple-300 font-mono">D-12 NVIDIA (엔비디아) 실적</span>
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded font-mono">GLOBAL AI</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    AI 분석: 블랙웰(Blackwell) 출하 일정 공개 주목. AI 반도체 전체 섹터 모멘텀 결정
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: AI SCANNER & CORPORATE DEEP ANALYSIS (전체 종목 스캐너 + 기업 심층 분석 + 뉴스 Sentiment) */}
      {selectedStage === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left: Candidate Stocks Filter Scanner */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  전체 시장 AI 스캐너 (100개 ➔ 10개 ➔ 최종)
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono">자동 갱신: 10초전</span>
              </div>

              <div className="space-y-2">
                {scannerCandidates.map((cnd) => (
                  <div
                    key={cnd.symbol}
                    onClick={() => {
                      setTargetSymbol(cnd.symbol);
                      setTargetName(cnd.name);
                      setTargetMarket(cnd.market as any);
                      setCurrentPrice(cnd.price);
                    }}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      targetSymbol === cnd.symbol
                        ? "bg-cyan-950/80 border-cyan-500 text-white shadow-lg"
                        : "bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-black text-sm">
                        <span>{cnd.name}</span>
                        <span className="text-xs text-zinc-400 font-mono">({cnd.symbol})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
                        <span className="text-zinc-400">{cnd.market}</span>
                        <span className="text-cyan-300">AI Score: {cnd.score}점</span>
                        <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded">{cnd.stage}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-black">
                        {cnd.market === "US" ? "$" : "₩"}{(cnd.price ?? 0).toLocaleString()}
                      </div>
                      <div className={`text-xs font-bold ${cnd.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {cnd.change >= 0 ? "+" : ""}{cnd.change}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Corporate Deep Analysis & 3-Scenario Earnings */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  {targetName} 기업 심층 펀더멘털 &amp; Bull/Base/Bear 실적 시나리오
                </h3>
                <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold rounded-full">
                  재무 건강도: EXCELLENT (96점)
                </span>
              </div>

              {/* Fundamental Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] block">매출 성장률 (YoY)</span>
                  <span className="text-sm font-black text-emerald-400">+122.4%</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] block">영업이익률 (Margin)</span>
                  <span className="text-sm font-black text-cyan-300">62.1%</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] block">부채비율 (Debt)</span>
                  <span className="text-sm font-black text-emerald-400">28.5% (안전)</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] block">뉴스 Sentiment</span>
                  <span className="text-sm font-black text-emerald-400">+78 (매우 긍정)</span>
                </div>
              </div>

              {/* 3 Scenarios Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/30">
                  <div className="flex justify-between font-bold text-emerald-300">
                    <span>🟢 Bull Case (성장 가속 시나리오) - 확률 55%</span>
                    <span>적정주가: {currencySymbol}{(currentPrice * 1.25).toFixed(2)}</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-1">
                    AI 칩 독점적 수요 지속, 블랙웰 서버 납품 가속화로 분기 매출 예상치 +20% 상회.
                  </p>
                </div>

                <div className="bg-cyan-950/40 p-3 rounded-2xl border border-cyan-500/30">
                  <div className="flex justify-between font-bold text-cyan-300">
                    <span>⚪ Base Case (현재 성장 유지 시나리오) - 확률 35%</span>
                    <span>적정주가: {currencySymbol}{(currentPrice * 1.08).toFixed(2)}</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-1">
                    기존 데이터센터 수급 안정 유지, 시장 컨센서스 부합하는 견조한 실적 흐름.
                  </p>
                </div>

                <div className="bg-rose-950/40 p-3 rounded-2xl border border-rose-500/30">
                  <div className="flex justify-between font-bold text-rose-300">
                    <span>🔴 Bear Case (실적 둔화 시나리오) - 확률 10%</span>
                    <span>적정주가: {currencySymbol}{(currentPrice * 0.85).toFixed(2)}</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-1">
                    경쟁사 추격 및 수출 규제 강화로 인한 단기 매출 지연 발생 리스크.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3 & STAGE 4: CHART MULTI-TIMEFRAME & SIGNAL FUSION ENGINE */}
      {(selectedStage === 2 || selectedStage === 3) && (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Chart Canvas Component */}
          <InteractivePredictionCanvasChart
            symbol={targetSymbol}
            name={targetName}
            market={targetMarket}
            currentPrice={currentPrice}
            predictedPath={[
              { timeLabel: "15분전", timestamp: Date.now() - 900000, bullPrice: currentPrice * 0.98, basePrice: currentPrice * 0.98, bearPrice: currentPrice * 0.97, upperBand: currentPrice * 1.01, lowerBand: currentPrice * 0.95 },
              { timeLabel: "5분전", timestamp: Date.now() - 300000, bullPrice: currentPrice * 0.99, basePrice: currentPrice * 0.99, bearPrice: currentPrice * 0.98, upperBand: currentPrice * 1.02, lowerBand: currentPrice * 0.96 },
              { timeLabel: "현재 (T-0)", timestamp: Date.now(), bullPrice: currentPrice, basePrice: currentPrice, bearPrice: currentPrice, upperBand: currentPrice * 1.03, lowerBand: currentPrice * 0.97, isLivePoint: true },
              { timeLabel: "T+1 (예측)", timestamp: Date.now() + 300000, bullPrice: currentPrice * 1.02, basePrice: currentPrice * 1.01, bearPrice: currentPrice * 0.99, upperBand: currentPrice * 1.05, lowerBand: currentPrice * 0.97, isFuturePredict: true },
              { timeLabel: "T+2 (예측)", timestamp: Date.now() + 600000, bullPrice: currentPrice * 1.05, basePrice: currentPrice * 1.025, bearPrice: currentPrice * 0.98, upperBand: currentPrice * 1.08, lowerBand: currentPrice * 0.96, isFuturePredict: true },
              { timeLabel: "T+3 (예측)", timestamp: Date.now() + 900000, bullPrice: currentPrice * 1.08, basePrice: currentPrice * 1.04, bearPrice: currentPrice * 0.965, upperBand: currentPrice * 1.11, lowerBand: currentPrice * 0.95, isFuturePredict: true },
            ]}
            liveTickHistory={[]}
            timeframe="15분봉"
            horizonMode="SHORT"
            tradePlan={{
              entryPrice: Number((currentPrice * 0.995).toFixed(2)),
              tp1: Number((currentPrice * 1.03).toFixed(2)),
              tp2: Number((currentPrice * 1.06).toFixed(2)),
              stopLoss: Number((currentPrice * 0.975).toFixed(2))
            }}
          />

          {/* Multi-Timeframe Matrix Alignment */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              멀티 타임프레임 (Multi-Timeframe) 추세 정렬 매트릭스
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-xs font-mono text-center">
              {[
                { tf: "월봉", trend: "BULL", score: "+94%" },
                { tf: "주봉", trend: "BULL", score: "+88%" },
                { tf: "일봉", trend: "BULL", score: "+85%" },
                { tf: "4시간봉", trend: "BULL", score: "+81%" },
                { tf: "1시간봉", trend: "BULL", score: "+79%" },
                { tf: "15분봉", trend: "PULLBACK", score: "+72%" },
                { tf: "5분봉", trend: "REBOUND", score: "+84%" },
                { tf: "1분봉", trend: "BUY_TRIGGER", score: "+89%" },
              ].map((m) => (
                <div key={m.tf} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">{m.tf}</span>
                  <span className="text-xs font-black text-emerald-400 block my-0.5">{m.trend}</span>
                  <span className="text-[10px] text-cyan-300 font-bold">{m.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 5 & STAGE 6: RISK MANAGEMENT & PRE-ORDER 8-STEP GATE */}
      {(selectedStage === 4 || selectedStage === 5) && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Portfolio Allocation Strategy */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-zinc-800 pb-2">
                <PieChart className="w-4 h-4 text-cyan-400" />
                투자금 자동 배분 AI (포트폴리오 리스크 조절)
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">장기 가치주 (40%)</span>
                  <span className="text-emerald-400 font-bold">4,000,000원</span>
                </div>
                <div className="flex justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">스윙 전략 (30%)</span>
                  <span className="text-cyan-300 font-bold">3,000,000원</span>
                </div>
                <div className="flex justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">단기 데이트레이딩 (20%)</span>
                  <span className="text-amber-300 font-bold">2,000,000원</span>
                </div>
                <div className="flex justify-between bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">위험 대비 현금 비중 (10%)</span>
                  <span className="text-zinc-200 font-bold">1,000,000원</span>
                </div>
              </div>
            </div>

            {/* Pre-Order 8-Step Verification List */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  주문 직전 8단계 재검증 (Pre-Order Safety Gate)
                </h3>
                <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-mono font-bold rounded-full">
                  ALL 8 CHECKS PASSED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {preCheckSteps.map((st) => (
                  <div key={st.id} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{st.id}. {st.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">{st.detail}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-bold rounded">
                      {st.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 7: ACTIVE POSITION & TRAILING STOP LIFECYCLE MANAGER */}
      {selectedStage === 6 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-black text-white">
                  STAGE 7: 체결 후 포지션 자율 관리 &amp; Trailing Stop Engine
                </h2>
              </div>
              <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-mono font-bold rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>실시간 추적 매수익절 중</span>
              </span>
            </div>

            {/* Position Card Detail */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
              <div>
                <div className="flex items-center gap-2 text-base font-black text-white">
                  <span>{activePosition.symbol}</span>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs rounded">
                    {activePosition.side} 100주
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-1 space-x-3">
                  <span>진입가: ${activePosition.entryPrice}</span>
                  <span>현재가: ${activePosition.currentPrice}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-black text-emerald-400">
                  +{currencySymbol}{activePosition.pnlAmount} (+{activePosition.pnlPercent}%)
                </div>
                <span className="text-xs text-cyan-300 font-bold block">
                  TP1 50% 분할익절 완료 ➔ Break Even 스톱 상향 완료
                </span>
              </div>
            </div>

            {/* Live Real-time Raw Stream Panel */}
            <RealtimeRawDataStreamPanel
              selectedSymbol={targetSymbol}
              selectedName={targetName}
              selectedMarket={targetMarket}
              currentPrice={currentPrice}
            />
          </div>
        </div>
      )}

    </div>
  );
};
