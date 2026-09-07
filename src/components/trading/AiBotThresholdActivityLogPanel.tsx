import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Bot,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Trash2,
  Download,
  CheckCircle2,
  Sliders,
  Zap
} from "lucide-react";

export interface BotThresholdLogEntry {
  id: string;
  timestamp: string;
  botId: string;
  botName: string;
  action: "BUY" | "SELL" | "THRESHOLD_ADAPTATION";
  isThresholdTriggered: boolean; // Explicitly true when AI threshold change caused buy/sell
  symbol: string;
  stockName: string;
  price: number;
  quantity: number;
  totalAmount: number;
  thresholdBefore: string; // e.g. "익절 +8.0% / 손절 -2.5%"
  thresholdAfter: string;  // e.g. "익절 +12.0% / 손절 -1.8%"
  reason: string; // Detailed trigger reason
}

const STORAGE_KEY_THRESHOLD_LOGS = "ai_bot_threshold_activity_logs_v2";

const INITIAL_DEMO_LOGS: BotThresholdLogEntry[] = [
  {
    id: "log-101",
    timestamp: "10:42:18",
    botId: "bot_small_cap_momentum",
    botName: "소형주 변동성 알파 봇",
    action: "SELL",
    isThresholdTriggered: true,
    symbol: "012450",
    stockName: "한화에어로스페이스",
    price: 312000,
    quantity: 15,
    totalAmount: 4680000,
    thresholdBefore: "목표익절 +8.5% / 손절 -3.5%",
    thresholdAfter: "AI 목표익절 +12.0% 상향 수정",
    reason: "🤖 [AI 임계값 확장 연동] 강세장 국면에서 목표익절이 +12.0%로 상향 조정되어 상방 목표가 312,000원 돌파 매도 분할 실현"
  },
  {
    id: "log-102",
    timestamp: "10:35:04",
    botId: "bot_m7_tech",
    botName: "미국 빅테크 M7 모멘텀 봇",
    action: "BUY",
    isThresholdTriggered: true,
    symbol: "277810",
    stockName: "NVDA 2X Bull",
    price: 145000,
    quantity: 30,
    totalAmount: 4350000,
    thresholdBefore: "최소 AI 신뢰점수 85점",
    thresholdAfter: "신뢰점수 80점으로 수급 추종 완화",
    reason: "🤖 [AI 신뢰 임계값 조정] 상승 모멘텀 지속으로 최소 신뢰점수가 80점으로 완화되어 조건 만족 후 즉시 매수 체결"
  },
  {
    id: "log-103",
    timestamp: "10:18:55",
    botId: "bot_crypto_quant",
    botName: "가상자산 24h 퀀트 봇",
    action: "SELL",
    isThresholdTriggered: true,
    symbol: "BTC",
    stockName: "비트코인",
    price: 135400000,
    quantity: 0.05,
    totalAmount: 6770000,
    thresholdBefore: "손절선 -3.0%",
    thresholdAfter: "고변동성 대비 손절선 -1.8% 타이트 보정",
    reason: "⚡ [AI 손절선 동적 축소] 변동성 파동 급증에 따라 AI 손절선이 -1.8%로 보정되었으며, 하방 이탈 터치로 즉시 방어 매도 완료"
  },
  {
    id: "log-104",
    timestamp: "09:50:12",
    botId: "bot_large_cap_swing",
    botName: "대형주 저변동성 퀀트 봇",
    action: "BUY",
    isThresholdTriggered: false,
    symbol: "005930",
    stockName: "삼성전자",
    price: 78500,
    quantity: 50,
    totalAmount: 3925000,
    thresholdBefore: "익절 +5.5% / 손절 -1.8%",
    thresholdAfter: "유지 중",
    reason: "정상 퀀트 알고리즘 20일선 눌림목 조건 부합 매수"
  },
  {
    id: "log-105",
    timestamp: "09:15:30",
    botId: "bot_hft_scalper",
    botName: "HFT 초고속 스캘핑 봇",
    action: "SELL",
    isThresholdTriggered: true,
    symbol: "034020",
    stockName: "두산에너빌리티",
    price: 21500,
    quantity: 200,
    totalAmount: 4300000,
    thresholdBefore: "익절 +3.5%",
    thresholdAfter: "박스권 타이트 익절 +2.8% 하향 적용",
    reason: "🤖 [AI 박스권 임계값 변경] 횡보장 전환 감지로 목표익절이 +2.8%로 자동 조율되어 도달 직후 빠른 스캘핑 익절 매도"
  }
];

export const AiBotThresholdActivityLogPanel: React.FC = () => {
  const [logs, setLogs] = useState<BotThresholdLogEntry[]>([]);
  const [filterMode, setFilterMode] = useState<"ALL" | "THRESHOLD_ONLY" | "BUY" | "SELL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THRESHOLD_LOGS);
      if (saved) {
        setLogs(JSON.parse(saved));
      } else {
        setLogs(INITIAL_DEMO_LOGS);
        localStorage.setItem(STORAGE_KEY_THRESHOLD_LOGS, JSON.stringify(INITIAL_DEMO_LOGS));
      }
    } catch (e) {
      setLogs(INITIAL_DEMO_LOGS);
    }
  }, []);

  // Save to LocalStorage
  const saveLogs = (newLogs: BotThresholdLogEntry[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem(STORAGE_KEY_THRESHOLD_LOGS, JSON.stringify(newLogs));
    } catch (e) {
      console.warn("Storage save error", e);
    }
  };

  const handleClearLogs = () => {
    if (confirm("로그 내역을 초기화하시겠습니까?")) {
      saveLogs([]);
    }
  };

  const handleAddSampleLog = () => {
    const newLog: BotThresholdLogEntry = {
      id: `log-${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
      botId: "bot_custom_ai",
      botName: "AI 수급 분석 봇",
      action: Math.random() > 0.5 ? "BUY" : "SELL",
      isThresholdTriggered: true,
      symbol: "012450",
      stockName: "한화에어로스페이스",
      price: 315000,
      quantity: 10,
      totalAmount: 3150000,
      thresholdBefore: "목표익절 +8.5%",
      thresholdAfter: "AI +12.0% 변동성 확장",
      reason: "🤖 [실시간 AI 임계치 반응] 실시간 변동성 및 수급 스파이크로 조정된 AI 임계값이 즉시 주문을 실행함"
    };
    saveLogs([newLog, ...logs]);
  };

  const filteredLogs = logs.filter(log => {
    if (filterMode === "THRESHOLD_ONLY" && !log.isThresholdTriggered) return false;
    if (filterMode === "BUY" && log.action !== "BUY") return false;
    if (filterMode === "SELL" && log.action !== "SELL") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.stockName.toLowerCase().includes(q) ||
        log.symbol.toLowerCase().includes(q) ||
        log.botName.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs my-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
              AI 봇 자율매매 및 임계값 변동 주문 활동 로그 (Persistent Log)
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
              LOG RECORD ({filteredLogs.length})
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            AI 봇의 익절/손절/신뢰점수 등 임계값 변경이 직접 트리거한 매수/매도 활동 및 자율매매 기록이 영구 저장됩니다.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAddSampleLog}
            className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI 로그 시뮬레이션</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700"
            title="로그 비우기"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="종목, 봇명, 사유 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterMode("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filterMode === "ALL" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            전체 로그
          </button>
          <button
            onClick={() => setFilterMode("THRESHOLD_ONLY")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              filterMode === "THRESHOLD_ONLY" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>AI 임계치 트리거만</span>
          </button>
          <button
            onClick={() => setFilterMode("BUY")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filterMode === "BUY" ? "bg-rose-600 text-white shadow-2xs" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            매수 체결
          </button>
          <button
            onClick={() => setFilterMode("SELL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filterMode === "SELL" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            매도 체결
          </button>
        </div>
      </div>

      {/* Log List Entries */}
      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <Bot className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-500">조건에 부합하는 AI 활동 로그 기록이 없습니다.</p>
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const isBuy = log.action === "BUY";
            return (
              <div
                key={`${log.id}_${idx}`}
                className={`p-3.5 rounded-xl border transition-all duration-200 ${
                  log.isThresholdTriggered
                    ? "bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 border-indigo-200 dark:border-indigo-800/60"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-400 shrink-0">{log.timestamp}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                      {log.botName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 ${
                      isBuy
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                    }`}>
                      {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{isBuy ? "BUY (매수)" : "SELL (매도)"}</span>
                    </span>

                    {log.isThresholdTriggered && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>AI 임계치 트리거 체결</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0">
                    {log.stockName} ({log.symbol}) • {(log.price ?? 0).toLocaleString()}원
                  </div>
                </div>

                {/* Reason detail & Threshold shift badge */}
                <div className="mt-2 text-xs font-sans text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60 leading-relaxed">
                  <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {log.reason}
                  </div>
                  {log.isThresholdTriggered && (
                    <div className="flex items-center gap-3 text-[10px] font-mono text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                      <span>이전 설정: <strong>{log.thresholdBefore}</strong></span>
                      <span>➔</span>
                      <span>AI 변동 적용: <strong className="text-emerald-600 dark:text-emerald-400">{log.thresholdAfter}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
