import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { encryptClientSide, decryptClientSide } from "../lib/encryption";
import { Shield, RefreshCw, Key, Settings, AlertTriangle, CheckCircle2 } from "lucide-react";
import { doc, writeBatch, collection, addDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BrokerIntegration } from "./BrokerIntegration";

export const Controller: React.FC = () => {
  const { profile, updateProfileSettings, user, executeTrade, addToast } = useApp();

  // API Form states (synchronized with DB profile)
  const [koreaAppKey, setKoreaAppKey] = useState("");
  const [koreaAppSecret, setKoreaAppSecret] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Synchronize keys when profile loads or updates with client-side decryption
  React.useEffect(() => {
    let isMounted = true;
    const loadDecrypted = async () => {
      if (!profile) return;
      const decKey = await decryptClientSide(profile.koreaAppKey || "");
      const decSecret = await decryptClientSide(profile.koreaAppSecret || "");

      if (isMounted) {
        setKoreaAppKey(decKey);
        setKoreaAppSecret(decSecret);
      }
    };
    loadDecrypted();
    return () => { isMounted = false; };
  }, [profile?.koreaAppKey, profile?.koreaAppSecret]);

  // Profile-specific threshold settings
  const [riskLimit, setRiskLimit] = useState(profile?.riskLimitPerTrade || 10);
  const [lossLimit, setLossLimit] = useState(profile?.dailyLossLimit || 2);
  const [maxWeight, setMaxWeight] = useState(profile?.maxPositionWeight || 100);
  const [tradingMode, setTradingMode] = useState(profile?.tradingMode || "approval");

  if (!profile) return null;

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let encKoreaKey = koreaAppKey.trim();
      let encKoreaSecret = koreaAppSecret.trim();

      if (encKoreaKey && !encKoreaKey.startsWith("enc:")) {
        try { encKoreaKey = await encryptClientSide(encKoreaKey); } catch (e) {}
      }
      if (encKoreaSecret && !encKoreaSecret.startsWith("enc:")) {
        try { encKoreaSecret = await encryptClientSide(encKoreaSecret); } catch (e) {}
      }

      await updateProfileSettings({
        koreaAppKey: encKoreaKey,
        koreaAppSecret: encKoreaSecret,
        koreaAccountNo: profile.koreaAccountNo || "",
        koreaAccountCode: profile.koreaAccountCode || "01"
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save credentials", err);
      alert("API 연결 정보 저장 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateRiskThresholds = async () => {
    await updateProfileSettings({
      riskLimitPerTrade: riskLimit,
      dailyLossLimit: lossLimit,
      maxPositionWeight: maxWeight,
      tradingMode: tradingMode
    });
    addToast({
      type: "SUCCESS",
      title: "설정 저장 완료",
      message: "위험 한도 및 운영 모드 설정이 실시간 반영되었습니다."
    });
  };

  const handleResetPortfolio = async () => {
    if (!user) return;

    setResetLoading(true);
    try {
      // 1. Reset user balance
      await updateProfileSettings({
        balance: 0,
        initialBalance: 0,
        autoTradingEnabled: true
      });

      // We won't wipe strategies but can log a system reset trade
      const newTrade = {
        userId: user.uid,
        symbol: "SYS",
        name: "자산 초기화",
        market: "KOREA",
        side: "BUY",
        quantity: 0,
        price: 0,
        strategyName: "시스템 리셋",
        aiRationale: "실계좌 관제 포트폴리오 잔고 동기화를 초기 상태로 완료하였습니다.",
        timestamp: new Date().toISOString()
      };
      const tradeRef = await addDoc(collection(db, "trades"), newTrade);
      await setDoc(tradeRef, { id: tradeRef.id }, { merge: true });

      alert("포트폴리오 자산 및 이력이 시스템 리셋되었습니다. (페이지를 새로고침 하시면 잔고가 동기화됩니다.)");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("리셋 중 오류가 발생했습니다.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Risk Limits & Mode Settings */}
      <div className="bg-white border border-zinc-200 p-5 rounded-lg lg:col-span-2 space-y-6">
        <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-2">
          <Settings className="h-4.5 w-4.5 text-zinc-500" />
          <span>위험 한도 및 시스템 운영 설정 (Risk Controls)</span>
        </h3>

        {/* Trading Mode selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">AI 자동매매 운영 모드</label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setTradingMode("analysis")}
              className={`p-3 border rounded text-left transition ${
                tradingMode === "analysis" 
                  ? "bg-zinc-900 text-white border-zinc-900" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="text-xs font-bold">1. 분석 전용</div>
              <p className="text-[10px] text-zinc-400 mt-1">AI의 분석 의견과 실시간 매매 신호만 관제 알림으로 제공 (자동주문 전송 안 함)</p>
            </button>

            <button
              type="button"
              onClick={() => setTradingMode("approval")}
              className={`p-3 border rounded text-left transition ${
                tradingMode === "approval" 
                  ? "bg-zinc-900 text-white border-zinc-900" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="text-xs font-bold">2. 승인형 자동매매</div>
              <p className="text-[10px] text-zinc-400 mt-1">AI가 최적 주문 제안 생성 후 사용자가 최종 [승인] 시 자동 전송</p>
            </button>

            <button
              type="button"
              onClick={() => setTradingMode("semi")}
              className={`p-3 border rounded text-left transition ${
                tradingMode === "semi" 
                  ? "bg-zinc-900 text-white border-zinc-900" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="text-xs font-bold">3. 반자동매매</div>
              <p className="text-[10px] text-zinc-400 mt-1">지정한 특정 종목군과 전략 룰셋에 매칭된 조건만 자동 거래 수행</p>
            </button>

            <button
              type="button"
              onClick={() => setTradingMode("auto")}
              className={`p-3 border rounded text-left transition ${
                tradingMode === "auto" 
                  ? "bg-zinc-900 text-white border-zinc-900" 
                  : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="text-xs font-bold">4. 완전 자동매매</div>
              <p className="text-[10px] text-zinc-400 mt-1">설정한 안전 위험 한도 내에서 24시간 감시를 수행하며 자동 체결</p>
            </button>
          </div>
        </div>

        {/* Set Limits Sliders */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <h4 className="text-xs font-bold text-zinc-900 font-sans uppercase tracking-wider">안전 제동 임계치 관리</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 bg-zinc-50 p-4 rounded border border-zinc-150">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-zinc-600">1회 최대 주문금액 비율</span>
                <span className="text-zinc-900 font-mono font-bold">{riskLimit}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={riskLimit}
                onChange={(e) => setRiskLimit(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              />
              <p className="text-[9px] text-zinc-400">단일 거래 체결 시, 예수금의 최대 사용 한도입니다.</p>
            </div>

            <div className="space-y-2 bg-zinc-50 p-4 rounded border border-zinc-150">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-zinc-600">일일 최대 누적 손실한도</span>
                <span className="text-zinc-900 font-mono font-bold">{lossLimit}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={lossLimit}
                onChange={(e) => setLossLimit(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              />
              <p className="text-[9px] text-zinc-400">당일 손실이 설정 비율에 이르면 자동매매 기능이 긴급 정지됩니다.</p>
            </div>

            <div className="space-y-2 bg-zinc-50 p-4 rounded border border-zinc-150">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-zinc-600">종목당 최대 보유 비중</span>
                <span className="text-zinc-900 font-mono font-bold">{maxWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={maxWeight}
                onChange={(e) => setMaxWeight(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              />
              <p className="text-[9px] text-zinc-400">포트폴리오 내 특정 한 개 종목이 차지할 수 있는 최대 가치 가중치입니다.</p>
            </div>
          </div>
        </div>

        {/* Submit adjustments */}
        <div className="pt-4 border-t border-zinc-100 flex justify-end">
          <button
            onClick={handleUpdateRiskThresholds}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>위험 임계치 변경 적용</span>
          </button>
        </div>
      </div>

      {/* API Key Connection credentials & Reset Module */}
      <div className="space-y-6 lg:col-span-1">
        {/* API Credentials */}
        <BrokerIntegration />

        {/* Reset system holdings */}
        <div className="bg-white border border-zinc-200 p-5 rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-rose-800 border-b border-rose-100 pb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
            <span>시스템 리셋 및 예수금 복구</span>
          </h3>
          <p className="text-[10px] text-zinc-400 leading-normal">
            실계좌 연동 포트폴리오 관제 데이터를 초기화하고 기본 가동 상태로 원복합니다.
          </p>
          <button
            onClick={handleResetPortfolio}
            disabled={resetLoading}
            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 disabled:bg-zinc-100 text-rose-700 hover:text-rose-800 font-bold text-xs rounded border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resetLoading ? "animate-spin" : ""}`} />
            <span>{resetLoading ? "포트폴리오 리셋 중..." : "실계좌 포트폴리오 관리 초기화"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
