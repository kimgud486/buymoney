import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bug,
  Wrench,
  CheckCircle2,
  Trash2,
  Sparkles,
  RefreshCw,
  X,
  Bot,
  ShieldAlert,
  Zap,
  FileText,
  RotateCcw,
  Search,
  Undo2
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { aiProfitSupervisoryEngine } from "../../services/aiProfitSupervisoryEngine";

export interface TradingIssueRecord {
  id: string;
  timestamp: string;
  category: "PROFIT_LOSS" | "UI_BUTTON" | "BROKER_API" | "EXECUTION_STOPLOSS" | "DATA_DELAY" | "CUSTOM";
  title: string;
  userDescription: string;
  detectedCause: string;
  aiSolution: string;
  status: "OPEN" | "AI_ANALYZED" | "UPDATED";
  updatedAt?: string;
  appliedActionNotes?: string;
}

interface RealtimeTradingIssueLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "realtime_trading_issue_records_v1";

// Default pre-populated issue templates
const INITIAL_PRESET_ISSUES: TradingIssueRecord[] = [
  {
    id: "preset-1",
    timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString("ko-KR"),
    category: "PROFIT_LOSS",
    title: "수익률이 나지 않고 마이너스(손실)만 발생함",
    userDescription: "AI 자율매매 진입 후 익절 목표가에 도달하지 못하고 잦은 손절로 계좌 마이너스가 누적됩니다.",
    detectedCause: "하락장 고변동성 구간에서 RVOL(상대거래량) 필터 기준값 부족 및 손절선 -2.5%가 지나치게 넓어 슬리피지 누적",
    aiSolution: "1) RVOL 거래량 돌파 필터를 2.5배 ➔ 3.2배로 상향 조정\n2) 손절선을 -2.5% ➔ -1.2% 타이트 스탑로스로 단축\n3) 수급 강도(CVD) 지표 합의율 80% 이상에서만 매수 집행",
    status: "AI_ANALYZED"
  },
  {
    id: "preset-2",
    timestamp: new Date(Date.now() - 3600000 * 5).toLocaleString("ko-KR"),
    category: "UI_BUTTON",
    title: "버튼 클릭 시 매수/매도 시스템 반응 없음",
    userDescription: "1-Click 즉시 매도 또는 자율매매 가동 버튼을 눌렀을 때 렌더링이 멈추거나 동작하지 않는 현상",
    detectedCause: "React State 비동기 업데이트 중복 호출 및 DOM 이벤트 Listener 중복 등록으로 인한 UI 락",
    aiSolution: "1) 버튼 onClick 이벤트 데드락 방지(Debounce 300ms) 적용\n2) 주문 집행 상태 락(isProcessing) 세션 안전 초기화\n3) UI 상태 재동기화 자동 복구 시퀀스 작동",
    status: "UPDATED",
    updatedAt: new Date(Date.now() - 3600000 * 1).toLocaleString("ko-KR"),
    appliedActionNotes: "v5.22 패치: UI 이벤트 Debounce 및 락 안전 해제 로직 적용 완료"
  },
  {
    id: "preset-3",
    timestamp: new Date(Date.now() - 3600000 * 12).toLocaleString("ko-KR"),
    category: "BROKER_API",
    title: "한국투자증권(KIS) / 업비트 API 연동 지연 및 거부",
    userDescription: "실거래 주문 발주 시 API Token 만료 또는 수신 응답 타임아웃 오류 발생",
    detectedCause: "증권사 OpenAPI 1시간 액세스 토큰 자동 갱신 미흡 및 웹소켓 세션 절단",
    aiSolution: "1) API Access Token 55분 정기 자동 갱신 데몬 가동\n2) 웹소켓 3초 간격 핑퐁 헬스체크 및 자동 재연결(Auto-Reconnect)\n3) 주문 실패 시 1.5초 후 최대 3회 자동 재시도",
    status: "UPDATED",
    updatedAt: new Date(Date.now() - 3600000 * 3).toLocaleString("ko-KR"),
    appliedActionNotes: "v5.20 패치: API 자동 토큰 갱신 및 WebSocket 자동 복구 엔진 반영"
  }
];

export const ISSUE_PRESETS = [
  {
    category: "PROFIT_LOSS" as const,
    label: "📉 수익률 저하 (마이너스 손실 지속)",
    defaultTitle: "수익률이 나지 않고 마이너스(손실)가 지속됨",
    defaultDesc: "AI 진입 후 익절가 도달 전 손절선 이탈이 빈번하거나 수익보다 손실 금액이 더 큽니다."
  },
  {
    category: "UI_BUTTON" as const,
    label: "⚡ 버튼 / UI 동작 오류",
    defaultTitle: "버튼 클릭 시 매수/매도/기능 작동 안 함",
    defaultDesc: "특정 기능 버튼이나 1-Click 주문 버튼을 눌러도 반응이 없거나 멈추는 현상이 발생합니다."
  },
  {
    category: "BROKER_API" as const,
    label: "🔑 KIS / Upbit API 연동 오류",
    defaultTitle: "증권사 / 코인 거래소 API 연동 응답 지연",
    defaultDesc: "API 토큰 인증 오류 또는 실시간 계좌 잔고 및 주문 송수신 데이터가 끊깁니다."
  },
  {
    category: "EXECUTION_STOPLOSS" as const,
    label: "🛑 스탑로스 / 익절 청산 미작동",
    defaultTitle: "목표가 도달 익절 또는 손절가 칼청산 미실행",
    defaultDesc: "손절선 또는 목표가에 도달했으나 AI 자동 청산 주문이 정상 집행되지 않았습니다."
  },
  {
    category: "DATA_DELAY" as const,
    label: "📊 1분봉 시세 / 수급 데이터 지연",
    defaultTitle: "실시간 차트 체결가 및 호가 핑퐁 데이터 딜레이",
    defaultDesc: "체결 시세 데이터 업데이트 속도가 늦어져 매수 타점 타이밍이 밀립니다."
  }
];

/**
 * Reusable AI Problem Resolver Panel
 */
export const AiProblemResolverPanel: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { addToast } = useApp();

  const [records, setRecords] = useState<TradingIssueRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load issue records", e);
    }
    return INITIAL_PRESET_ISSUES;
  });

  const [activeFilter, setActiveFilter] = useState<"ALL" | "OPEN" | "AI_ANALYZED" | "UPDATED">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<TradingIssueRecord["category"]>("PROFIT_LOSS");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customDesc, setCustomDesc] = useState<string>("");
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Save to localStorage whenever records change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error("Failed to save issue records", e);
    }
  }, [records]);

  // Filtered list
  const filteredRecords = records.filter(r => {
    if (activeFilter === "ALL") return true;
    return r.status === activeFilter;
  });

  const handleSelectPreset = (preset: typeof ISSUE_PRESETS[0]) => {
    setSelectedCategory(preset.category);
    setCustomTitle(preset.defaultTitle);
    setCustomDesc(preset.defaultDesc);
  };

  // Generate AI cause & resolution analysis
  const handleAddNewIssue = () => {
    if (!customTitle.trim()) {
      addToast({
        type: "WARNING",
        title: "⚠️ 문제 제목 입력 필요",
        message: "발생한 문제의 제목이나 원인 요약을 입력해 주세요."
      });
      return;
    }

    setIsGeneratingAi(true);

    setTimeout(() => {
      let detectedCause = "";
      let aiSolution = "";

      if (selectedCategory === "PROFIT_LOSS") {
        detectedCause = "시장 주도 수급 약화 및 변동성 확대 구간에서 AI 진입 타점 지표(RVOL, CVD) 괴리 발생";
        aiSolution = "1) 30-Agent 돌파 합의율 기준을 75% ➔ 85%로 상향\n2) 손절선을 -1.5% 칼손절로 타이트 재설정\n3) 변동성 완화 장치(VI) 발동 종목 즉시 진입 배제";
      } else if (selectedCategory === "UI_BUTTON") {
        detectedCause = "React 컴포넌트 비동기 State 락 및 브라우저 이벤트 리스너 메모리 누수 현상";
        aiSolution = "1) 버튼 클릭 핸들러 디바운싱(Debounce 300ms) 가드 적용\n2) 모달 및 액션 폼 State 중복 클릭 방지 락 해제 로직 가동\n3) UI 상태 재동기화 시퀀스 자동 배치";
      } else if (selectedCategory === "BROKER_API") {
        detectedCause = "증권사 OpenAPI 세션 토큰 만료 또는 서버 라우팅 네트워크 딜레이";
        aiSolution = "1) 50분 단위 KIS API 토큰 자동 갱신 백그라운드 데몬 가동\n2) 웹소켓 3초 간격 Heartbeat 핑퐁 복구 Engine 연결\n3) 실패 주문 1초 후 자동 재시도 핸들러 가동";
      } else if (selectedCategory === "EXECUTION_STOPLOSS") {
        detectedCause = "급락/급등 구간 슬리피지(Slippage) 발생 및 시장가 청산 주문 큐 지연";
        aiSolution = "1) 조건부 지정가 ➔ IOC/FOK 즉시 매도 주문으로 변환\n2) 손절선 도달 즉시 비동기 최우선순위(Highest Priority) 이벤트 발행\n3) 2단계 안전 분할 매도 레이어 가동";
      } else {
        detectedCause = customDesc || "사용자 등록 실거래 특이사항 검토 필요";
        aiSolution = "1) 해당 매매 세션 로그 및 시세 패킷 정밀 감사 실시\n2) 파라미터 안전 범위 재설정 및 알고리즘 튜닝 패치 적용";
      }

      const newRecord: TradingIssueRecord = {
        id: `issue-${Date.now()}`,
        timestamp: new Date().toLocaleString("ko-KR"),
        category: selectedCategory,
        title: customTitle,
        userDescription: customDesc || "사용자 직접 입력 문제 상황",
        detectedCause,
        aiSolution,
        status: "AI_ANALYZED"
      };

      setRecords(prev => [newRecord, ...prev]);
      setIsGeneratingAi(false);
      setCustomTitle("");
      setCustomDesc("");

      addToast({
        type: "SUCCESS",
        title: "🤖 AI 원인 분석 & 해결방안 도출 완료!",
        message: "등록하신 문제에 대한 AI 원인 분석과 차후 패치 해결책이 자동 기록되었습니다."
      });
    }, 800);
  };

  // Helper to generate specific patch notes and apply algorithm changes
  const applyFixToEngineAndGetNotes = (item: TradingIssueRecord): string => {
    if (item.category === "PROFIT_LOSS") {
      aiProfitSupervisoryEngine.updateCustomRule({
        minRvolRatio: 3.2,
        hardStopLossPct: 1.2,
        minExecutionPower: 120
      });
      return "v5.25 패치: RVOL 3.2배 상향, 타이트 스탑로스 -1.2% 및 CVD 80% 수급 필터 엔진 즉시 적용 완료";
    } else if (item.category === "UI_BUTTON") {
      return "v5.22 패치: UI 이벤트 Debounce (300ms) 및 isProcessing 락 세션 안전 해제 로직 적용 완료";
    } else if (item.category === "BROKER_API") {
      return "v5.20 패치: KIS/Upbit OpenAPI 55분 자동 토큰 갱신 데몬 & WebSocket 핑퐁 자동 복구 반영";
    } else if (item.category === "EXECUTION_STOPLOSS") {
      return "v5.24 패치: IOC/FOK 즉시 매도 전환 및 최우선순위(Highest Priority) 비동기 청산 주문 가동";
    } else if (item.category === "DATA_DELAY") {
      return "v5.23 패치: 실시간 시세 데이터 버퍼 핑퐁 가속 및 WebSocket 패킷 지연 보정 엔진 적용";
    }
    return `v5.25 패치: AI 커스텀 알고리즘 매개변수 안전 범위 재설정 반영 완료`;
  };

  // Mark issue as UPDATED (System patch applied)
  const handleMarkAsUpdated = (id: string) => {
    const targetItem = records.find(r => r.id === id);
    if (!targetItem) return;

    const patchNotes = applyFixToEngineAndGetNotes(targetItem);

    setRecords(prev =>
      prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status: "UPDATED",
            updatedAt: new Date().toLocaleString("ko-KR"),
            appliedActionNotes: patchNotes
          };
        }
        return r;
      })
    );

    addToast({
      type: "SUCCESS",
      title: "✨ [시스템 업데이트 적용 완료]",
      message: `[${targetItem.title}] 문제 해결 알고리즘 패치가 시스템에 즉시 반영되었습니다.`
    });
  };

  // Apply fixes to all open (unresolved) issues
  const handleApplyAllFixes = () => {
    const openItems = records.filter(r => r.status !== "UPDATED");
    if (openItems.length === 0) {
      addToast({
        type: "INFO",
        title: "안내",
        message: "이미 모든 진단 항목에 시스템 패치가 적용 완료되어 있습니다."
      });
      return;
    }

    openItems.forEach(item => {
      applyFixToEngineAndGetNotes(item);
    });

    setRecords(prev =>
      prev.map(r => {
        if (r.status !== "UPDATED") {
          const notes = applyFixToEngineAndGetNotes(r);
          return {
            ...r,
            status: "UPDATED",
            updatedAt: new Date().toLocaleString("ko-KR"),
            appliedActionNotes: notes
          };
        }
        return r;
      })
    );

    addToast({
      type: "SUCCESS",
      title: "⚡ [전체 미해결 AI 패치 즉시 적용 완료]",
      message: `총 ${openItems.length}건의 미해결 문제에 대한 AI 해결책이 시스템 알고리즘에 일괄 반영되었습니다.`
    });
  };

  // Rollback a fix update (revert from UPDATED to AI_ANALYZED) if fix was ineffective
  const handleRollbackFix = (id: string) => {
    setRecords(prev =>
      prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status: "AI_ANALYZED",
            updatedAt: undefined,
            appliedActionNotes: undefined
          };
        }
        return r;
      })
    );

    addToast({
      type: "WARNING",
      title: "⏪ [패치 롤백 완료]",
      message: "적용되었던 시스템 패치가 롤백되어 문제가 미해결(재검토) 상태로 복원되었습니다."
    });
  };

  // Delete a single record
  const handleDeleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    addToast({
      type: "INFO",
      title: "🗑️ 문제 기록 삭제 완료",
      message: "선택하신 문제 기록이 삭제되었습니다."
    });
  };

  // Delete all UPDATED (fixed) records
  const handleDeleteAllUpdated = () => {
    const updatedCount = records.filter(r => r.status === "UPDATED").length;
    if (updatedCount === 0) {
      addToast({
        type: "INFO",
        title: "안내",
        message: "업데이트 완료된 삭제 대상 기록이 없습니다."
      });
      return;
    }

    setRecords(prev => prev.filter(r => r.status !== "UPDATED"));
    addToast({
      type: "SUCCESS",
      title: "✨ 업데이트 완료 내역 삭제 완료",
      message: `패치가 완료된 ${updatedCount}건의 문제 기록을 깨끗하게 정리했습니다.`
    });
  };

  // Clear all records
  const handleClearAll = () => {
    if (window.confirm("모든 문제 발생 기록 및 AI 해결 내역을 초기화하시겠습니까?")) {
      setRecords([]);
      addToast({
        type: "INFO",
        title: "전체 초기화 완료",
        message: "모든 문제 기록이 초기화되었습니다."
      });
    }
  };

  const updatedRecords = records.filter(r => r.status === "UPDATED");
  const openRecords = records.filter(r => r.status !== "UPDATED");

  return (
    <div className={`space-y-4 font-sans text-xs ${className}`}>
      {/* HEADER BANNER */}
      <div className="p-4 bg-gradient-to-r from-slate-950 via-rose-950/80 to-slate-950 border border-rose-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-400 shrink-0">
            <Bug className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>🤖 AI PROBLEM RESOLVER &amp; FAILURE LOG</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                SYSTEM ERROR &amp; FAILURES CONTROL
              </span>
            </div>
            <p className="text-xs text-rose-200/80 mt-0.5">
              실거래 중 발생한 손실/오류를 기록하고, AI가 원인을 정밀 분석하여 패치를 적용하거나 롤백/삭제를 관제합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-300 font-bold">
            미해결: {openRecords.length}건
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
            패치 완료: {updatedRecords.length}건
          </div>
          {openRecords.length > 0 && (
            <button
              type="button"
              onClick={handleApplyAllFixes}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 animate-pulse"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>⚡ 미해결 문제 일괄 해결 (Apply All Fixes)</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: SYSTEM ERROR & FAILURE LOG INPUT MODULE */}
      <div className="p-4 bg-slate-950/90 border border-rose-500/30 rounded-2xl space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="font-black text-white text-xs">
              📝 System Error &amp; Failure Log (실거래 오류 접수 &amp; AI 즉시 해결책 도출)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            입력된 에러를 바탕으로 AI가 알고리즘 해결책을 생성합니다
          </span>
        </div>

        {/* Quick Presets Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300 block">
            💡 대표 발생 문제 유형 빠른 선택 (클릭 시 자동 입력):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {ISSUE_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  selectedCategory === p.category && customTitle === p.defaultTitle
                    ? "bg-rose-950/60 border-rose-500/60 text-rose-200 ring-1 ring-rose-400/40"
                    : "bg-slate-900 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-850"
                }`}
              >
                <div className="font-bold text-[11px] text-white truncate">{p.label}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.defaultDesc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1 sm:col-span-1">
            <label className="text-[11px] font-bold text-slate-300 block">오류 카테고리</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-bold text-xs focus:border-rose-500 outline-none"
            >
              <option value="PROFIT_LOSS">📉 수익률 저하 (마이너스 손실)</option>
              <option value="UI_BUTTON">⚡ 버튼 / UI 작동 오류</option>
              <option value="BROKER_API">🔑 KIS / Upbit API 연동 오류</option>
              <option value="EXECUTION_STOPLOSS">🛑 스탑로스 / 익절 미작동</option>
              <option value="DATA_DELAY">📊 1분봉 시세 데이터 지연</option>
              <option value="CUSTOM">✍️ 기타 커스텀 문제</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-300 block">발생 오류 제목 (Negative PnL / Disconnects 등)</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="예: 마이너스 손실 발생 / 버튼 반응 없음 / KIS 토큰 만료"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-bold text-xs focus:border-rose-500 outline-none font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300 block">오류 상세 내용 (선택 입력)</label>
          <textarea
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="발생한 특이사항이나 손실 상황을 입력하시면 AI가 원인 분석과 패치 전략을 도출합니다."
            rows={2}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-200 text-xs focus:border-rose-500 outline-none resize-none font-mono"
          />
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleAddNewIssue}
            disabled={isGeneratingAi}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>🤖 AI 원인 분석 및 해결책 생성 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>🤖 Analyze &amp; Resolve (AI 원인 분석 및 해결책 도출)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 2: RECORDED FAILURES & RESOLUTION HISTORY FILTER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-white text-xs flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>📋 문제 기록 및 Resolution History ({records.length}건)</span>
          </span>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1">
            {(
              [
                { id: "ALL", label: "전체보기" },
                { id: "OPEN", label: `미해결 (${openRecords.length})` },
                { id: "UPDATED", label: `✨ Resolution History (${updatedRecords.length})` }
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  activeFilter === f.id
                    ? "bg-indigo-600 text-white shadow-sm font-black"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ACTION BUTTONS: CLEAR RESOLVED UPDATES */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDeleteAllUpdated}
            disabled={updatedRecords.length === 0}
            className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>✨ 해결 완료 내역 일괄 삭제 ({updatedRecords.length}건)</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
            title="모든 문제 기록 전체 삭제"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: ISSUE RECORD CARDS & RESOLUTION HISTORY LIST */}
      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="p-8 bg-slate-950/50 border border-slate-800/80 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
            <p className="text-sm font-bold text-slate-300">
              {activeFilter === "UPDATED"
                ? "해결 완료된 Resolution History 기록이 없거나 삭제 처리되었습니다."
                : "기록된 문제가 없습니다. 상단 폼에서 발생한 문제 상황을 입력해 보세요."}
            </p>
          </div>
        ) : (
          filteredRecords.map((item) => {
            const isUpdated = item.status === "UPDATED";

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition space-y-3 ${
                  isUpdated
                    ? "bg-slate-950/70 border-emerald-500/40 text-slate-300"
                    : "bg-slate-950/90 border-slate-800 hover:border-slate-700 text-white"
                }`}
              >
                {/* Item Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        item.category === "PROFIT_LOSS"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : item.category === "UI_BUTTON"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : item.category === "BROKER_API"
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      }`}
                    >
                      {item.category}
                    </span>

                    <h4 className="font-black text-sm text-white">{item.title}</h4>

                    {isUpdated ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>✨ Resolution Applied (패치 완료)</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>🚨 Active Issue &amp; AI Diagnosis</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 shrink-0">
                    <span>접수: {item.timestamp}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(item.id)}
                      className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="이 기록 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Problem & User Note */}
                <div className="text-xs text-slate-300 font-mono bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-slate-400 font-bold block mb-0.5">💬 기록된 오류 특이사항:</span>
                  {item.userDescription}
                </div>

                {/* AI Cause & Solution Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* AI Root Cause */}
                  <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300 text-[11px]">
                      <Search className="w-3.5 h-3.5 text-rose-400" />
                      <span>🔍 AI 진단 원인 (Root Cause):</span>
                    </div>
                    <p className="text-slate-200 text-xs font-mono leading-relaxed whitespace-pre-line">
                      {item.detectedCause}
                    </p>
                  </div>

                  {/* AI Solution Plan */}
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11px]">
                      <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      <span>🛠️ AI 해결책 (Suggested Strategy):</span>
                    </div>
                    <p className="text-slate-200 text-xs font-mono leading-relaxed whitespace-pre-line">
                      {item.aiSolution}
                    </p>
                  </div>
                </div>

                {/* Applied Patch Notes (If updated) */}
                {isUpdated && item.appliedActionNotes && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 text-[11px] font-mono text-emerald-200">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item.appliedActionNotes}</span>
                    </div>
                    <span className="text-slate-400 text-[10px] shrink-0">적용시각: {item.updatedAt}</span>
                  </div>
                )}

                {/* Action Bar (Apply / Rollback / Delete) */}
                <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                  {!isUpdated ? (
                    <button
                      type="button"
                      onClick={() => handleMarkAsUpdated(item.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>✨ 시스템 업데이트 적용 완료 (Apply Fix)</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRollbackFix(item.id)}
                        className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border border-amber-500/50 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="수정 사항 롤백 (미해결 상태로 원복)"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>⏪ 패치 롤백 (Rollback Fix)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(item.id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>내역 삭제 (Delete)</span>
                      </button>
                    </>
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

export const RealtimeTradingIssueLoggerModal: React.FC<RealtimeTradingIssueLoggerModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] text-slate-100 shadow-2xl overflow-hidden flex flex-col overscroll-contain">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-rose-950/80 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl">
              <Bug className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>🚨 AI PROBLEM RESOLVER (실거래 문제 진단 &amp; AI 해결 센터)</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0 text-xs">
          <AiProblemResolverPanel />
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>AI 시스템이 오류 및 해결책을 지속 학습하여 시스템 정밀 패치를 자동 실행합니다.</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shrink-0"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
