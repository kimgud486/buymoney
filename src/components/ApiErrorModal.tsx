import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  AlertTriangle, 
  X, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileCode2, 
  HelpCircle, 
  Zap,
  ArrowRight,
  ShieldAlert,
  Server
} from "lucide-react";
import { BrokerErrorDetails } from "../types";

interface ApiErrorModalProps {
  brokerKey: 'korea' | 'upbit';
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSettings?: () => void;
}

export const ApiErrorModal: React.FC<ApiErrorModalProps> = ({
  brokerKey,
  isOpen,
  onClose,
  onNavigateToSettings
}) => {
  const { profile, brokerApiError, setBrokerError, clearBrokerError, updateProfileSettings } = useApp();
  const [copied, setCopied] = useState(false);
  const [ipCopied, setIpCopied] = useState(false);
  const [serverIp, setServerIp] = useState<string>("로딩 중...");
  const [isFixing, setIsFixing] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetch("/api/server-ip")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.formatted) {
            setServerIp(data.formatted);
          } else if (data.ip1) {
            setServerIp(data.ip1);
          } else {
            setServerIp("확인 불가");
          }
        })
        .catch(() => setServerIp("확인 불가"));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const err: BrokerErrorDetails = brokerApiError[brokerKey] || {
    brokerName: brokerKey === "korea" ? "한국투자증권 (KIS Open API)" : "업비트 (Upbit Open API)",
    errorCode: brokerKey === "upbit" ? "invalid_access_key" : "EGW00123",
    errorMessage: brokerKey === "upbit" 
      ? "업비트 Open API Access Key/Secret Key 자격증명이 올바르지 않거나, 허용 IP 주소가 등록되지 않았습니다." 
      : "한국투자증권 OpenAPI 인증 세션이 비정상 종료되었거나 APPKey/Secret 자격증명이 올바르지 않습니다.",
    endpoint: brokerKey === "upbit" ? "https://api.upbit.com/v1/orders" : "https://openapi.koreainvestment.com:9443/oauth2/tokenP",
    httpStatus: 401,
    timestamp: new Date().toISOString(),
    rawResponse: {
      error: {
        name: brokerKey === "upbit" ? "invalid_access_key" : "EGW00123",
        message: brokerKey === "upbit" ? "잘못된 엑세스 키입니다. API 자격증명 및 허용 IP Whitelist 설정을 확인해 주세요." : "유효하지 않은 APPKEY 및 APPSECRET입니다."
      }
    },
    resolutionGuide: brokerKey === "upbit" ? [
      "1. 업비트 [API 관리](https://upbit.com/service_center/open_api) 메뉴에서 Access Key와 Secret Key가 맞는지 확인",
      "2. 업비트 [API 관리] -> [허용 IP 주소]에 현재 앱 서버의 공인 IP가 추가되어 있는지 확인",
      "3. Open API 발급 시 '자산조회' 및 '주문하기' 권한이 활성화되어 있는지 확인"
    ] : [
      "1. KIS Developers 포털(apiportal.koreainvestment.com) [마이페이지 > API 신청]에서 APP Key/Secret 재검증",
      "2. KIS OpenAPI 실전계좌 자격증명 상태 및 연결 권한 체크",
      "3. KIS 개발자 포털 내 접속 허용 IP Whitelist 항목에 현재 IP 등록"
    ]
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(err.rawResponse || err, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoFix = async () => {
    setIsFixing(true);
    try {
      const currentAccount = profile?.koreaAccountNo || "";
      const currentCode = profile?.koreaAccountCode || "01";

      await updateProfileSettings({
        koreaAccountNo: currentAccount,
        koreaAccountCode: currentCode
      });

      clearBrokerError(brokerKey);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white border border-rose-200 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden space-y-0 text-zinc-900 my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="bg-rose-900 text-white p-5 flex items-center justify-between border-b border-rose-800">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-rose-500 text-white font-bold px-2 py-0.5 rounded font-mono">
                  ERROR {err.httpStatus || 401}
                </span>
                <span className="text-[11px] text-rose-200 font-mono font-bold">
                  코드: {err.errorCode}
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white mt-0.5">
                {err.brokerName} API 연결 오류 상세 리포트
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-rose-200 hover:text-white hover:bg-rose-800/80 rounded transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main Error Banner */}
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>접속 실패 원인 및 시스템 응답 메시지:</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {new Date(err.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-xs font-bold text-rose-950 leading-relaxed pl-5 font-sans">
              {err.errorMessage}
            </p>
          </div>

          {/* Endpoint & Connection Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-zinc-50 p-3 rounded border border-zinc-200 space-y-1">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">호출 엔드포인트 URL</span>
              <span className="font-bold text-zinc-800 break-all">{err.endpoint || "https://openapi.koreainvestment.com"}</span>
            </div>
            <div className="bg-zinc-50 p-3 rounded border border-zinc-200 space-y-1">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">응답 에러 코드 (msg_cd)</span>
              <span className="font-bold text-rose-700">{err.errorCode}</span>
            </div>
          </div>

          {/* Upbit IP Whitelist Quick Copy & Solution Banner */}
          {brokerKey === 'upbit' && (() => {
            const ipFromMsg = err.errorMessage?.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0] || (err.rawResponse as any)?.error?.serverIp;
            const activeIpToCopy = (serverIp && serverIp !== "로딩 중..." && serverIp !== "확인 불가") ? serverIp : (ipFromMsg || "34.34.226.130");

            return (
              <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-3 shadow-sm text-xs">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-amber-700 animate-pulse" />
                    <span className="font-extrabold text-amber-950">
                      🌐 업비트 OpenAPI 웹서버 IP 등록 솔루션 (IP 불일치 전용 해결)
                    </span>
                  </div>
                  <span className="bg-amber-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                    REQUIRED IP
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 block">현재 활성화된 웹서버 Outbound IP:</span>
                    <span className="text-base font-mono font-black text-zinc-900">{activeIpToCopy}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeIpToCopy);
                      setIpCopied(true);
                      setTimeout(() => setIpCopied(false), 2000);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {ipCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{ipCopied ? "웹서버 IP 복사완료! ✓" : `IP [ ${activeIpToCopy} ] 복사하기`}</span>
                  </button>
                </div>

                <p className="text-[11px] text-amber-950 leading-relaxed font-medium pt-1">
                  ⚠️ <strong>원인:</strong> 업비트 Open API는 보안상 승인된 IP에서만 주문 요청을 허용합니다.<br />
                  👉 <strong>조치:</strong> <a href="https://upbit.com/service_center/open_api" target="_blank" rel="noopener noreferrer" className="underline font-bold text-amber-800 hover:text-amber-950">업비트 [고객센터 &gt; Open API 사용 신청]</a>으로 이동 후, <strong>[특정 IP만 허용]</strong> 칸에 위 IP 주소(<strong>{activeIpToCopy}</strong>)를 복사해 붙여넣어 주세요! (필수 권한: <i>'자산조회'</i>, <i>'주문하기'</i>)
                </p>
              </div>
            );
          })()}

          {/* Resolution Guide */}
          {err.resolutionGuide && err.resolutionGuide.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-2">
              <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>권장 조치 및 문제 해결 가이드</span>
              </h4>
              <ul className="space-y-1.5 pl-5 list-disc text-xs text-amber-900 font-medium leading-relaxed">
                {err.resolutionGuide.map((guide, i) => (
                  <li key={i}>{guide}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Response JSON Viewer */}
          {err.rawResponse && (
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-2 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                  <FileCode2 className="h-4 w-4 text-emerald-400" />
                  <span>실제 OpenAPI 수신 응답 원본 (Raw JSON)</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] flex items-center gap-1 cursor-pointer transition"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "복사됨" : "JSON 복사"}</span>
                </button>
              </div>

              <pre className="p-2.5 bg-zinc-900/90 rounded text-[11px] overflow-x-auto text-rose-300 font-mono leading-relaxed max-h-48">
                {JSON.stringify(err.rawResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToSettings();
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>설정 탭 API 자격증명 등록으로 이동</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs rounded transition cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
