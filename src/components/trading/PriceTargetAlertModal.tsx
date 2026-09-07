import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Volume2, 
  VolumeX, 
  Monitor, 
  Sparkles, 
  AlertCircle,
  Search,
  CheckCircle2,
  SlidersHorizontal
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { COMPREHENSIVE_STOCK_INDEX, resolveStockName } from "../../lib/stockDictionary";
import { thresholdAlertEngine } from "../../lib/thresholdAlertEngine";

export interface CustomPriceAlertItem {
  id: string;
  symbol: string;
  name: string;
  market: "KOREA" | "US" | "BTC";
  targetPrice: number;
  condition: "ABOVE_BREAKOUT" | "BELOW_BREAKDOWN" | "PROFIT_TARGET" | "STOP_LOSS";
  initialPrice: number;
  createdAt: string;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
  note?: string;
}

const LOCAL_STORAGE_KEY = "aistock_custom_price_alerts_v1";

export const PriceTargetAlertModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { addToast, selectedSymbol } = useApp();

  const [alerts, setAlerts] = useState<CustomPriceAlertItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: "alert-1",
        symbol: "005930",
        name: "삼성전자",
        market: "KOREA",
        targetPrice: 75000,
        condition: "ABOVE_BREAKOUT",
        initialPrice: 68500,
        createdAt: "2026-08-24 09:00",
        isActive: true,
        isTriggered: false,
        note: "상단 볼린저밴드 돌파 시 매수 실행"
      },
      {
        id: "alert-2",
        symbol: "000660",
        name: "SK하이닉스",
        market: "KOREA",
        targetPrice: 200000,
        condition: "PROFIT_TARGET",
        initialPrice: 188500,
        createdAt: "2026-08-24 09:15",
        isActive: true,
        isTriggered: false,
        note: "1차 익절 목표 도달 알림"
      },
      {
        id: "alert-3",
        symbol: "BTC",
        name: "비트코인",
        market: "BTC",
        targetPrice: 100000000,
        condition: "ABOVE_BREAKOUT",
        initialPrice: 92450000,
        createdAt: "2026-08-24 09:30",
        isActive: true,
        isTriggered: false,
        note: "1억원 돌파 신고가 랠리 모니터링"
      }
    ];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [targetSymbol, setTargetSymbol] = useState(selectedSymbol || "005930");
  const [targetPriceInput, setTargetPriceInput] = useState<number>(75000);
  const [conditionInput, setConditionInput] = useState<CustomPriceAlertItem["condition"]>("ABOVE_BREAKOUT");
  const [noteInput, setNoteInput] = useState("");
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(() => {
    return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied";
  });
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "ADD" | "TRIGGERED">("ACTIVE");

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.error(e);
    }
  }, [alerts]);

  useEffect(() => {
    if (selectedSymbol) {
      setTargetSymbol(selectedSymbol);
      const match = COMPREHENSIVE_STOCK_INDEX.find(s => s.symbol.toUpperCase() === selectedSymbol.toUpperCase());
      if (match) {
        setTargetPriceInput(Math.round(match.price * 1.05));
      }
    }
  }, [selectedSymbol]);

  if (!isOpen) return null;

  const handleRequestDesktopPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setDesktopPermission(perm);
      if (perm === "granted") {
        addToast({
          type: "SUCCESS",
          title: "🔔 데스크톱 푸시 알림 허용됨",
          message: "목표 가격 도달 시 시스템 푸시 알림이 발송됩니다."
        });
      }
    }
  };

  const handleAddAlert = () => {
    const cleanSym = targetSymbol.trim().toUpperCase();
    if (!cleanSym) {
      addToast({ type: "ERROR", title: "종목 입력 오류", message: "알람을 설정할 종목 코드를 입력해 주세요." });
      return;
    }
    if (!targetPriceInput || targetPriceInput <= 0) {
      addToast({ type: "ERROR", title: "목표가 입력 오류", message: "올바른 목표 가격을 입력해 주세요." });
      return;
    }

    const matchIndex = COMPREHENSIVE_STOCK_INDEX.find(s => s.symbol.toUpperCase() === cleanSym);
    const isCrypto = ["BTC", "ETH", "SOL", "XRP", "DOGE"].includes(cleanSym) || cleanSym.startsWith("KRW-");
    const isUS = matchIndex?.market === "US" || (!/^\d{6}$/.test(cleanSym) && !isCrypto);
    const marketType: "KOREA" | "US" | "BTC" = isCrypto ? "BTC" : isUS ? "US" : "KOREA";
    const nameResolved = matchIndex?.name || resolveStockName(cleanSym, cleanSym, marketType);
    const currentPrice = matchIndex?.price || (isCrypto ? 90000000 : isUS ? 150 : 50000);

    const newAlert: CustomPriceAlertItem = {
      id: `alert-${Date.now()}`,
      symbol: cleanSym,
      name: nameResolved,
      market: marketType,
      targetPrice: Number(targetPriceInput),
      condition: conditionInput,
      initialPrice: currentPrice,
      createdAt: new Date().toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
      isActive: true,
      isTriggered: false,
      note: noteInput || `${nameResolved} 목표가 ${(targetPriceInput ?? 0).toLocaleString()}${isUS ? "$" : "원"} 설정`
    };

    setAlerts(prev => [newAlert, ...prev]);
    setNoteInput("");
    setActiveTab("ACTIVE");

    addToast({
      type: "SUCCESS",
      title: `🔔 ${nameResolved} 매매 알람 등록 완료`,
      message: `목표가 ${(targetPriceInput ?? 0).toLocaleString()}${isUS ? "$" : "원"} (${conditionInput === "ABOVE_BREAKOUT" ? "상승 돌파 시" : "하향 이탈 시"}) 푸시 알림 감시 시작`
    });
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    addToast({ type: "INFO", title: "알람 삭제", message: "해당 알람 설정이 삭제되었습니다." });
  };

  const handleToggleAlertActive = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const handleTriggerTest = (alertItem: CustomPriceAlertItem) => {
    thresholdAlertEngine.playAlertSound("PROFIT");
    if (desktopPermission === "granted" && "Notification" in window) {
      new Notification(`[AISTOCK 24] 🎯 ${alertItem.name} 목표가 도달!`, {
        body: `목표가 ${(alertItem.targetPrice ?? 0).toLocaleString()}원 도달. 실시간 모의자산 매매 및 알림 트리거 완료!`,
        icon: "/icon.png"
      });
    }

    setAlerts(prev => prev.map(a => a.id === alertItem.id ? {
      ...a,
      isTriggered: true,
      triggeredAt: new Date().toLocaleTimeString("ko-KR"),
      triggeredPrice: alertItem.targetPrice
    } : a));

    addToast({
      type: "SUCCESS",
      title: `🎯 [푸시 알림 감지] ${alertItem.name} ${(alertItem.targetPrice ?? 0).toLocaleString()}원 도달`,
      message: alertItem.note || "목표 조건이 충족되어 매매 알람 및 시뮬레이션 푸시가 전송되었습니다."
    });
  };

  const activeAlerts = alerts.filter(a => !a.isTriggered);
  const triggeredAlerts = alerts.filter(a => a.isTriggered);

  const getConditionLabel = (cond: CustomPriceAlertItem["condition"]) => {
    switch (cond) {
      case "ABOVE_BREAKOUT": return { label: "🚀 상승 돌파 (Breakout)", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
      case "BELOW_BREAKDOWN": return { label: "📉 하향 이탈 (Breakdown)", color: "text-rose-600 bg-rose-50 border-rose-200" };
      case "PROFIT_TARGET": return { label: "🎯 목표가 달성 (Take Profit)", color: "text-purple-600 bg-purple-50 border-purple-200" };
      case "STOP_LOSS": return { label: "🛡️ 손절선 도달 (Stop Loss)", color: "text-amber-600 bg-amber-50 border-amber-200" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-400">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>실시간 주가 지정가 매매 알람 설정</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-300 font-mono">
                  PUSH NOTIFICATION
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                특정 목표가, 상승 돌파, 하향 이탈 시 실시간 OS 데스크톱 푸시 및 음향 경보 트리거
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Permission Alert Bar */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-slate-600" />
            <span>
              OS 데스크톱 알림 권한:{" "}
              <strong className={`font-mono ${desktopPermission === 'granted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {desktopPermission === 'granted' ? '허용됨 (Active)' : '미허용 (권한 승인 필요)'}
              </strong>
            </span>
          </div>

          {desktopPermission !== "granted" ? (
            <button
              onClick={handleRequestDesktopPermission}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
            >
              알림 권한 즉시 허용
            </button>
          ) : (
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ✓ 백그라운드 실시간 감지 중
            </span>
          )}
        </div>

        {/* Tab Controls */}
        <div className="flex items-center border-b border-slate-200 px-5 bg-slate-50">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ACTIVE"
                ? "border-blue-600 text-blue-600 bg-white font-black"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>감시 중인 알림 ({activeAlerts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ADD")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ADD"
                ? "border-blue-600 text-blue-600 bg-white font-black"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>신규 지정가 알림 신동</span>
          </button>

          <button
            onClick={() => setActiveTab("TRIGGERED")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "TRIGGERED"
                ? "border-blue-600 text-blue-600 bg-white font-black"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>발생 완료 히스토리 ({triggeredAlerts.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: ACTIVE ALERTS LIST */}
          {activeTab === "ACTIVE" && (
            <div className="space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2 text-slate-400 text-xs">
                  <Bell className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-600">현재 등록된 활성 매매 알림이 없습니다.</p>
                  <p>상단 '신규 지정가 알림 신동' 탭을 눌러 목표 가격을 등록해 보세요.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeAlerts.map((item, idx) => {
                    const condInfo = getConditionLabel(item.condition);
                    const isUS = item.market === "US";
                    const unit = isUS ? "$" : "원";

                    return (
                      <div
                        key={`${item.id}_${idx}`}
                        className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          item.isActive ? "bg-white border-slate-200 shadow-xs hover:border-blue-300" : "bg-slate-50 border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">
                              {item.symbol}
                            </span>
                            <span className="text-sm font-black text-slate-900">{item.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${condInfo.color}`}>
                              {condInfo.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 font-mono pt-1">
                            <span>등록가: {(item.initialPrice ?? 0).toLocaleString()}{unit}</span>
                            <span>→</span>
                            <span className="text-blue-600 font-black text-sm">
                              목표가: {(item.targetPrice ?? 0).toLocaleString()}{unit}
                            </span>
                          </div>

                          {item.note && (
                            <p className="text-[11px] text-slate-500 font-sans mt-1">
                              💡 Memo: {item.note}
                            </p>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            onClick={() => handleTriggerTest(item)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition cursor-pointer"
                            title="알림 트리거 테스트"
                          >
                            테스트 트리거
                          </button>

                          <button
                            onClick={() => handleToggleAlertActive(item.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {item.isActive ? "감시 중" : "일시정지"}
                          </button>

                          <button
                            onClick={() => handleDeleteAlert(item.id)}
                            className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD NEW PRICE ALERT */}
          {activeTab === "ADD" && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>신규 종목 지정가 매매 알람 등록</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                {/* Stock Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    감시 종목 선택 (티커/종목명)
                  </label>
                  <select
                    value={targetSymbol}
                    onChange={(e) => {
                      const sym = e.target.value;
                      setTargetSymbol(sym);
                      const match = COMPREHENSIVE_STOCK_INDEX.find(s => s.symbol.toUpperCase() === sym.toUpperCase());
                      if (match) setTargetPriceInput(Math.round(match.price * 1.05));
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="005930">005930 - 삼성전자 (KOSPI)</option>
                    <option value="000660">000660 - SK하이닉스 (KOSPI)</option>
                    <option value="005380">005380 - 현대차 (KOSPI)</option>
                    <option value="068270">068270 - 셀트리온 (KOSPI)</option>
                    <option value="247540">247540 - 에코프로비엠 (KOSDAQ)</option>
                    <option value="BTC">BTC - 비트코인 (업비트)</option>
                    <option value="ETH">ETH - 이더리움 (업비트)</option>
                    <option value="NVDA">NVDA - 엔비디아 (US)</option>
                    <option value="TSLA">TSLA - 테슬라 (US)</option>
                    <option value="AAPL">AAPL - 애플 (US)</option>
                  </select>
                </div>

                {/* Condition Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    알림 감지 조건 (Condition)
                  </label>
                  <select
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ABOVE_BREAKOUT">🚀 상향 돌파 (Breakout)</option>
                    <option value="BELOW_BREAKDOWN">📉 하향 이탈 (Breakdown)</option>
                    <option value="PROFIT_TARGET">🎯 목표가 달성 (Take Profit)</option>
                    <option value="STOP_LOSS">🛡️ 손절선 도달 (Stop Loss)</option>
                  </select>
                </div>

                {/* Target Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    목표 가격 (Target Price)
                  </label>
                  <input
                    type="number"
                    value={targetPriceInput}
                    onChange={(e) => setTargetPriceInput(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 75000"
                  />
                </div>

                {/* Note/Memo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    매매 메모/사유 (선택)
                  </label>
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                    placeholder="예: 20일선 골든크로스 돌파 시 즉시 매수"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleAddAlert}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>지정가 매매 알람 등록 및 감시 시작</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TRIGGERED HISTORY */}
          {activeTab === "TRIGGERED" && (
            <div className="space-y-2.5">
              {triggeredAlerts.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                  발생한 알림 히스토리가 없습니다.
                </div>
              ) : (
                triggeredAlerts.map((item, idx) => (
                  <div key={`${item.id}_${idx}`} className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-emerald-950 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{item.name} ({item.symbol})</span>
                        <span className="text-[10px] font-mono text-emerald-700">
                          {item.triggeredAt || "방금 전"} 트리거됨
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        목표가 {(item.targetPrice ?? 0).toLocaleString()}원 도달 알림 발송 완료
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteAlert(item.id)}
                      className="text-rose-600 hover:underline text-[11px] font-bold cursor-pointer"
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            * 백그라운드 소켓 호가 연동으로 설정 가격 도달 즉시 푸시 알림이 발송됩니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
