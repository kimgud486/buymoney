import React, { useState, useEffect } from "react";
import { Coins, Check, X, Sparkles, RefreshCcw, ShieldAlert } from "lucide-react";
import { useApp } from "../context/AppContext";

interface EditMockBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditMockBalanceModal: React.FC<EditMockBalanceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, updateProfileSettings, purgeAllMockData, addToast } = useApp();
  const [balanceInput, setBalanceInput] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const currentBal = typeof profile?.balance === 'number' ? profile.balance : 1000000;
      setBalanceInput((currentBal ?? 0).toLocaleString());
    }
  }, [isOpen, profile?.balance]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (!rawVal) {
      setBalanceInput("");
      return;
    }
    const num = parseInt(rawVal, 10);
    setBalanceInput((num ?? 0).toLocaleString());
  };

  const handleSelectPreset = (amount: number) => {
    setBalanceInput((amount ?? 0).toLocaleString());
  };

  const handleReset1Million = async () => {
    await updateProfileSettings({ balance: 1000000, initialBalance: 1000000 });
    if (purgeAllMockData) {
      await purgeAllMockData();
    }
    setBalanceInput("1,000,000");
    if (addToast) {
      addToast({
        type: "SUCCESS",
        title: "🎯 기초예수금 100만원 초기화 완료",
        message: "기존 모의 보유 종목을 비우고 예수금을 깔끔하게 1,000,000원(100만원)으로 초기화했습니다.",
      });
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = Number(balanceInput.replace(/[^0-9]/g, ""));
    if (isNaN(cleanNum) || cleanNum < 0) {
      if (addToast) {
        addToast({
          type: "WARNING",
          title: "유효하지 않은 금액",
          message: "0원 이상의 올바른 예수금 금액을 입력해 주세요.",
        });
      }
      return;
    }

    await updateProfileSettings({ balance: cleanNum, initialBalance: cleanNum });
    if (addToast) {
      addToast({
        type: "SUCCESS",
        title: "💰 모의자산 설정 완료",
        message: `모의투자 예수금이 ${(cleanNum ?? 0).toLocaleString()}원으로 성공적으로 변경되었습니다.`,
      });
    }
    onClose();
  };

  const numericVal = Number(balanceInput.replace(/[^0-9]/g, "")) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900 p-4 px-5 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 border border-blue-400/40 rounded-xl">
              <Coins className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">💰 모의투자 자산(예수금) 설정</h3>
              <p className="text-xs text-blue-200">가상 시뮬레이션 시작 총자산을 자유롭게 변경하세요.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Quick 100만원 Reset Banner */}
          <div className="p-3 bg-indigo-950/60 border border-indigo-700/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-indigo-200">
                <RefreshCcw className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>🎯 기초예수금 100만원 원터치 초기화</span>
              </div>
              <span className="text-[10px] bg-indigo-900 text-cyan-300 px-2 py-0.5 rounded font-mono font-bold">
                RECOMMENDED
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              기존 모의 보유종목(약 5,900만원)을 깔끔히 비우고 예수금을 <strong>정확히 1,000,000원(100만원)</strong>으로 초기화합니다.
            </p>
            <button
              type="button"
              onClick={handleReset1Million}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>100만원 초기화 (총자산 100만원 설정)</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              ⚡ 빠른 금액 선택
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "100만원", val: 1000000 },
                { label: "1천만원", val: 10000000 },
                { label: "3천만원", val: 30000000 },
                { label: "5천만원", val: 50000000 },
                { label: "1억원", val: 100000000 },
                { label: "10억원", val: 1000000000 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleSelectPreset(item.val)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                    numericVal === item.val
                      ? "bg-blue-600 text-white border-blue-400 shadow-md"
                      : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              직접 금액 입력 (단위: 원)
            </label>
            <div className="relative">
              <input
                type="text"
                value={balanceInput}
                onChange={handleInputChange}
                placeholder="예: 50,000,000"
                className="w-full pl-4 pr-12 py-3 bg-slate-950 border border-slate-700 rounded-xl text-lg font-black font-mono text-white focus:outline-none focus:border-blue-500 transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                원
              </span>
            </div>
            <p className="text-[11px] text-blue-300 mt-1.5 flex items-center gap-1 font-mono">
              <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
              설정될 모의 예수금: <strong>{(numericVal ?? 0).toLocaleString()} 원</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-extrabold transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>설정 저장하기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
