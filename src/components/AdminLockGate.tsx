import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Key, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";

interface AdminLockGateProps {
  onUnlock: () => void;
}

export const AdminLockGate: React.FC<AdminLockGateProps> = ({ onUnlock }) => {
  const [savedPasscode, setSavedPasscode] = useState<string | null>(null);
  const [inputPasscode, setInputPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isFirstSetup, setIsFirstSetup] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem("aistock_admin_password");
    if (!existing) {
      setIsFirstSetup(true);
    } else {
      setSavedPasscode(existing);
      setIsFirstSetup(false);
    }
  }, []);

  const handleSetupPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPasscode.length < 4) {
      setErrorMsg("비밀번호는 최소 4자리 이상으로 설정해야 합니다.");
      return;
    }
    if (inputPasscode !== confirmPasscode) {
      setErrorMsg("입력한 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    localStorage.setItem("aistock_admin_password", inputPasscode);
    localStorage.setItem("aistock_admin_unlocked", "true");
    setSavedPasscode(inputPasscode);
    setIsFirstSetup(false);
    onUnlock();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = localStorage.getItem("aistock_admin_password") || "1234";
    if (inputPasscode === stored) {
      localStorage.setItem("aistock_admin_unlocked", "true");
      setErrorMsg("");
      onUnlock();
    } else {
      setErrorMsg("관리자 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Icon */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-zinc-900 text-emerald-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-zinc-800">
            {isFirstSetup ? <Key className="h-7 w-7 text-amber-400" /> : <Lock className="h-7 w-7 text-emerald-400" />}
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">
              {isFirstSetup ? "시스템 관리자 암호 최초 설정" : "관리자 보안 인증"}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {isFirstSetup 
                ? "AISTOCK 24 실시간 관제센터 접근을 위해 사용할 마스터 관리자 비밀번호를 등록해 주세요."
                : "등록된 관리자 비밀번호를 입력해야 시스템 대시보드에 접근할 수 있습니다."}
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        {isFirstSetup ? (
          <form onSubmit={handleSetupPassword} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">신규 관리자 비밀번호 (4자리 이상)</label>
              <input
                type="password"
                required
                autoFocus
                placeholder="비밀번호 입력..."
                value={inputPasscode}
                onChange={(e) => {
                  setInputPasscode(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full border border-zinc-200 p-3 rounded-xl font-mono text-center font-black text-lg tracking-widest text-zinc-900 focus:border-zinc-800 focus:outline-hidden bg-zinc-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">비밀번호 확인</label>
              <input
                type="password"
                required
                placeholder="비밀번호 재입력..."
                value={confirmPasscode}
                onChange={(e) => {
                  setConfirmPasscode(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full border border-zinc-200 p-3 rounded-xl font-mono text-center font-black text-lg tracking-widest text-zinc-900 focus:border-zinc-800 focus:outline-hidden bg-zinc-50/50"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>관리자 암호 등록 및 관제센터 진입</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">관리자 비밀번호 입력</label>
              <input
                type="password"
                required
                autoFocus
                placeholder="비밀번호..."
                value={inputPasscode}
                onChange={(e) => {
                  setInputPasscode(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full border border-zinc-200 p-3.5 rounded-xl font-mono text-center font-black text-xl tracking-widest text-zinc-900 focus:border-zinc-800 focus:outline-hidden bg-zinc-50/50"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>관제센터 보안 접속</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-[11px] text-center text-zinc-400">
              * 초기 설정 비밀번호를 분실하신 경우 브라우저 저장소를 초기화하면 재설정 가능합니다.
            </p>
          </form>
        )}

        <div className="pt-2 border-t border-zinc-150 text-center">
          <span className="text-[10px] text-zinc-400 font-mono">AISTOCK 24 SECURE GATEWAY v3.5</span>
        </div>
      </div>
    </div>
  );
};
