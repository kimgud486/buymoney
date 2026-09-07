import React, { useState } from "react";
import { 
  X, 
  Building2, 
  Globe2, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  Lock, 
  AlertTriangle, 
  Cpu, 
  Smartphone, 
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Zap
} from "lucide-react";

interface RealTradeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealTradeGuideModal: React.FC<RealTradeGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"korea" | "us" | "toss" | "security">("korea");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-zinc-200 overflow-hidden my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-zinc-900 text-white p-5 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">증권사 실계좌 연동 & 실거래 가이드</h3>
                <span className="text-[10px] bg-emerald-500 text-zinc-950 font-black px-2 py-0.5 rounded font-mono uppercase">
                  100% Real Live Trade
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                한국투자증권(KIS), 토스증권, 업비트 실계좌 OpenAPI 발급 및 실시간 자동매매 연동 절차
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 p-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("korea")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "korea"
                ? "bg-white text-emerald-700 shadow-sm border border-emerald-200/80 font-black"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>한국투자증권 (국내주식)</span>
          </button>

          <button
            onClick={() => setActiveTab("us")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "us"
                ? "bg-white text-blue-700 shadow-sm border border-blue-200/80 font-black"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Globe2 className="h-4 w-4" />
            <span>한국투자증권 (미국/해외주식)</span>
          </button>

          <button
            onClick={() => setActiveTab("toss")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "toss"
                ? "bg-white text-blue-600 shadow-sm border border-blue-200 font-black"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Smartphone className="h-4 w-4 text-blue-500" />
            <span>토스증권 (Toss Invest)</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "security"
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-300 font-black"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>보안 & 리스크 관리</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto font-sans">
          {/* TAB 1: 한국투자증권 KIS */}
          {activeTab === "korea" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider font-mono">
                    KIS OPEN API (OAuth 2.0)
                  </span>
                  <h4 className="text-sm font-bold text-emerald-950 mt-0.5">
                    한국투자증권 실계좌 KIS Open API 발급 가이드
                  </h4>
                  <p className="text-xs text-emerald-800/90 mt-1">
                    한국투자증권 KIS Developers를 통해 실계좌용 APP Key 및 APP Secret을 발급받아 등록하시면 real-time 시세 및 실전 주식 매매가 가능합니다.
                  </p>
                </div>
                <a 
                  href="https://apiportal.koreainvestment.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 shrink-0 font-mono"
                >
                  <span>KIS Developers 접속</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Step By Step List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                  실계좌 연동 단계별 가이드
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 font-mono block">STEP 1</span>
                    <h6 className="text-xs font-bold text-zinc-900">KIS Developers 회원가입 및 로그인</h6>
                    <p className="text-[11px] text-zinc-600 leading-normal">
                      한국투자증권 계좌를 보유한 본인 명의 아이디로 KIS Developers 포털에 로그인합니다.
                    </p>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 font-mono block">STEP 2</span>
                    <h6 className="text-xs font-bold text-zinc-900">[앱생성] 메뉴 이동 후 "실전계좌" 선택</h6>
                    <p className="text-[11px] text-zinc-600 leading-normal">
                      마이페이지 또는 API 신청 메뉴에서 반드시 **실전계좌**를 선택하고 앱을 생성합니다. (모의계좌 선택 금지)
                    </p>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 font-mono block">STEP 3</span>
                    <h6 className="text-xs font-bold text-zinc-900">APP Key 및 APP Secret 발급받기</h6>
                    <p className="text-[11px] text-zinc-600 leading-normal">
                      발급된 영문/숫자 혼합 36자리 **APP Key**와 **APP Secret** 문자열을 복사합니다.
                    </p>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 font-mono block">STEP 4</span>
                    <h6 className="text-xs font-bold text-zinc-900">계좌번호 (CANO) 및 상품코드 확인</h6>
                    <p className="text-[11px] text-zinc-600 leading-normal">
                      주식계좌 8자리 번호(예: 12345678)와 계좌 상품코드(기본 01 주식위탁)를 준비합니다.
                    </p>
                  </div>
                </div>

                {/* Final Input Guidance Box */}
                <div className="p-4 bg-zinc-900 text-white rounded-lg space-y-2 border border-zinc-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>AISTOCK 24 등록 절차</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    상단 메뉴 [증권사 연동 설정] &gt; [한국투자증권] 탭에 접속하여 발급받은 **App Key**, **App Secret**, **계좌번호(8자리)**를 입력하고 [보안 저장]을 누르면, AES-256 암호화 저장 후 즉시 실계좌 관제 및 실전 매매가 활성화됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 한국투자증권 (미국/해외주식) */}
          {activeTab === "us" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-mono">
                    KIS OVERSEAS TRADING API
                  </span>
                  <h4 className="text-sm font-bold text-blue-950 mt-0.5">
                    한국투자증권 미국/해외주식 실계좌 연동 가이드
                  </h4>
                  <p className="text-xs text-blue-800/90 mt-1">
                    한국투자증권 KIS Open API를 연동하여 미국 NASDAQ, NYSE 해외주식 실시간 매매를 집행합니다.
                  </p>
                </div>
                <a 
                  href="https://openapi.koreainvestment.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 shrink-0 font-mono"
                >
                  <span>KIS Developers</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                  KIS 해외주식 API 활성화 절차
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 font-mono block">STEP 1</span>
                    <h6 className="text-xs font-bold text-zinc-900">해외주식 거래 신청</h6>
                    <p className="text-[11px] text-zinc-600 leading-normal">
                      한국투자증권 앱/HTS에서 해외주식 거래 서비스를 신청합니다.
                    </p>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 font-mono block">STEP 2</span>
                    <h6 className="text-xs font-bold text-zinc-900">KIS Developers AppKey 발급</h6>
                    <p className="text-[11px] text-zinc-600 leading-normal">
                      한국투자증권 openapi 포털에서 해외주식 API 서비스를 신청하여 AppKey/AppSecret을 발급받습니다.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 text-white rounded-lg space-y-2 border border-zinc-800">
                  <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>통합 KIS API 키 하나로 국내/해외 동시 가동</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    [API 마스터 등록] 탭에서 **한국투자증권 AppKey**와 **AppSecret**을 입력하시면 국내주식과 해외주식이 동일한 실계좌 인증으로 가동됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 토스증권 (Toss Invest) */}
          {activeTab === "toss" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider font-mono">
                    TOSS SECURITIES OPEN API
                  </span>
                  <h4 className="text-sm font-bold text-blue-950 mt-0.5">
                    토스증권(Toss Invest) 실계좌 API 연동 가이드
                  </h4>
                  <p className="text-xs text-blue-800/90 mt-1">
                    토스증권 계좌를 연동하여 실시간 잔고 조회, 예수금 현황, 보유 종목 및 자동매매 주문 파이프라인을 구축합니다.
                  </p>
                </div>
                <a 
                  href="https://tossinvest.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 shrink-0 font-mono"
                >
                  <span>토스증권 바로가기</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                  토스증권 연동 단계
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 font-mono block">STEP 1</span>
                    <h6 className="text-xs font-bold text-zinc-900">토스증권 계좌 준비</h6>
                    <p className="text-[11px] text-zinc-600 leading-normal">
                      토스 앱 내 [토스증권] 계좌를 개설하고 계좌번호를 확인합니다.
                    </p>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 font-mono block">STEP 2</span>
                    <h6 className="text-xs font-bold text-zinc-900">API Key & Secret 등록</h6>
                    <p className="text-[11px] text-zinc-600 leading-normal">
                      [API 마스터 등록] 또는 [증권사 연동 모달]의 3번 토스증권 탭에서 Key/Secret 및 계좌번호를 입력하고 저장합니다.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 text-white rounded-lg space-y-2 border border-zinc-800">
                  <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>실시간 잔고 동기화 및 3대 자산 분산 포트폴리오</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    토스증권 계좌가 연결되면 한국투자증권(국내/해외), 업비트 가상자산과 함께 [실거래 & 자산 포트폴리오] 탭에서 통합 원화 예수금과 평가자산이 실시간 자동 집계됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 보안 & 리스크 관리 */}
          {activeTab === "security" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-zinc-900 text-white p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
                  <ShieldAlert className="h-4 w-4" />
                  <span>실거래 보안 및 계좌 안전 관리 규정</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  AISTOCK 24는 사용자 계좌 자산 보호와 100% 안전한 실거래 집행을 위해 다음과 같은 최상위 보안 체계를 적용하고 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-zinc-200 rounded-lg bg-zinc-50 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    <span>AES-256-CBC 클라이언트 암호화</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-normal">
                    입력하신 증권사 APP Key 및 Secret Key는 단방향 암호화 처리되어 브라우저 및 데이터베이스 상에 일반 텍스트로 절대 저장되지 않습니다.
                  </p>
                </div>

                <div className="p-4 border border-zinc-200 rounded-lg bg-zinc-50 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <span>자동 서킷브레이커 (Stop-loss)</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-normal">
                    설정하신 일일 최대 손실률(-2.0% ~ -5.0%)에 도달할 경우, AI 자동매매 엔진이 즉시 긴급 정지되며 보유 종목 손절을 수행합니다.
                  </p>
                </div>

                <div className="p-4 border border-zinc-200 rounded-lg bg-zinc-50 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900">
                    <Cpu className="h-4 w-4 text-blue-600" />
                    <span>AI 매수 승인 모드</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-normal">
                    AI 알고리즘이 매수 신호를 포착하더라도, 사용자가 팝업 제안서에서 최종 [승인] 버튼을 누를 때에만 실계좌 주문이 발송되는 안전 모드를 기본 제공합니다.
                  </p>
                </div>

                <div className="p-4 border border-zinc-200 rounded-lg bg-zinc-50 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-900">
                    <ShieldCheck className="h-4 w-4 text-purple-600" />
                    <span>비밀번호 & 출금 권한 제한</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-normal">
                    증권사 API는 매수/매도 주문권한 전용 키를 사용하며, 출금 및 이체 권한은 절대 요구하지 않으므로 자산 이체가 불가능하여 안전합니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs">
          <p className="text-zinc-500 font-mono text-[11px]">
            도움이 더 필요하신가요? 상단 [AI 전략 대화] 탭에서 수석 AI 매니저에게 실시간으로 질문하세요.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded transition cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
