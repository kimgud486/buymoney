import React, { useState, useEffect } from "react";
import { 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  X, 
  ExternalLink,
  Activity,
  ShieldAlert,
  Building2,
  Zap,
  HelpCircle,
  Coins,
  Copy,
  Check,
  Trash2
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface BrokerApiConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    clearBrokerError,
    purgeAllMockData
  } = useApp();

  const [activeTab, setActiveTab] = useState<"ALL" | "UPBIT" | "KOREA">("ALL");
  const [showSecret, setShowSecret] = useState(false);
  const [showUpbitSecret, setShowUpbitSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; balance?: string } | null>(null);
  const [serverIp, setServerIp] = useState<string>("확인 중...");
  const [isCopiedIp, setIsCopiedIp] = useState<boolean>(false);

  // Korea Investment State
  const [koreaKey, setKoreaKey] = useState(profile?.koreaAppKey || "");
  const [koreaSecret, setKoreaSecret] = useState(profile?.koreaAppSecret || "");
  const [koreaAccountNo, setKoreaAccountNo] = useState(profile?.koreaAccountNo || "");
  const [koreaAccountCode, setKoreaAccountCode] = useState(profile?.koreaAccountCode || "01");

  // Upbit State
  const [upbitKey, setUpbitKey] = useState(profile?.upbitAccessKey || "");
  const [upbitSecret, setUpbitSecret] = useState(profile?.upbitSecretKey || "");

  // Load server public IP
  useEffect(() => {
    if (isOpen) {
      fetch("/api/server-ip")
        .then(res => res.json())
        .then(data => {
          if (data?.formatted && data.formatted !== "확인 불가") {
            setServerIp(data.formatted);
          } else if (data?.ip1 && data.ip1 !== "확인 불가") {
            setServerIp(data.ip1);
          } else {
            setServerIp("34.34.226.96");
          }
        })
        .catch(() => {
          fetch("/api/broker/credentials")
            .then(res => res.json())
            .then(data => {
              if (data?.credentials?.manualServerIp1) {
                setServerIp(data.credentials.manualServerIp1);
              } else {
                setServerIp("34.34.226.96");
              }
            })
            .catch(() => setServerIp("34.34.226.96"));
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      let localCreds: Record<string, string> = {};
      try {
        const stored = localStorage.getItem("aistock_saved_api_credentials");
        if (stored) localCreds = JSON.parse(stored);
      } catch (e) {}

      const kKey = profile?.koreaAppKey || localCreds.koreaAppKey || "";
      const kSecret = profile?.koreaAppSecret || localCreds.koreaAppSecret || "";
      const kAcnt = profile?.koreaAccountNo || localCreds.koreaAccountNo || "";
      const kCode = profile?.koreaAccountCode || localCreds.koreaAccountCode || "01";
      const uKey = profile?.upbitAccessKey || localCreds.upbitAccessKey || "";
      const uSecret = profile?.upbitSecretKey || localCreds.upbitSecretKey || "";

      if (kKey) setKoreaKey(kKey);
      if (kSecret) setKoreaSecret(kSecret);
      if (kAcnt) setKoreaAccountNo(kAcnt);
      if (kCode) setKoreaAccountCode(kCode);
      if (uKey) setUpbitKey(uKey);
      if (uSecret) setUpbitSecret(uSecret);

      // Check server disk credentials as well
      fetch("/api/broker/credentials")
        .then(res => res.json())
        .then(data => {
          if (data?.credentials) {
            const c = data.credentials;
            if (c.koreaAppKey) setKoreaKey(prev => prev || c.koreaAppKey);
            if (c.koreaAppSecret) setKoreaSecret(prev => prev || c.koreaAppSecret);
            if (c.koreaAccountNo) setKoreaAccountNo(prev => prev || c.koreaAccountNo);
            if (c.koreaAccountCode) setKoreaAccountCode(prev => prev || c.koreaAccountCode || "01");
            if (c.upbitAccessKey) setUpbitKey(prev => prev || c.upbitAccessKey);
            if (c.upbitSecretKey) setUpbitSecret(prev => prev || c.upbitSecretKey);
          }
        })
        .catch(err => console.warn(err));

      setTestResult(null);
    }
  }, [isOpen, profile]);

  const [showConfirmStartLiveTrading, setShowConfirmStartLiveTrading] = useState(false);

  const requestSaveWithConfirm = () => {
    setShowConfirmStartLiveTrading(true);
  };

  const handleConfirmStartTrading = async () => {
    setShowConfirmStartLiveTrading(false);
    if (activeTab === "KOREA") {
      await executeSaveKorea();
    } else {
      await executeSaveUpbit();
    }
  };

  const handleCancelAndDisconnectAll = async () => {
    setShowConfirmStartLiveTrading(false);
    setIsSaving(true);
    try {
      try {
        localStorage.removeItem("aistock_saved_api_credentials");
      } catch (e) {}

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
      setUpbitKey("");
      setUpbitSecret("");
      clearBrokerError("korea");
      clearBrokerError("upbit");

      try {
        await fetch("/api/broker/credentials", { method: "DELETE" });
      } catch (e) {}

      addToast({
        id: `disconnect_all_${Date.now()}`,
        type: "INFO",
        title: "실거래 API 연동 해제 완료",
        message: "모든 실거래 거래소/증권사 API 연동이 안전하게 해제되었습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });
    } catch (e: any) {
      addToast({
        id: `disconnect_err_${Date.now()}`,
        type: "ERROR",
        title: "연동 해제 오류",
        message: e.message || "오류가 발생했습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });
    } finally {
      setIsSaving(false);
    }
  };

  const executeSaveAll = async () => {
    if (!upbitKey.trim() && !koreaKey.trim()) {
      addToast({
        type: "WARNING",
        title: "API 키 입력 필요",
        message: "업비트 또는 한국투자증권 API 키 중 최소 1개 이상을 입력해 주세요."
      });
      return;
    }

    setIsSaving(true);
    try {
      const credPayload: Record<string, string> = {};
      if (koreaKey.trim()) {
        credPayload.koreaAppKey = koreaKey.trim();
        credPayload.koreaAppSecret = koreaSecret.trim();
        credPayload.koreaAccountNo = koreaAccountNo.trim();
        credPayload.koreaAccountCode = koreaAccountCode.trim() || "01";
      }
      if (upbitKey.trim()) {
        credPayload.upbitAccessKey = upbitKey.trim();
        credPayload.upbitSecretKey = upbitSecret.trim();
      }

      // 1. Permanent Local Storage Backup
      let existingCreds: Record<string, string> = {};
      try {
        const stored = localStorage.getItem("aistock_saved_api_credentials");
        if (stored) existingCreds = JSON.parse(stored);
      } catch (e) {}
      const mergedCreds = { ...existingCreds, ...credPayload };
      try {
        localStorage.setItem("aistock_saved_api_credentials", JSON.stringify(mergedCreds));
      } catch (e) {}

      // 2. Save to server backend disk
      await fetch("/api/broker/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credPayload)
      }).catch(e => console.warn("Backend credential persist notice:", e));

      // 3. Update React App Context Profile Settings (Turn on Real Trade mode)
      await updateProfileSettings({
        ...credPayload,
        isRealTrade: true
      });
      clearBrokerError("korea");
      clearBrokerError("upbit");

      // 4. Automatically purge all mock simulation data
      if (purgeAllMockData) {
        await purgeAllMockData();
      }

      addToast({
        id: `save_all_${Date.now()}`,
        type: "SUCCESS",
        title: "🚀 모든 증권사/거래소 API 일괄 등록 완료",
        message: "업비트 및 한국투자증권 실거래 API가 영구 등록되었으며, 실계좌 실거래 모드가 즉시 활성화되었습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });

      if (syncRealAccountBalance) {
        if (upbitKey.trim()) syncRealAccountBalance("upbit", false).catch(e => console.warn(e));
        if (koreaKey.trim()) syncRealAccountBalance("korea", false).catch(e => console.warn(e));
      }
      onClose();
    } catch (e: any) {
      addToast({
        id: `err_all_${Date.now()}`,
        type: "ERROR",
        title: "일괄 저장 실패",
        message: e.message || "설정 저장 중 오류가 발생했습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });
    } finally {
      setIsSaving(false);
    }
  };

  const executeSaveKorea = async () => {
    if (!koreaKey.trim() || !koreaSecret.trim()) {
      addToast({
        type: "WARNING",
        title: "입력 정보 확인",
        message: "한국투자증권 AppKey와 AppSecret을 모두 입력해 주세요."
      });
      return;
    }

    setIsSaving(true);
    try {
      const credPayload = {
        koreaAppKey: koreaKey.trim(),
        koreaAppSecret: koreaSecret.trim(),
        koreaAccountNo: koreaAccountNo.trim(),
        koreaAccountCode: koreaAccountCode.trim()
      };

      // 1. Permanent Local Storage Backup
      let existingCreds: Record<string, string> = {};
      try {
        const stored = localStorage.getItem("aistock_saved_api_credentials");
        if (stored) existingCreds = JSON.parse(stored);
      } catch (e) {}
      const mergedCreds = { ...existingCreds, ...credPayload };
      try {
        localStorage.setItem("aistock_saved_api_credentials", JSON.stringify(mergedCreds));
      } catch (e) {}

      // 2. Save to server backend disk
      await fetch("/api/broker/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credPayload)
      }).catch(e => console.warn("Backend credential persist notice:", e));

      // 3. Update React App Context Profile Settings
      await updateProfileSettings({
        ...credPayload,
        isRealTrade: true
      });
      clearBrokerError("korea");

      // 4. Automatically purge all mock simulation data
      if (purgeAllMockData) {
        await purgeAllMockData();
      }

      addToast({
        id: `save_korea_${Date.now()}`,
        type: "SUCCESS",
        title: "한국투자증권 실거래 API 영구 등록 완료",
        message: "한국투자증권 KIS Developers Open API 실계좌 연동이 영구 등록되었으며, 가상 모의 데이터가 초기화되었습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });

      if (syncRealAccountBalance) {
        syncRealAccountBalance("korea", false).catch(e => console.warn(e));
      }
      onClose();
    } catch (e: any) {
      addToast({
        id: `err_${Date.now()}`,
        type: "ERROR",
        title: "저장 실패",
        message: e.message || "설정 저장 중 오류가 발생했습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });
    } finally {
      setIsSaving(false);
    }
  };

  const executeSaveUpbit = async () => {
    if (!upbitKey.trim() || !upbitSecret.trim()) {
      addToast({
        type: "WARNING",
        title: "입력 정보 확인",
        message: "업비트 Open API Access Key와 Secret Key를 모두 입력해 주세요."
      });
      return;
    }

    setIsSaving(true);
    try {
      const credPayload = {
        upbitAccessKey: upbitKey.trim(),
        upbitSecretKey: upbitSecret.trim()
      };

      // 1. Permanent Local Storage Backup
      let existingCreds: Record<string, string> = {};
      try {
        const stored = localStorage.getItem("aistock_saved_api_credentials");
        if (stored) existingCreds = JSON.parse(stored);
      } catch (e) {}
      const mergedCreds = { ...existingCreds, ...credPayload };
      try {
        localStorage.setItem("aistock_saved_api_credentials", JSON.stringify(mergedCreds));
      } catch (e) {}

      // 2. Save to server backend disk
      await fetch("/api/broker/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credPayload)
      }).catch(e => console.warn("Backend credential persist notice:", e));

      // 3. Update React App Context Profile Settings
      await updateProfileSettings({
        ...credPayload,
        isRealTrade: true
      });
      clearBrokerError("upbit");

      // 4. Automatically purge all mock simulation data
      if (purgeAllMockData) {
        await purgeAllMockData();
      }

      addToast({
        id: `save_upbit_${Date.now()}`,
        type: "SUCCESS",
        title: "업비트 실계좌 API 영구 등록 완료",
        message: "업비트 Open API 실계좌 연동이 성공적으로 영구 등록되었으며, 가상 모의 데이터가 초기화되었습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });

      if (syncRealAccountBalance) {
        syncRealAccountBalance("upbit", false).catch(e => console.warn(e));
      }
      onClose();
    } catch (e: any) {
      addToast({
        id: `err_${Date.now()}`,
        type: "ERROR",
        title: "저장 실패",
        message: e.message || "설정 저장 중 오류가 발생했습니다.",
        timestamp: new Date().toLocaleTimeString("ko-KR")
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (activeTab === "KOREA") {
      if (!koreaKey.trim() || !koreaSecret.trim()) {
        setTestResult({
          success: false,
          message: "한국투자증권 AppKey와 AppSecret을 모두 입력해 주세요."
        });
        return;
      }
    } else {
      if (!upbitKey.trim() || !upbitSecret.trim()) {
        setTestResult({
          success: false,
          message: "업비트 Access Key와 Secret Key를 모두 입력해 주세요."
        });
        return;
      }
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
            accountCode: koreaAccountCode.trim()
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
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || "Open API 실시간 계좌 인증 및 잔고 연동 성공!",
          balance: data.balance !== undefined ? `실시간 조회 실계좌 잔고: ₩${Number(data.balance).toLocaleString()}원` : "실계좌 연동 확인 완료"
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || data.message || "API 인증 실패: Key 또는 권한 설정을 확인해 주세요."
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "서버 통신 중 오류가 발생했습니다."
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyIp = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(serverIp);
      setIsCopiedIp(true);
      setTimeout(() => setIsCopiedIp(false), 2000);
      addToast({
        type: "INFO",
        title: "IP 복사 완료",
        message: `서버 IP (${serverIp})가 클립보드에 복사되었습니다. 거래소 허용 IP에 등록해 주세요.`
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600/30 text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>실거래 Open API 연동 센터</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  REAL ACCOUNT OPEN API
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                업비트(Upbit) 및 한국투자증권(KIS) 실계좌를 등록하여 실시간 잔고 조회 및 자동 주문을 실행합니다.
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

        {/* Tab Switcher: All vs Upbit vs Korea Investment */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-2 gap-2">
          <button
            onClick={() => {
              setActiveTab("ALL");
              setTestResult(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "ALL"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md font-extrabold"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>⚡ 전체 API 일괄 등록 (추천)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("UPBIT");
              setTestResult(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "UPBIT"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>업비트 (Upbit)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("KOREA");
              setTestResult(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "KOREA"
                ? "bg-blue-600 text-white shadow-md font-extrabold"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>한국투자증권 (KIS)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Server IP Guide Banner */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">현재 앱 서버 접속 IP: </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{serverIp}</span>
              </div>
            </div>
            <button
              onClick={handleCopyIp}
              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 transition cursor-pointer"
            >
              {isCopiedIp ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopiedIp ? "복사됨" : "IP 복사"}</span>
            </button>
          </div>

          {/* ALL-IN-ONE TAB FORM */}
          {activeTab === "ALL" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-2 border-emerald-500/30 rounded-xl space-y-2 text-xs">
                <div className="font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 text-sm">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span>모든 거래소/증권사 Open API 일괄 동시 등록</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  보유하신 업비트 및 한국투자증권 API 키를 아래에 입력하고 <strong>[🚀 모든 API 일괄 저장 및 실거래 동시 연동]</strong> 버튼 1번만 누르면, 모든 증권사 계좌가 즉시 영구 저장되고 실거래 모드로 활성화됩니다.
                </p>
              </div>

              {/* 1. UPBIT SECTION */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-xs text-amber-600 dark:text-amber-400">
                    <Coins className="w-4 h-4" />
                    <span>1. 업비트 (Upbit) 가상자산 API</span>
                  </div>
                  <a
                    href="https://upbit.com/mypage/open_api_management"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <span>업비트 Open API 관리</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Upbit Access Key</label>
                    <input
                      type="text"
                      placeholder="업비트 Access Key"
                      value={upbitKey}
                      onChange={(e) => setUpbitKey(e.target.value.trim())}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Upbit Secret Key</label>
                    <input
                      type={showUpbitSecret ? "text" : "password"}
                      placeholder="업비트 Secret Key"
                      value={upbitSecret}
                      onChange={(e) => setUpbitSecret(e.target.value.trim())}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 2. KOREA INVESTMENT SECTION */}
              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-xs text-blue-600 dark:text-blue-400">
                    <Building2 className="w-4 h-4" />
                    <span>2. 한국투자증권 (KIS) 국내/해외주식 API</span>
                  </div>
                  <a
                    href="https://apiportal.koreainvestment.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <span>KIS 개발자 포털</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">KIS AppKey</label>
                    <input
                      type="text"
                      placeholder="한국투자증권 AppKey"
                      value={koreaKey}
                      onChange={(e) => setKoreaKey(e.target.value.trim())}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">KIS AppSecret</label>
                    <input
                      type={showSecret ? "text" : "password"}
                      placeholder="한국투자증권 AppSecret"
                      value={koreaSecret}
                      onChange={(e) => setKoreaSecret(e.target.value.trim())}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">종합계좌번호 (앞 8자리)</label>
                    <input
                      type="text"
                      placeholder="예: 12345678"
                      value={koreaAccountNo}
                      onChange={(e) => setKoreaAccountNo(e.target.value.trim())}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">계좌상품코드 (뒤 2자리)</label>
                    <input
                      type="text"
                      placeholder="01"
                      value={koreaAccountCode}
                      onChange={(e) => setKoreaAccountCode(e.target.value.trim())}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* ALL IN ONE SAVE BUTTON */}
              <button
                type="button"
                onClick={executeSaveAll}
                disabled={isSaving}
                className="w-full py-3.5 px-4 rounded-xl text-xs md:text-sm font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>{isSaving ? "전체 API 일괄 등록 및 실거래 연동 중..." : "🚀 모든 증권사/거래소 API 일괄 저장 및 실거래 동시 연동 완료"}</span>
              </button>
            </div>
          )}

          {/* UPBIT TAB FORM */}
          {activeTab === "UPBIT" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Core IP Explanation Banner */}
              <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                      <span>💡 업비트 IP 허용 주소 등록 필수 안내</span>
                      <a
                        href="https://upbit.com/mypage/open_api_management"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>업비트 Open API 관리 바로가기</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      업비트는 보안 정책상 <strong className="text-amber-600 dark:text-amber-400 font-bold">[주문하기]</strong> 권한 사용 시 <strong>접속 IP 등록이 필수</strong>입니다.
                      스마트폰이나 집 Wi-Fi IP가 아닌, <strong>아래의 앱 서버 공인 IP</strong>를 업비트의 <strong>[허용 IP 주소]</strong>에 등록하셔야 정상 연동됩니다!
                    </p>
                  </div>
                </div>

                {/* Server IP Copy Box */}
                <div className="p-3 bg-white dark:bg-slate-900 border border-amber-500/30 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 dark:text-slate-400">업비트 등록용 서버 IP:</span>
                    <code className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-black text-sm border border-amber-300 dark:border-amber-800 select-all">
                      {serverIp}
                    </code>
                  </div>
                  <button
                    onClick={handleCopyIp}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    {isCopiedIp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedIp ? "IP 복사 완료!" : "서버 IP 1초 복사"}</span>
                  </button>
                </div>

                {/* Step-by-Step Checklist */}
                <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 rounded-lg space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                    📌 업비트 API 발급 시 3단계 확인 사항:
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">① 권한 선택:</span>
                    <span><strong>[자산조회]</strong>, <strong>[주문조회]</strong>, <strong>[주문하기]</strong> 체크 (⚠️ '출금하기'는 체크 해제)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">② 허용 IP:</span>
                    <span>위 <strong className="font-mono text-amber-600 dark:text-amber-400">{serverIp}</strong> 를 [허용 IP 주소]에 붙여넣기</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-black">③ 키 등록:</span>
                    <span>발급된 Access Key와 Secret Key를 아래 입력 후 <strong>[1-Click 실시간 연결 검증]</strong> 클릭</span>
                  </div>
                </div>
              </div>

              {/* Upbit Input Form */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Access Key (엑세스 키)</span>
                    <span className="text-[10px] text-rose-500 font-bold">필수</span>
                  </label>
                  <input
                    type="text"
                    placeholder="업비트 발급 Access Key (공백 없이 입력)"
                    value={upbitKey}
                    onChange={(e) => setUpbitKey(e.target.value.trim())}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Secret Key (시크릿 키)</span>
                    <button
                      onClick={() => setShowUpbitSecret(!showUpbitSecret)}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                    >
                      {showUpbitSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showUpbitSecret ? "숨기기" : "보기"}</span>
                    </button>
                  </label>
                  <input
                    type={showUpbitSecret ? "text" : "password"}
                    placeholder="업비트 발급 Secret Key (공백 없이 입력)"
                    value={upbitSecret}
                    onChange={(e) => setUpbitSecret(e.target.value.trim())}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Direct Save Button inside Upbit section */}
              <button
                type="button"
                onClick={executeSaveUpbit}
                disabled={isSaving}
                className="w-full py-3 px-4 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>{isSaving ? "업비트 실계좌 연동 저장 중..." : "💾 업비트 API 키 영구 저장 및 실계좌 연동 완료"}</span>
              </button>
            </div>
          )}

          {/* KOREA INVESTMENT TAB FORM */}
          {activeTab === "KOREA" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {brokerApiError?.korea && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 rounded-xl space-y-2 animate-in fade-in shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-extrabold text-xs">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>[한국투자증권 실거래 연동 안내] {brokerApiError.korea.errorMessage}</span>
                    </div>
                    <button
                      onClick={() => clearBrokerError("korea")}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline shrink-0 cursor-pointer font-bold"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}

              {/* Guide Banner */}
              <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 mt-0.5 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="font-black flex items-center justify-between">
                    <span>한국투자증권 KIS Developers Open API 안내</span>
                    <a
                      href="https://apiportal.koreainvestment.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>포털 바로가기</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    한국투자증권 포털에서 발급받은 <strong>실전투자 AppKey</strong>와 <strong>AppSecret</strong>을 등록하시면 실계좌 잔고 실시간 동기화와 국내/해외주식 실체결 매매가 100% 자동 실행됩니다.
                  </div>
                </div>
              </div>

              {/* Input Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>AppKey (앱 키)</span>
                    <span className="text-[10px] text-rose-500 font-bold">필수</span>
                  </label>
                  <input
                    type="text"
                    placeholder="한국투자증권 발급 실전 AppKey"
                    value={koreaKey}
                    onChange={(e) => setKoreaKey(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>AppSecret (앱 시크릿)</span>
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                    >
                      {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSecret ? "숨기기" : "보기"}</span>
                    </button>
                  </label>
                  <input
                    type={showSecret ? "text" : "password"}
                    placeholder="한국투자증권 발급 AppSecret"
                    value={koreaSecret}
                    onChange={(e) => setKoreaSecret(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>종합계좌번호 (앞 8자리)</span>
                    <span className="text-[10px] text-slate-400 font-mono">예: 12345678</span>
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="12345678"
                    value={koreaAccountNo}
                    onChange={(e) => setKoreaAccountNo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>계좌상품코드 (뒤 2자리)</span>
                    <span className="text-[10px] text-slate-400 font-mono">기본값: 01 (종합매매)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="01"
                    value={koreaAccountCode}
                    onChange={(e) => setKoreaAccountCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Direct Save Button inside Korea section */}
              <button
                type="button"
                onClick={executeSaveKorea}
                disabled={isSaving}
                className="w-full py-3 px-4 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>{isSaving ? "한국투자증권 실계좌 연동 저장 중..." : "💾 한국투자증권 API 키 영구 저장 및 실계좌 연동 완료"}</span>
              </button>
            </div>
          )}

          {/* Test & Verification Result Box */}
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>{activeTab === "UPBIT" ? "업비트(Upbit)" : "한국투자증권(KIS)"} 실시간 연결 검증</span>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                <span>{isTesting ? "검증 중..." : "1-Click 실시간 연결 검증"}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                testResult.success 
                  ? "bg-emerald-950/80 border-emerald-700 text-emerald-200" 
                  : "bg-rose-950/80 border-rose-700 text-rose-200"
              }`}>
                <div className="font-bold flex items-start gap-2">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                  <div className="space-y-1">
                    <div>{testResult.message}</div>
                    {!testResult.success && activeTab === "UPBIT" && (
                      <div className="mt-2 p-2.5 bg-black/40 rounded-lg border border-rose-500/30 text-[11px] text-slate-200 space-y-1.5 font-normal">
                        <div className="font-bold text-amber-400">🛠️ 업비트 연동 오류 해결 가이드:</div>
                        <div>1. 업비트 [Open API 관리]에서 <strong>[허용 IP 주소]</strong>에 현재 서버 IP (<code className="text-amber-300 font-mono font-bold">{serverIp}</code>)가 추가되어 있는지 확인하세요.</div>
                        <div>2. <strong>[자산조회]</strong> 및 <strong>[주문하기]</strong> 권한이 체크되어 있는지 확인하세요.</div>
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            onClick={handleCopyIp}
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>서버 IP ({serverIp}) 복사</span>
                          </button>
                          <a
                            href="https://upbit.com/mypage/open_api_management"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] flex items-center gap-1 transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>업비트 API 관리 열기</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {testResult.balance && (
                  <div className="font-mono text-[11px] text-emerald-300 bg-emerald-900/40 p-2 rounded border border-emerald-800/40">
                    {testResult.balance}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelAndDisconnectAll}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-300 dark:border-rose-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>실거래 API 연동 해제</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (purgeAllMockData) await purgeAllMockData();
                addToast({
                  type: "SUCCESS",
                  title: "모의 가상데이터 삭제 완료",
                  message: "모든 모의/가상 계좌 데이터 및 잔고가 0원으로 완전히 초기화되었습니다."
                });
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-300 dark:border-amber-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-600" />
              <span>모의 데이터 전체 삭제</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              닫기
            </button>

            <button
              onClick={activeTab === "ALL" ? executeSaveAll : (activeTab === "UPBIT" ? executeSaveUpbit : executeSaveKorea)}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-xs flex items-center gap-1.5 ${
                activeTab === "ALL" 
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500" 
                  : (activeTab === "UPBIT" ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700")
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isSaving 
                  ? "저장 중..." 
                  : (activeTab === "ALL" ? "전체 API 일괄 등록 및 실거래 연동" : `${activeTab === "UPBIT" ? "업비트" : "한국투자증권"} API 저장 및 실계좌 연동`)}
              </span>
            </button>
          </div>
        </div>

        {/* 실거래 시작 확인 팝업 모달 */}
        {showConfirmStartLiveTrading && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <span>{activeTab === "UPBIT" ? "업비트(Upbit)" : "한국투자증권(KIS)"} 실거래 연동을 활성화하시겠습니까?</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    실거래 모드 활성화 시 <strong>기존 모든 모의 가상 테스트 데이터가 완전히 초기화(0원)</strong>되며, 실제 거래소 Open API의 실시간 실계좌 잔고와 체결 내역만 반영됩니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmStartLiveTrading(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer text-center"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmStartTrading}
                  className="py-2.5 px-4 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20 text-center"
                >
                  확인 (실거래 연동 및 초기화)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
