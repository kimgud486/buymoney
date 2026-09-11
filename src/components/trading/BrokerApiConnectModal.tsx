import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface BrokerApiConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BrokerTab = "KOREA" | "UPBIT";

type TestResult = {
  success: boolean;
  message: string;
  balance?: string;
  broker?: BrokerTab;
  fingerprint?: string;
};

const maskAccount = (value: string) => {
  const clean = value.trim();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 3)}****${clean.slice(-2)}`;
};

export const BrokerApiConnectModal: React.FC<BrokerApiConnectModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    profile,
    updateProfileSettings,
    addToast,
    syncRealAccountBalance,
    brokerApiError,
    clearBrokerError
  } = useApp();

  const [activeTab, setActiveTab] = useState<BrokerTab>("KOREA");
  const [showSecret, setShowSecret] = useState(false);
  const [showUpbitSecret, setShowUpbitSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [serverIp, setServerIp] = useState("확인 중...");
  const [isCopiedIp, setIsCopiedIp] = useState(false);

  const [koreaKey, setKoreaKey] = useState("");
  const [koreaSecret, setKoreaSecret] = useState("");
  const [koreaAccountNo, setKoreaAccountNo] = useState(profile?.koreaAccountNo || "");
  const [koreaAccountCode, setKoreaAccountCode] = useState(profile?.koreaAccountCode || "01");

  const [upbitKey, setUpbitKey] = useState("");
  const [upbitSecret, setUpbitSecret] = useState("");

  const koreaFingerprint = useMemo(
    () => [koreaKey.trim(), koreaSecret.trim(), koreaAccountNo.trim(), koreaAccountCode.trim() || "01"].join("::"),
    [koreaKey, koreaSecret, koreaAccountNo, koreaAccountCode]
  );

  const upbitFingerprint = useMemo(
    () => [upbitKey.trim(), upbitSecret.trim()].join("::"),
    [upbitKey, upbitSecret]
  );

  const verifiedForCurrentValues =
    testResult?.success === true &&
    testResult.broker === activeTab &&
    testResult.fingerprint === (activeTab === "KOREA" ? koreaFingerprint : upbitFingerprint);

  useEffect(() => {
    if (!isOpen) return;

    setTestResult(null);
    setShowSecret(false);
    setShowUpbitSecret(false);
    setKoreaKey("");
    setKoreaSecret("");
    setUpbitKey("");
    setUpbitSecret("");
    setKoreaAccountNo(profile?.koreaAccountNo || "");
    setKoreaAccountCode(profile?.koreaAccountCode || "01");

    fetch("/api/server-ip", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const liveIp = data?.formatted || data?.ip1;
        setServerIp(liveIp && liveIp !== "확인 불가" ? String(liveIp) : "확인 불가");
      })
      .catch(() => setServerIp("확인 불가"));
  }, [isOpen, profile?.koreaAccountNo, profile?.koreaAccountCode]);

  const invalidateTest = () => setTestResult(null);

  const switchTab = (tab: BrokerTab) => {
    setActiveTab(tab);
    setTestResult(null);
  };

  const handleCopyIp = async () => {
    if (!navigator.clipboard || serverIp === "확인 불가" || serverIp === "확인 중...") return;
    await navigator.clipboard.writeText(serverIp);
    setIsCopiedIp(true);
    window.setTimeout(() => setIsCopiedIp(false), 1800);
    addToast({
      type: "INFO",
      title: "서버 IP 복사 완료",
      message: `${serverIp} 를 복사했습니다. KIS Developers 허용 IP 설정이 필요할 때 사용하세요.`
    });
  };

  const handleTestConnection = async () => {
    if (activeTab === "KOREA") {
      if (!koreaKey.trim() || !koreaSecret.trim()) {
        setTestResult({ success: false, message: "KIS AppKey와 AppSecret을 모두 입력해 주세요." });
        return;
      }
      if (!koreaAccountNo.trim()) {
        setTestResult({ success: false, message: "KIS 계좌번호를 입력해 주세요." });
        return;
      }
    } else if (!upbitKey.trim() || !upbitSecret.trim()) {
      setTestResult({ success: false, message: "업비트 Access Key와 Secret Key를 모두 입력해 주세요." });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const payload = activeTab === "KOREA"
        ? {
            broker: "korea",
            key: koreaKey.trim(),
            secret: koreaSecret.trim(),
            koreaAppKey: koreaKey.trim(),
            koreaAppSecret: koreaSecret.trim(),
            accountNo: koreaAccountNo.trim(),
            accountCode: koreaAccountCode.trim() || "01"
          }
        : {
            broker: "upbit",
            key: upbitKey.trim(),
            secret: upbitSecret.trim(),
            accessKey: upbitKey.trim(),
            secretKey: upbitSecret.trim(),
            upbitAccessKey: upbitKey.trim(),
            upbitSecretKey: upbitSecret.trim()
          };

      const res = await fetch("/api/broker/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success !== true) {
        throw new Error(data?.error || data?.message || `연결 테스트 실패 (HTTP ${res.status})`);
      }

      setTestResult({
        success: true,
        broker: activeTab,
        fingerprint: activeTab === "KOREA" ? koreaFingerprint : upbitFingerprint,
        message: data?.message || "API 인증에 성공했습니다.",
        balance:
          data?.balance !== undefined
            ? `실시간 조회 잔고: ₩${Number(data.balance).toLocaleString("ko-KR")}`
            : undefined
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error?.message || "서버와 통신하지 못했습니다. 키, 계좌번호, 권한 설정을 확인해 주세요."
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveCredentials = async () => {
    if (!verifiedForCurrentValues) {
      addToast({
        type: "WARNING",
        title: "연결 테스트가 먼저 필요합니다",
        message: "현재 입력한 값으로 연결 테스트에 성공한 뒤 등록해 주세요."
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = activeTab === "KOREA"
        ? {
            koreaAppKey: koreaKey.trim(),
            koreaAppSecret: koreaSecret.trim(),
            koreaAccountNo: koreaAccountNo.trim(),
            koreaAccountCode: koreaAccountCode.trim() || "01"
          }
        : {
            upbitAccessKey: upbitKey.trim(),
            upbitSecretKey: upbitSecret.trim()
          };

      const res = await fetch("/api/broker/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || data?.message || `등록 실패 (HTTP ${res.status})`);
      }

      if (activeTab === "KOREA") {
        await updateProfileSettings({
          koreaAccountNo: koreaAccountNo.trim(),
          koreaAccountCode: koreaAccountCode.trim() || "01"
        } as any);
        clearBrokerError("korea");
      } else {
        clearBrokerError("upbit");
      }

      addToast({
        type: "SUCCESS",
        title: activeTab === "KOREA" ? "KIS API 등록 완료" : "업비트 API 등록 완료",
        message:
          activeTab === "KOREA"
            ? "연결 테스트를 통과한 KIS 인증정보를 서버에 등록했습니다. 실거래 자동주문은 별도로 켜야 합니다."
            : "연결 테스트를 통과한 업비트 인증정보를 서버에 등록했습니다. 실거래 자동주문은 별도로 켜야 합니다."
      });

      if (syncRealAccountBalance) {
        const broker = activeTab === "KOREA" ? "korea" : "upbit";
        syncRealAccountBalance(broker, false).catch(() => undefined);
      }

      if (activeTab === "KOREA") {
        setKoreaKey("");
        setKoreaSecret("");
      } else {
        setUpbitKey("");
        setUpbitSecret("");
      }
      setTestResult(null);
    } catch (error: any) {
      addToast({
        type: "ERROR",
        title: "API 등록 실패",
        message: error?.message || "서버 저장 중 오류가 발생했습니다."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const disconnectAll = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/broker/credentials", { method: "DELETE", cache: "no-store" });
      if (!res.ok) throw new Error(`연동 해제 실패 (HTTP ${res.status})`);

      await updateProfileSettings({
        koreaAppKey: "",
        koreaAppSecret: "",
        koreaAccountNo: "",
        koreaAccountCode: "01",
        upbitAccessKey: "",
        upbitSecretKey: "",
        isRealTrade: false
      } as any);

      setKoreaKey("");
      setKoreaSecret("");
      setKoreaAccountNo("");
      setKoreaAccountCode("01");
      setUpbitKey("");
      setUpbitSecret("");
      setTestResult(null);
      clearBrokerError("korea");
      clearBrokerError("upbit");

      addToast({
        type: "INFO",
        title: "API 연동 해제 완료",
        message: "서버에 등록된 증권사/거래소 API 연결정보를 해제했습니다."
      });
    } catch (error: any) {
      addToast({
        type: "ERROR",
        title: "연동 해제 실패",
        message: error?.message || "연동 해제 중 오류가 발생했습니다."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const brokerError = activeTab === "KOREA" ? brokerApiError?.korea : brokerApiError?.upbit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-blue-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black">실거래 Open API 등록</h2>
              <p className="mt-0.5 text-xs text-slate-400">키 테스트와 저장을 분리한 보안형 연결창</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-100 p-2 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => switchTab("KOREA")}
            className={`rounded-xl px-3 py-2.5 text-sm font-black transition ${activeTab === "KOREA" ? "bg-blue-600 text-white shadow" : "bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300"}`}
          >
            한국투자증권 KIS
          </button>
          <button
            onClick={() => switchTab("UPBIT")}
            className={`rounded-xl px-3 py-2.5 text-sm font-black transition ${activeTab === "UPBIT" ? "bg-amber-500 text-slate-950 shadow" : "bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300"}`}
          >
            업비트
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <div className="text-xs leading-5 text-slate-700 dark:text-slate-300">
                <strong>브라우저 localStorage에 API 비밀키를 저장하지 않습니다.</strong>
                <br />연결 테스트를 통과한 현재 입력값만 서버 등록 API로 전송합니다. 등록 뒤 입력창의 키 값은 비웁니다.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-500">현재 앱 서버 IP</div>
              <div className="mt-0.5 truncate font-mono text-sm font-black text-slate-800 dark:text-slate-100">{serverIp}</div>
            </div>
            <button
              onClick={handleCopyIp}
              disabled={serverIp === "확인 불가" || serverIp === "확인 중..."}
              className="ml-3 flex items-center gap-1 rounded-lg bg-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"
            >
              {isCopiedIp ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {isCopiedIp ? "복사됨" : "IP 복사"}
            </button>
          </div>

          {activeTab === "KOREA" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">KIS API 키 등록</h3>
                  <p className="text-xs text-slate-500">한국투자증권 Developers에서 발급받은 값만 입력하세요.</p>
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">AppKey</span>
                <input
                  value={koreaKey}
                  onChange={(e) => { setKoreaKey(e.target.value); invalidateTest(); }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="KIS AppKey 입력"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">AppSecret</span>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={koreaSecret}
                    onChange={(e) => { setKoreaSecret(e.target.value); invalidateTest(); }}
                    autoComplete="new-password"
                    spellCheck={false}
                    placeholder="KIS AppSecret 입력"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 pr-11 font-mono text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button type="button" onClick={() => setShowSecret((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label="비밀키 표시 전환">
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">계좌번호</span>
                  <input
                    value={koreaAccountNo}
                    onChange={(e) => { setKoreaAccountNo(e.target.value.replace(/\s/g, "")); invalidateTest(); }}
                    autoComplete="off"
                    placeholder="예: 12345678"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">상품코드</span>
                  <input
                    value={koreaAccountCode}
                    onChange={(e) => { setKoreaAccountCode(e.target.value.replace(/\D/g, "").slice(0, 2)); invalidateTest(); }}
                    maxLength={2}
                    placeholder="01"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-center font-mono text-sm font-black outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>

              {koreaAccountNo && (
                <div className="text-[11px] text-slate-500">입력 계좌: {maskAccount(koreaAccountNo)} / 상품코드 {koreaAccountCode || "01"}</div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">업비트 API 키 등록</h3>
                  <p className="text-xs text-slate-500">기존 업비트 연결도 같은 테스트 후 저장 방식으로 동작합니다.</p>
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Access Key</span>
                <input
                  value={upbitKey}
                  onChange={(e) => { setUpbitKey(e.target.value); invalidateTest(); }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Upbit Access Key 입력"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Secret Key</span>
                <div className="relative">
                  <input
                    type={showUpbitSecret ? "text" : "password"}
                    value={upbitSecret}
                    onChange={(e) => { setUpbitSecret(e.target.value); invalidateTest(); }}
                    autoComplete="new-password"
                    spellCheck={false}
                    placeholder="Upbit Secret Key 입력"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 pr-11 font-mono text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button type="button" onClick={() => setShowUpbitSecret((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label="비밀키 표시 전환">
                    {showUpbitSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>
          )}

          {brokerError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{String(brokerError)}</span>
            </div>
          )}

          {testResult && (
            <div className={`rounded-xl border p-4 ${testResult.success ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="flex items-start gap-2">
                {testResult.success ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
                <div>
                  <div className={`text-sm font-black ${testResult.success ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                    {testResult.success ? "연결 테스트 성공" : "연결 테스트 실패"}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{testResult.message}</p>
                  {testResult.balance && <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">{testResult.balance}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-slate-700 dark:text-slate-300">
            <strong>중요:</strong> API 등록만으로 자동주문이나 실거래 모드가 켜지지 않습니다. 주문 기능은 기존 거래 화면에서 별도로 확인하고 활성화해야 합니다.
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-black text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isTesting ? "animate-spin" : ""}`} />
              {isTesting ? "연결 확인 중" : "1. 연결 테스트"}
            </button>
            <button
              onClick={saveCredentials}
              disabled={isSaving || isTesting || !verifiedForCurrentValues}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <ShieldCheck className="h-4 w-4" />
              {isSaving ? "등록 중" : "2. 테스트 성공값 등록"}
            </button>
          </div>

          <button
            onClick={disconnectAll}
            disabled={isSaving || isTesting}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-500/5 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            모든 API 연동 해제
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrokerApiConnectModal;
