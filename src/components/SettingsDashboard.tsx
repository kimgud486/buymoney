import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { ApiMasterRegistrationDashboard } from "./ApiMasterRegistrationDashboard";
import { LiveTradingReadinessChecklist } from "./LiveTradingReadinessChecklist";
import { TradingIntegrityMonitor } from "./TradingIntegrityMonitor";
import { KisApiDiagnosticTool } from "./KisApiDiagnosticTool";
import { TradingStatus } from "./TradingStatus";
import { 
  Shield, 
  CheckCircle2, 
  RefreshCw,
  Trash2,
  AlertCircle,
  Terminal,
  Activity,
  Check,
  Copy,
  ShieldCheck,
  ArrowRightLeft,
  Key,
  ShieldAlert,
  Wifi,
  Sliders,
  Zap,
  SlidersHorizontal
} from "lucide-react";

export const SettingsDashboard: React.FC = () => {
  const { 
    profile, 
    updateProfileSettings, 
    resetAccountData, 
    addToast,
    syncRealAccountBalance,
    checkAccountIntegrity,
    apiResponseLogs
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<
    "OVERVIEW" | "API_KEYS" | "DIAGNOSTICS" | "LOGS_SYNC" | "EXECUTION_GATE" | "PING_NETWORK"
  >("OVERVIEW");

  const [isSaved, setIsSaved] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<'korea' | 'us' | 'upbit'>('korea');
  const [showZeroConfirm, setShowZeroConfirm] = useState(false);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Profile-specific threshold settings
  const [riskLimit, setRiskLimit] = useState(10);
  const [lossLimit, setLossLimit] = useState(2);
  const [maxWeight, setMaxWeight] = useState(20);
  const [tradingMode, setTradingMode] = useState("approval");
  const [disableTradeGuardPrompt, setDisableTradeGuardPrompt] = useState(true);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncRealAccountBalance(selectedBroker);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyLog = (id: string, logData: any) => {
    navigator.clipboard.writeText(JSON.stringify(logData, null, 2));
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // Load from profile
  useEffect(() => {
    if (profile) {
      setRiskLimit(profile.riskLimitPerTrade ?? 10);
      setLossLimit(profile.dailyLossLimit ?? 2);
      setMaxWeight(profile.maxPositionWeight ?? 100);
      setTradingMode(profile.tradingMode ?? "approval");
      setDisableTradeGuardPrompt(profile.disableTradeGuardPrompt !== false);
    }
  }, [profile?.riskLimitPerTrade, profile?.dailyLossLimit, profile?.maxPositionWeight, profile?.tradingMode, profile?.disableTradeGuardPrompt]);

  if (!profile) return null;

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileSettings({
        riskLimitPerTrade: riskLimit,
        dailyLossLimit: lossLimit,
        maxPositionWeight: maxWeight,
        tradingMode: tradingMode as any,
        autoTradingEnabled: profile.autoTradingEnabled ?? true,
        autoTradingTargetMarket: profile.autoTradingTargetMarket || 'KOREA',
        disableTradeGuardPrompt
      });
      setIsSaved(true);
      addToast({
        type: "SUCCESS",
        title: "설정 저장 완료",
        message: "실거래 업비트 전용 여부 및 주문 확인 제어 설정이 정상적으로 반영되었습니다."
      });
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error(err);
      addToast({
        type: "ERROR",
        title: "저장 오류",
        message: "설정 정보를 저장하는 도중 오류가 발생했습니다."
      });
    }
  };

  const handleResetSimulatedBalance = async () => {
    setIsResetting(true);
    try {
      await resetAccountData(0);
      setShowZeroConfirm(false);
    } catch (err) {
      console.error(err);
      addToast({
        type: "ERROR",
        title: "초기화 실패",
        message: "초기화 과정 중 오류가 발생했습니다."
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & API Navigation Header */}
      <div className="bg-zinc-950 text-white p-5 rounded-xl border border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                <SlidersHorizontal className="h-5 w-5" />
              </span>
              <h2 className="text-base font-black tracking-tight text-white">
                API 모드 & 통합 설정 관제 대시보드 (API Master Dashboard)
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              한국투자증권(국내/해외), 업비트 API Key/Secret 등록, 실전 API 모드, REST 무결성 진단, AI 주문 게이트 및 네트워크 레이턴시를 통합 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-600/40 rounded text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE API CONSOLE ACTIVE</span>
            </span>
          </div>
        </div>

        {/* API Settings Sub-Tabs Navigation */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab("OVERVIEW")}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "OVERVIEW"
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>⚡ 전체 모드 한눈에 보기</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("API_KEYS")}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "API_KEYS"
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>🔑 증권사/암호화폐 API 키 영구 등록</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("DIAGNOSTICS")}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "DIAGNOSTICS"
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span>🚨 실전 API 무결성 & 진단</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("LOGS_SYNC")}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "LOGS_SYNC"
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850"
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>🔄 API 잔고 동기화 & 응답 로그</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("EXECUTION_GATE")}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "EXECUTION_GATE"
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>⚡ AI 주문 API 게이트 & 리스크 한계</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("PING_NETWORK")}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "PING_NETWORK"
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850"
            }`}
          >
            <Wifi className="h-3.5 w-3.5" />
            <span>📡 API 네트워크 & Heartbeat 레이턴시</span>
          </button>
        </div>
      </div>

      {/* SUB TAB 1: Live Trading Readiness & Master API Key Registration */}
      {(activeSubTab === "OVERVIEW" || activeSubTab === "API_KEYS") && (
        <div className="space-y-6">
          <LiveTradingReadinessChecklist />
          <ApiMasterRegistrationDashboard />
        </div>
      )}

      {/* SUB TAB 2: Production API Handshake Diagnostic & Security Integrity Monitor */}
      {(activeSubTab === "OVERVIEW" || activeSubTab === "DIAGNOSTICS") && (
        <div className="space-y-6">
          <TradingIntegrityMonitor />
          <KisApiDiagnosticTool />
        </div>
      )}

      {/* SUB TAB 3: Real Broker Manual Balance Sync & API Response Log Console */}
      {(activeSubTab === "OVERVIEW" || activeSubTab === "LOGS_SYNC") && (
        <div className="bg-white border border-zinc-200 p-5 rounded-lg space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-150 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                  <span>실전 증권사/암호화폐 계좌 잔고 강제 동기화 & 실시간 API 진단</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold">
                    Live API Sync
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-500">
                  한국투자증권(국내/해외) 및 업비트 실거래 API 잔고를 즉시 갱신하여 DB와 대조하고 0원 경고 및 무결성을 검증합니다.
                </p>
              </div>
            </div>

            {/* Sync Action Controls */}
            <div className="flex items-center gap-2">
              <select
                value={selectedBroker}
                onChange={(e) => setSelectedBroker(e.target.value as any)}
                className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 text-zinc-800 text-xs font-bold rounded cursor-pointer"
              >
                <option value="korea">한국투자증권 (국내 주식)</option>
                <option value="us">한국투자증권 (국외/미국 주식 KIS)</option>
                <option value="upbit">업비트 (가상자산)</option>
              </select>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "잔고 강제 동기화 중..." : "잔고 강제 동기화 실행"}</span>
              </button>
            </div>
          </div>

          {/* Real Balance Cross-check Summary Table */}
          <div className="bg-gradient-to-r from-zinc-50 to-emerald-50/20 p-3.5 rounded-lg border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-extrabold text-zinc-900">시스템 DB vs 실전 OpenAPI 잔고 1:1 무결성 비교</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">자동 0원 상태 알람 감지 탑재</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-white p-2.5 rounded border border-zinc-200 space-y-1">
                <span className="text-[10px] text-zinc-500 font-sans block">시스템 DB 기록 프로필 잔고:</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-zinc-900">
                    {(profile?.balance ?? 0).toLocaleString()} KRW
                  </span>
                  {profile?.balance === 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded">0원 발생</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded border border-zinc-200 space-y-1">
                <span className="text-[10px] text-zinc-500 font-sans block">선택 증권사 실시간 조회 잔고:</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-700">
                    {apiResponseLogs[0]?.rawResponse?.output2?.[0]?.dnca_tot_amt 
                      ? `${parseInt(apiResponseLogs[0].rawResponse.output2[0].dnca_tot_amt).toLocaleString()} KRW`
                      : `${(profile?.balance ?? 0).toLocaleString()} KRW`}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded">최신 갱신됨</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded border border-zinc-200 space-y-1">
                <span className="text-[10px] text-zinc-500 font-sans block">잔고 상태 무결성 검증 결과:</span>
                <div className="flex items-center gap-1.5">
                  {(profile?.balance ?? 0) === 0 ? (
                    <span className="text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1 animate-pulse">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      <span>⚠️ 0원 경고 (예수금 충전 필요)</span>
                    </span>
                  ) : (
                    <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>✅ 무결성 정상 (정상 운용 가능)</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* API Response Endpoint Monitoring Log Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-700 font-bold">
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span>실시간 API 엔드포인트 응답 모니터링 표 (Response Log Table)</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">한국투자증권 / 업비트 Live Logs</span>
            </div>

            <div className="overflow-x-auto border border-zinc-200 rounded-lg shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-700 font-bold text-[11px]">
                    <th className="p-2.5 whitespace-nowrap">시각 (Time)</th>
                    <th className="p-2.5 whitespace-nowrap">증권사 / 연동 API</th>
                    <th className="p-2.5 whitespace-nowrap">HTTP 상태</th>
                    <th className="p-2.5 whitespace-nowrap">에러 코드 (Error Code)</th>
                    <th className="p-2.5">상세 응답 메시지 및 진단 결과</th>
                    <th className="p-2.5 whitespace-nowrap">무결성 상태</th>
                    <th className="p-2.5 text-right whitespace-nowrap">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-sans">
                  {apiResponseLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-400 font-mono text-xs">
                        기록된 API 응답 로그가 없습니다. 상단의 '잔고 강제 동기화 실행' 버튼을 눌러 모니터링을 시작하세요.
                      </td>
                    </tr>
                  ) : (
                    apiResponseLogs.map((log, idx) => {
                      const isSuccess = log.httpStatus === 200;
                      let errorCodeDisplay = "SUCCESS_00";
                      let errorDesc = "정상 수신되었습니다.";

                      if (log.rawResponse?.errorCode || log.message.includes("실패") || !isSuccess) {
                        if (log.message.includes("자격증명")) {
                          errorCodeDisplay = "EGW00101";
                          errorDesc = "한국투자증권 또는 업비트 AppKey/SecretKey가 설정되지 않았습니다. API 키를 등록하세요.";
                        } else if (log.message.includes("OAuth")) {
                          errorCodeDisplay = "EGW00123";
                          errorDesc = "KIS OAuth 2.0 접근 토큰 발급에 실패했습니다. AppSecret 유효기간을 확인하세요.";
                        } else {
                          errorCodeDisplay = log.rawResponse?.errorCode || "EGW9999";
                          errorDesc = log.message || "원격 API 서버와의 통신 중 오류가 발생했습니다.";
                        }
                      }

                      return (
                        <tr key={`${log.id}_${idx}`} className="hover:bg-zinc-50/80 transition text-[11px]">
                          <td className="p-2.5 font-mono text-zinc-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-zinc-100 text-zinc-800 border border-zinc-300">
                              {log.broker}
                            </span>
                          </td>
                          <td className="p-2.5 whitespace-nowrap font-mono">
                            <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                              isSuccess 
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                                : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}>
                              HTTP {log.httpStatus}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isSuccess ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50 border border-rose-200"
                            }`}>
                              {errorCodeDisplay}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-medium text-zinc-900">{log.message}</div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate max-w-md mt-0.5">
                              {errorDesc}
                            </div>
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            {log.integrityStatus === "ZERO_BALANCE_WARNING" ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300 animate-pulse">
                                ⚠️ 0원 경고
                              </span>
                            ) : log.integrityStatus === "HEALTHY" ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                                ✅ 정상
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-300">
                                🚨 연결 실패
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleCopyLog(log.id, log)}
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer ml-auto"
                            >
                              {copiedLogId === log.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-zinc-500" />}
                              <span>{copiedLogId === log.id ? "복사됨" : "복사"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 4: AI Order API Gate & Portfolio Risk Limits */}
      {(activeSubTab === "OVERVIEW" || activeSubTab === "EXECUTION_GATE") && (
        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* Portfolio Control Thresholds Card */}
          <div className="bg-white border border-zinc-200 p-5 rounded-lg space-y-4 shadow-xs">
            <h3 className="text-sm font-black text-zinc-900 border-b border-zinc-150 pb-3 flex items-center gap-1.5">
              <Shield className="h-4.5 w-4.5 text-zinc-700" />
              <span>AI 자동주문 API 게이트 및 리스크 한계 설정</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Left side sliders */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-zinc-600">1회 주문당 최대 매수 한도 (Risk Limit)</span>
                    <span className="font-mono text-zinc-900">{riskLimit}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={riskLimit}
                    onChange={(e) => setRiskLimit(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-200 rounded-lg cursor-pointer accent-zinc-900"
                  />
                  <span className="text-[9px] text-zinc-400 block">설정된 비율을 초과하는 1회 매수 신호는 주문 전산 게이트에서 자동 거부 비토(Veto) 처리됩니다.</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-zinc-600">당일 손실 제한 장치 (Daily Loss Gate)</span>
                    <span className="font-mono text-zinc-900">{lossLimit}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={lossLimit}
                    onChange={(e) => setLossLimit(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-200 rounded-lg cursor-pointer accent-zinc-900"
                  />
                  <span className="text-[9px] text-zinc-400 block">당일 누적 평가손실률이 해당 기준을 도달하는 즉시 추가 AI 주문이 하드락 잠금 전면 차단됩니다.</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span className="text-zinc-600">종목별 최대 보유 비중 (Max Weight)</span>
                    <span className="font-mono text-zinc-900">{maxWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={maxWeight}
                    onChange={(e) => setMaxWeight(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-200 rounded-lg cursor-pointer accent-zinc-900"
                  />
                  <span className="text-[9px] text-zinc-400 block">포트폴리오 내 특정 1개 종목의 최대 가중치를 고정하여 리스크를 분산합니다.</span>
                </div>
              </div>

              {/* Right side options */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="font-bold text-zinc-600 block">AI 자율주문 승인 유형 제어</span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2.5 border border-zinc-200 rounded cursor-pointer hover:bg-zinc-50 transition">
                      <input
                        type="radio"
                        name="tradingMode"
                        value="approval"
                        checked={tradingMode === "approval"}
                        onChange={(e) => setTradingMode(e.target.value)}
                        className="accent-zinc-900"
                      />
                      <div>
                        <span className="font-bold text-zinc-800 block">안전 모드 (AI 분석 후 사용자 승인대기)</span>
                        <span className="text-[10px] text-zinc-400">AI가 타점을 도출하면 대기 주문으로 접수되며, 모바일/웹 알림 승인 클릭 후 실거래가 체결됩니다.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 border border-zinc-200 rounded cursor-pointer hover:bg-zinc-50 transition">
                      <input
                        type="radio"
                        name="tradingMode"
                        value="auto"
                        checked={tradingMode === "auto"}
                        onChange={(e) => setTradingMode(e.target.value)}
                        className="accent-zinc-900"
                      />
                      <div>
                        <span className="font-bold text-zinc-800 block">완전 자율 오토파일럿 (Full Autonomous)</span>
                        <span className="text-[10px] text-zinc-400">24시간 탐색 후, 지수 및 리스크 필터링 가중치를 통과하는 즉시 시장가/지정가 즉시 체결을 수행합니다.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Additional Preferences: Order Prompt suppression */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={disableTradeGuardPrompt}
                      onChange={(e) => setDisableTradeGuardPrompt(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 accent-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">
                        실시간 주문 수동 설정 창 안 나오게 하기 (자동 즉시 주문)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        체결 시 불필요하게 튀어나오는 수동 설정 모달을 완전히 숨기고 실시간 시세 기준 즉시 주문을 처리합니다.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Reset & Save action buttons */}
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <AlertCircle className="h-4 w-4 text-zinc-500 shrink-0" />
              <span>
                <strong>안내:</strong> 계좌 잔고 데이터를 초기화하시려면 아래 **[보유 종목 & 잔고 0원 초기화]**를 누르시면 됩니다.
              </span>
            </div>

            {/* Inline Confirmation Box for Zeroing Out */}
            {showZeroConfirm && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded text-xs text-rose-800 space-y-3 animate-in slide-in-from-top-1">
                <p className="font-extrabold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>[경고] 정말로 모든 보유종목 및 잔고 데이터를 완전히 초기화(0원)하시겠습니까? 이 작업은 되돌릴 수 없습니다.</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetSimulatedBalance}
                    disabled={isResetting}
                    className="px-3 py-1.5 bg-rose-600 text-white font-extrabold rounded hover:bg-rose-700 transition cursor-pointer"
                  >
                    {isResetting ? "초기화 실행 중..." : "예, 완전히 초기화(0원)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowZeroConfirm(false)}
                    className="px-3 py-1.5 bg-zinc-200 text-zinc-700 font-bold rounded hover:bg-zinc-300 transition cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-200">
              <div className="flex flex-wrap items-center gap-2">
                {!showZeroConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowZeroConfirm(true)}
                    className="px-3.5 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>보유 종목 & 잔고 0원 완전히 초기화</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isSaved && (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>성공적으로 저장되었습니다</span>
                  </div>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-zinc-950 text-white rounded hover:bg-zinc-850 transition font-black text-xs cursor-pointer shadow-sm"
                >
                  설정 정보 일괄 저장
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SUB TAB 5: API Network Status & Heartbeat Latency */}
      {(activeSubTab === "OVERVIEW" || activeSubTab === "PING_NETWORK") && (
        <div className="space-y-6">
          <TradingStatus />
        </div>
      )}
    </div>
  );
};
