import React, { useState, useEffect } from "react";
import { 
  Download, 
  Smartphone, 
  Monitor, 
  X, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Zap,
  Layers,
  Info
} from "lucide-react";

import { useModalScrollLock } from "../hooks/useModalScrollLock";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  useModalScrollLock(isOpen);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
    }

    // Detect OS platform
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    setIsAndroid(/Android/.test(ua));

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setInstallSuccess(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstallSuccess(true);
      }
      setDeferredPrompt(null);
    } else {
      // If inside iframe or browser without prompt, offer direct new tab / window launch
      window.open(window.location.href, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 p-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg shrink-0">
              <Download className="w-7 h-7 text-cyan-200 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-400/30 text-cyan-100 border border-cyan-300/40 uppercase">
                  PWA APP INSTALL
                </span>
                <span className="text-[10px] font-mono text-cyan-200">v4.0.2</span>
              </div>
              <h3 className="text-lg font-black tracking-tight mt-0.5">
                AISTOCK 24 앱 다운로드 &amp; 홈 화면 설치
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">

          {isStandalone ? (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-black text-emerald-300">이미 독립 앱(PWA)으로 구동 중입니다</h4>
              <p className="text-xs text-slate-300">
                AISTOCK 24가 고성능 네이티브 앱 환경에서 24시간 자율주식 매매 및 가상자산 관제를 수행하고 있습니다.
              </p>
            </div>
          ) : installSuccess ? (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
              <h4 className="text-sm font-black text-emerald-300">앱 설치가 완수되었습니다!</h4>
              <p className="text-xs text-slate-300">
                기기의 바탕화면 또는 앱 목록에서 [AISTOCK 24] 아이콘을 터치하여 네이티브 앱으로 바로 실행하실 수 있습니다.
              </p>
            </div>
          ) : (
            <>
              {/* Features Pill */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold font-mono">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <Zap className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <span className="text-slate-300 block">초고속 0.1초</span>
                  <span className="text-[9px] text-slate-500">독립 앱 로딩</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="text-slate-300 block">24시간 오프라인</span>
                  <span className="text-[9px] text-slate-500">오프라인 쉘 보존</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <Sparkles className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                  <span className="text-slate-300 block">푸시 알림</span>
                  <span className="text-[9px] text-slate-500">매매 신호 수신</span>
                </div>
              </div>

              {/* Install Action CTA */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-cyan-500/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span>{deferredPrompt ? "지금 바로 1초 앱 다운로드 설치" : "새 창에서 앱 열기 & 설치 시작"}</span>
                </button>
              </div>

              {/* Instructions per OS Platform */}
              <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <h5 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Info className="w-3.5 h-3.5 text-cyan-400" /> 기기별 수동 앱 추가 가이드
                </h5>

                {isIOS ? (
                  <div className="space-y-1.5 text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-start gap-2 text-cyan-300 font-bold">
                      <Share className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>iPhone/iPad (Safari 브라우저):</span>
                    </div>
                    <p className="text-slate-400 pl-6">
                      1. 화면 하단 <b>[공유 아이콘]</b>을 터치합니다.<br />
                      2. 목록에서 <b>[홈 화면에 추가]</b>를 선택하면 바탕화면에 앱이 생성됩니다.
                    </p>
                  </div>
                ) : isAndroid ? (
                  <div className="space-y-1.5 text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-start gap-2 text-emerald-300 font-bold">
                      <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Android (Chrome / Samsung Internet):</span>
                    </div>
                    <p className="text-slate-400 pl-6">
                      1. 우측 상단 메뉴(⋮)를 터치합니다.<br />
                      2. <b>[앱 설치]</b> 또는 <b>[홈 화면에 추가]</b>를 누르면 설치 완료됩니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-start gap-2 text-indigo-300 font-bold">
                      <Monitor className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>PC / Mac 데스크톱 (Chrome / Edge):</span>
                    </div>
                    <p className="text-slate-400 pl-6">
                      1. 브라우저 주소창 우측 상단의 <b>[앱 설치 ⬇️]</b> 아이콘을 클릭하거나 상단 버튼을 눌러 데스크톱 독(Dock)/바탕화면에 앱으로 설치하실 수 있습니다.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>AISTOCK 24 PWA System</span>
          <button
            onClick={() => window.open(window.location.href, "_blank")}
            className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <span>전체 화면 독립 실행</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

      </div>
    </div>
  );
};
