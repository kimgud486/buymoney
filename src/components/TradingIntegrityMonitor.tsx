import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Server,
  Zap
} from "lucide-react";

export const TradingIntegrityMonitor: React.FC = () => {
  const { profile, lockProductionEnvironment, updateProfileSettings, addToast } = useApp();
  const [isValidating, setIsValidating] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<'OK' | 'DEMO_DETECTED' | 'CHECKING' | 'ERROR'>('CHECKING');
  const [detectedEndpoint, setDetectedEndpoint] = useState<string>("");
  const [lastCheckTime, setLastCheckTime] = useState<string>("");

  const validateProductionIntegrity = async () => {
    setIsValidating(true);
    setIntegrityStatus('CHECKING');

    try {
      const response = await fetch("/api/broker/sync-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker: "korea",
          koreaAppKey: profile?.koreaAppKey,
          koreaAppSecret: profile?.koreaAppSecret,
          koreaAccountNo: profile?.koreaAccountNo,
          koreaAccountCode: profile?.koreaAccountCode,
          currentBalance: profile?.balance || 0
        })
      });

      const data = await response.json();
      const endpoint = data.endpoint || "https://openapi.koreainvestment.com:9443";
      setDetectedEndpoint(endpoint);
      setLastCheckTime(new Date().toLocaleTimeString());

      // Check if demo/paper endpoint is detected
      const isDemoEndpoint = 
        endpoint.includes("openapivts") || 
        endpoint.includes("29443");

      if (isDemoEndpoint) {
        setIntegrityStatus('DEMO_DETECTED');
        
        // Auto-trigger Production-Only Lock
        await lockProductionEnvironment();
        await updateProfileSettings({
          isProductionLocked: true,
          isDemoMode: false,
          apiEnvironmentMode: 'PRODUCTION'
        });

        addToast({
          type: "ERROR",
          title: "🚨 TRADING INTEGRITY ALERT",
          message: "비실전(VTS/Paper) 엔드포인트 감지! 무결성 차단 및 실전 고정(Production Lock)이 자동 적용되었습니다."
        });
      } else {
        setIntegrityStatus('OK');
      }
    } catch (err: any) {
      console.error(err);
      setIntegrityStatus('ERROR');
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    validateProductionIntegrity();

    // Periodic check every 30 seconds
    const interval = setInterval(() => {
      validateProductionIntegrity();
    }, 30000);

    return () => clearInterval(interval);
  }, [profile?.koreaAppKey]);

  return (
    <div id="trading-integrity-monitor" className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm space-y-0">
      {/* Header */}
      <div className="bg-zinc-950 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${
            integrityStatus === 'DEMO_DETECTED' 
              ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse" 
              : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
          }`}>
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white font-sans">
                실거래 무결성 실시간 모니터 (Trading Integrity Monitor)
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                integrityStatus === 'OK' 
                  ? "bg-emerald-500 text-zinc-950" 
                  : integrityStatus === 'DEMO_DETECTED'
                  ? "bg-rose-600 text-white animate-bounce"
                  : "bg-amber-500 text-zinc-950"
              }`}>
                {integrityStatus === 'OK' ? "PRODUCTION INTEGRITY OK ✅" : integrityStatus === 'DEMO_DETECTED' ? "DEMO ALERT LOCK ACTIVE 🚨" : "VERIFYING..."}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              실시간 엔드포인트를 주기적으로 검증하여 비실전(Demo/Paper/VTS) 환경 발견 시 즉각 실전 전용 고정(Production-Only Lock)을 실행합니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={validateProductionIntegrity}
          disabled={isValidating}
          className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer border border-zinc-700 shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin text-emerald-400" : ""}`} />
          <span>{isValidating ? "엔드포인트 무결성 검증 중..." : "실시간 무결성 재검증"}</span>
        </button>
      </div>

      {/* High-Severity Alert Banner if DEMO detected */}
      {integrityStatus === 'DEMO_DETECTED' && (
        <div className="bg-rose-950 text-white p-4 border-b border-rose-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-600 rounded text-white shrink-0 mt-0.5">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-rose-200 font-sans uppercase tracking-wide">
                🚨 고위험 무결성 경고: 비실전(VTS/Paper/Demo) 엔드포인트 포착됨
              </h4>
              <p className="text-[11px] text-rose-300 mt-1 leading-relaxed">
                시스템이 비실전 매매 엔드포인트(<code>{detectedEndpoint}</code>)를 포착하였습니다. 실수로 인한 모의 매매 오작동을 차단하기 위해 <strong>Production-Only Lock</strong>이 자동 적용되었습니다.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[10px] bg-rose-900 border border-rose-700 text-rose-200 px-3 py-1.5 rounded font-mono font-bold flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              <span>PRODUCTION-ONLY LOCKED</span>
            </span>
          </div>
        </div>
      )}

      {/* Connection Details Line */}
      <div className="bg-zinc-900 p-3 px-5 text-xs text-zinc-300 font-mono flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <Server className="h-3.5 w-3.5 text-emerald-400" />
          <span>감지된 엔드포인트: <code className="text-emerald-300">{detectedEndpoint || "https://openapi.koreainvestment.com:9443"}</code></span>
        </div>
        <div className="text-zinc-400 text-[11px]">
          마지막 무결성 검사 시각: {lastCheckTime || "방금 전"}
        </div>
      </div>
    </div>
  );
};
