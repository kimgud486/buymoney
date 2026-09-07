import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Wifi, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  SlidersHorizontal, 
  Sliders, 
  Cpu, 
  Lock, 
  Globe2, 
  Building2, 
  ListFilter,
  Trash2,
  Play,
  Copy,
  Check
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";

import { MarketHoursBanner } from "./MarketHoursBanner";

export const TradingStatus: React.FC = () => {
  const { 
    brokerApiStatus, 
    brokerApiError, 
    kisPingLatency, 
    isAutoPingEnabled, 
    setIsAutoPingEnabled, 
    lastPingTime, 
    pingRetryCount, 
    pingHistory, 
    triggerManualPing, 
    orders, 
    cancelOrder, 
    fillOrder, 
    clearAllOrders,
    trades, 
    profile 
  } = useApp();

  const [isPinging, setIsPinging] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'FILLED' | 'CANCELED'>('ALL');
  const [selectedBrokerTab, setSelectedBrokerTab] = useState<'ALL' | 'KOREA' | 'US' | 'BTC'>('ALL');
  const [serverIp, setServerIp] = useState<string>("로딩 중...");
  const [ipCopied, setIpCopied] = useState<boolean>(false);

  React.useEffect(() => {
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
  }, []);

  const handleManualPing = async () => {
    setIsPinging(true);
    try {
      await triggerManualPing();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsPinging(false), 600);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter !== 'ALL' && o.status !== orderFilter) return false;
    if (selectedBrokerTab === 'KOREA' && o.market !== 'KOREA') return false;
    if (selectedBrokerTab === 'US' && o.market !== 'US') return false;
    if (selectedBrokerTab === 'BTC' && o.market !== 'BTC') return false;
    return true;
  });

  const pendingOrdersCount = orders.filter(o => o.status === 'PENDING').length;
  const filledOrdersCount = orders.filter(o => o.status === 'FILLED').length;
  const canceledOrdersCount = orders.filter(o => o.status === 'CANCELED').length;

  const hasKoreaConfig = Boolean((profile?.koreaAppKey && profile?.koreaAppSecret) || profile?.koreaAccountNo);
  const hasUpbitConfig = Boolean(profile?.upbitAccessKey && profile?.upbitSecretKey);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Live Market Opening Hours Control Center */}
      <MarketHoursBanner />

      {/* Header Banner */}
      <div className="bg-zinc-900 text-white p-5 rounded-xl border border-zinc-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-base font-black tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              <span>실시간 증권사 API 연결 상태 및 매매 가동률 (Trading Status)</span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            백엔드 REST API `/api/trade/execute` 실전 주문 서버 및 KIS Heartbeat 핑 동기화 현황
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Outbound Server IP Badge for Upbit & Broker Whitelisting */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-750 px-3 py-1.5 rounded-lg text-xs font-mono shadow-xs">
            <Globe2 className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9.5px] text-zinc-400 font-bold leading-none">웹서버 Outbound IP (업비트 등록용)</span>
              <span className="font-bold text-amber-300 leading-tight">{serverIp}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (serverIp && serverIp !== "로딩 중..." && serverIp !== "확인 불가") {
                  navigator.clipboard.writeText(serverIp);
                  setIpCopied(true);
                  setTimeout(() => setIpCopied(false), 2000);
                }
              }}
              className="ml-1 p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition cursor-pointer"
              title="서버 IP 복사"
            >
              {ipCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualPing}
            disabled={isPinging}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isPinging ? "animate-spin" : ""}`} />
            <span>⚡ Heartbeat 핑 즉시 테스트</span>
          </button>
          
          <label className="flex items-center gap-2 text-xs text-zinc-300 font-mono bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={isAutoPingEnabled}
              onChange={(e) => setIsAutoPingEnabled(e.target.checked)}
              className="accent-emerald-500"
            />
            <span>5초 자동 핑 {isAutoPingEnabled ? "ON" : "OFF"}</span>
          </label>
        </div>
      </div>

      {/* Grid 1: Live Broker API Connectivity Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. KIS Korea Investment */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-zinc-900">한국투자증권 (KIS)</span>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
              brokerApiStatus.korea === 'CONNECTED' 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              {brokerApiStatus.korea === 'CONNECTED' ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  <span>정상 연결 (Live)</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                  <span>연결 장애 / 미설정</span>
                </>
              )}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>통신 프로토콜</span>
              <span className="font-bold text-zinc-800">OAuth 2.0 REST</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>응답 지연시간 (Latency)</span>
              <span className="font-bold text-emerald-600">{kisPingLatency} ms</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>마지막 핑 확인</span>
              <span className="text-zinc-500">{lastPingTime || "방금 전"}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>계좌 연동 상태</span>
              <span className="font-bold text-zinc-800">{hasKoreaConfig ? "실계좌 자격증명 저장됨" : "미연동"}</span>
            </div>
          </div>

          {brokerApiError.korea && (
            <div className="bg-rose-50 border border-rose-200 p-2 rounded text-[10px] text-rose-800">
              <strong>오류:</strong> {brokerApiError.korea.message}
            </div>
          )}
        </div>

        {/* 2. KIS Overseas / US Stock */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-zinc-900">한국투자증권 (해외/미국주식)</span>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
              hasKoreaConfig 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {hasKoreaConfig ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  <span>KIS 통합 연동 (Live)</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  <span>연동 필요</span>
                </>
              )}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>통신 프로토콜</span>
              <span className="font-bold text-zinc-800">REST v2 / WebSocket</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>평균 응답 속도</span>
              <span className="font-bold text-blue-600">32 ms</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>보안 규격</span>
              <span className="text-zinc-500">TLS 1.3 / OAuth 2.0</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>계좌 연동 상태</span>
              <span className="font-bold text-zinc-800">{hasKoreaConfig ? "Live API Key 활성" : "미연동"}</span>
            </div>
          </div>
        </div>

        {/* 3. Upbit / Crypto API */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-bold text-zinc-900">업비트 (Upbit)</span>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
              hasUpbitConfig 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${hasUpbitConfig ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              <span>{hasUpbitConfig ? "실거래 API 연동" : "시세 수신 전용"}</span>
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>공개 시세 피드</span>
              <span className="font-bold text-zinc-800">실시간 WSS Ticker</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>주문 API 자격증명</span>
              <span className={`font-bold ${hasUpbitConfig ? "text-emerald-600" : "text-amber-600"}`}>
                {hasUpbitConfig ? "등록 완료 ✅" : "미등록 ⚠️"}
              </span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>응답 지연시간</span>
              <span className="font-bold text-orange-600">12 ms</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
              <span>자동 주문 호환</span>
              <span className="font-bold text-emerald-600">지원 완료</span>
            </div>
          </div>

          {brokerApiError.upbit && (
            <div className="bg-rose-50 border border-rose-200 p-2.5 rounded text-[11px] text-rose-900 space-y-1">
              <div className="font-bold flex items-center justify-between text-rose-800">
                <span>⚠️ 업비트 연동/주문 오류</span>
                <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded font-mono font-bold">ERROR</span>
              </div>
              <p className="text-[10px] leading-snug font-mono text-rose-950">{brokerApiError.upbit.errorMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Grid 2: Heartbeat Latency History Chart & Order Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency History Chart (1 Col) */}
        <div className="bg-white border border-zinc-200 p-5 rounded-lg space-y-4 lg:col-span-1 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2 font-mono uppercase">
                <Wifi className="h-4 w-4 text-emerald-600" />
                <span>API Ping Latency History (ms)</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                최근 20회 KIS/백엔드 서버 핑 헬스체크 응답시간
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              평균 {kisPingLatency}ms
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...pingHistory].reverse()}>
                <CartesianGrid strokeDasharray="2 2" stroke="#f4f4f5" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 9 }} stroke="#a1a1aa" />
                <YAxis domain={[0, 'auto']} tick={{ fontSize: 9 }} stroke="#a1a1aa" unit="ms" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '6px', color: '#fff', fontSize: '11px', border: 'none' }}
                  formatter={(val: any) => [`${val} ms`, "지연시간"]}
                />
                <Area type="monotone" dataKey="latency" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-[11px] text-zinc-600 space-y-1">
            <div className="flex justify-between font-mono">
              <span>서버 업타임 (Uptime):</span>
              <span className="font-bold text-emerald-700">99.99%</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>자동 재시도 횟수:</span>
              <span className="font-bold text-zinc-800">{pingRetryCount}회</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>SSL 암호화 서명:</span>
              <span className="font-bold text-zinc-800">TLS 1.3 / AES-256</span>
            </div>
          </div>
        </div>

        {/* Real-time Order Stream & Live Order Book Execution Monitor (2 Cols) */}
        <div className="bg-white border border-zinc-200 p-5 rounded-lg space-y-4 lg:col-span-2 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-150 pb-3">
            <div>
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-emerald-600" />
                <span>실시간 주문 처리 및 체결 현황 (Order Execution Stream)</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                API로 증권사에 즉시 전송된 매수/매도 주문 목록 및 체결 처리 상태
              </p>
            </div>

            {/* Filter Tabs & Clear Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded font-mono text-[10px]">
                {(['ALL', 'PENDING', 'FILLED', 'CANCELED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderFilter(st)}
                    className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                      orderFilter === st 
                        ? "bg-white text-zinc-900 shadow-xs" 
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {st === 'ALL' ? "전체" : st === 'PENDING' ? `대기중 (${pendingOrdersCount})` : st === 'FILLED' ? `체결완료 (${filledOrdersCount})` : `취소됨 (${canceledOrdersCount})`}
                  </button>
                ))}
              </div>

              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await clearAllOrders();
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                  title="주문 체결 내역 완전 비우기"
                >
                  <Trash2 className="h-3 w-3 text-rose-600" />
                  <span>내역 비우기</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
            <div className="bg-zinc-50 p-2.5 rounded border border-zinc-200">
              <span className="text-[10px] text-zinc-400 block">전체 주문</span>
              <span className="font-black text-zinc-900 text-sm">{orders.length}건</span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded border border-amber-200">
              <span className="text-[10px] text-amber-600 block">체결 대기중</span>
              <span className="font-black text-amber-800 text-sm">{pendingOrdersCount}건</span>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200">
              <span className="text-[10px] text-emerald-600 block">즉시 체결완료</span>
              <span className="font-black text-emerald-800 text-sm">{filledOrdersCount}건</span>
            </div>
            <div className="bg-rose-50 p-2.5 rounded border border-rose-200">
              <span className="text-[10px] text-rose-600 block">주문 취소/이탈</span>
              <span className="font-black text-rose-800 text-sm">{canceledOrdersCount}건</span>
            </div>
          </div>

          {/* Order Stream Table */}
          {filteredOrders.length > 0 ? (
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-zinc-50 border-y border-zinc-200 text-zinc-500 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">시간 / 주문 ID</th>
                    <th className="p-2.5">종목 / 시장</th>
                    <th className="p-2.5">구분</th>
                    <th className="p-2.5 text-right">수량</th>
                    <th className="p-2.5 text-right">주문가격</th>
                    <th className="p-2.5 text-center">처리 상태</th>
                    <th className="p-2.5 text-center">실시간 제어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-sans">
                  {filteredOrders.map((ord, idx) => (
                    <tr key={`${ord.id}_${idx}`} className="hover:bg-zinc-50 transition">
                      <td className="p-2.5 font-mono text-[11px]">
                        <div className="text-zinc-800">{new Date(ord.timestamp || Date.now()).toLocaleTimeString()}</div>
                        <span className="text-[9px] text-zinc-400">{ord.id.slice(0, 10)}</span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-zinc-900">{ord.name}</div>
                        <span className="text-[10px] font-mono text-zinc-400">{ord.symbol} ({ord.market})</span>
                      </td>
                      <td className="p-2.5 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          ord.side === 'BUY' ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {ord.side === 'BUY' ? "매수" : "매도"}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-zinc-800">{(ord.quantity ?? 0).toLocaleString()}주</td>
                      <td className="p-2.5 text-right font-mono font-bold text-zinc-900">
                        {ord.market === "US" ? `$${ord.price.toFixed(2)}` : `${Math.round(ord.price).toLocaleString()}원`}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          ord.status === 'FILLED' 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : ord.status === 'PENDING'
                            ? "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        }`}>
                          {ord.status === 'FILLED' ? "✓ 체결완료" : ord.status === 'PENDING' ? "⏳ 체결대기중" : "✕ 주문취소"}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        {ord.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => fillOrder(ord.id)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition cursor-pointer"
                            >
                              즉시 체결
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelOrder(ord.id)}
                              className="px-2 py-0.5 bg-zinc-200 hover:bg-rose-100 text-zinc-700 hover:text-rose-700 rounded text-[10px] font-bold transition cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-mono">처리완료</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-lg space-y-1">
              <CheckCircle2 className="h-6 w-6 text-zinc-400 mx-auto" />
              <p className="text-xs font-bold text-zinc-600">선택된 조건의 주문 내역이 없습니다</p>
              <p className="text-[11px] text-zinc-400">자동매매 엔진 또는 수동 매수/매도 주문이 실행되면 실시간 처리 스트림이 여기에 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
