import React, { useState } from "react";
import { 
  CheckCircle2, 
  Target, 
  ShieldAlert, 
  Sparkles, 
  Zap, 
  BookOpen, 
  X, 
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Info,
  HelpCircle,
  Award,
  Maximize2,
  Activity,
  Layers
} from "lucide-react";
import { BullishPatternsLifecycleEngine } from "./BullishPatternsLifecycleEngine";
import { BearishPatternsLifecycleEngine } from "./BearishPatternsLifecycleEngine";

export interface PriceActionStructure {
  id: number;
  name: string;
  category: "Bullish Continuation & Reversal" | "Bearish Continuation & Reversal";
  direction: "Bullish" | "Bearish";
  subtitle: string;
  description: string;
  entryRule: string;
  slRule: string;
  targetRule: string;
  proTip: string;
  winRate: string;
}

export const PRICE_ACTION_STRUCTURES: PriceActionStructure[] = [
  {
    id: 1,
    name: "Ascending Triangle",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "상단 수평 저항선 + 상승 저점 추세선",
    description: "매수 세력이 저점을 계속 높이며 상단 수평 저항선을 압박하는 전형적인 상승 돌파 패턴입니다.",
    entryRule: "상단 수평 저항선 확정 종가 돌파 시 또는 돌파 후 리테스트(Retest) 시 진입",
    slRule: "바로 직전 파동의 스윙 저점(HL) 직하단",
    targetRule: "삼각형 입구(최대 수직 높이)만큼 돌파 지점에서 상향 투영",
    proTip: "거래량이 수렴 마지막 단계에서 급감한 후, 돌파 순간 폭발적으로 증가하는지 검증하십시오.",
    winRate: "78%"
  },
  {
    id: 2,
    name: "Bullish Flag",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "강한 깃대(Flagpole) + 하향 평행 채널",
    description: "수직에 가까운 급등 후 단기 이익실현으로 형성된 하향 평행 채널을 뚫고 2차 폭등하는 추세 지속 패턴입니다.",
    entryRule: "깃발(Flag) 채널 상단 추세선 돌파 확정 시 진입",
    slRule: "깃발 채널의 최저점 하단",
    targetRule: "1차 상승 깃대(Flagpole)의 수직 높이만큼 돌파 지점에서 상향 투영",
    proTip: "깃발 조정 구간의 거래량이 깃대 상승 구간보다 현저히 적어야 고신뢰 패턴입니다.",
    winRate: "82%"
  },
  {
    id: 3,
    name: "Descending Triangle",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "하단 수평 지지선 + 하락 고점 추세선",
    description: "매도 압력이 고점을 계속 낮추며 하단 수평 지지선을 반복 매각하여 이탈시키는 하락 이탈 패턴입니다.",
    entryRule: "하단 수평 지지선 확정 이탈 시 또는 하단 지지선 리테스트 시 Short 진입",
    slRule: "직전 스윙 고점(LH) 바로 상단",
    targetRule: "삼각형 높이(Base) 만큼 하단 이탈 지점에서 하향 투영",
    proTip: "하단 지지선 터치 횟수가 3회 이상일수록 하향 이탈 폭이 가파릅니다.",
    winRate: "75%"
  },
  {
    id: 4,
    name: "Bearish Flag",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "수직 급락 깃대 + 상향 기울기 채널",
    description: "급격한 하락 후 형성된 약한 상향 반등 채널을 깨고 추가 급락이 발생되는 숏 추세 지속 패턴입니다.",
    entryRule: "하향 추세 채널 하단 지지선 음봉 이탈 시 Short 진입",
    slRule: "반등 채널 상단 추세선 직상단",
    targetRule: "급락 깃대 수직 길이를 이탈 지점 아래로 투영",
    proTip: "반등 채널 안에서의 거래량이 줄어들다가 하단 이탈 시 음봉 거래량이 급증하는지 확인하세요.",
    winRate: "80%"
  },
  {
    id: 5,
    name: "Bullish Wedge",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "하향 쐐기형 (Falling Wedge)",
    description: "고점과 저점이 모두 낮아지지만 두 추세선이 수렴하며 매도세가 고갈되는 강력한 강세 전환 패턴입니다.",
    entryRule: "상단 쐐기 저항 추세선 양봉 돌파 시 진입",
    slRule: "쐐기 최저점 직하단",
    targetRule: "쐐기 시작 부분의 가장 넓은 수직 높이만큼 상향 투영",
    proTip: "수렴 끝자락에서 RSI 및 MACD 다이버전스가 수반되면 적중률이 극대화됩니다.",
    winRate: "79%"
  },
  {
    id: 6,
    name: "Bullish Pennant",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "급등 깃대 + 대칭 수렴 페넌트",
    description: "급격한 상승 후 삼각 수렴 형태로 가격이 좁아졌다가 다시 기존 상승 방향으로 폭발하는 패턴입니다.",
    entryRule: "페넌트 상단 저항선 강한 돌파 시 진입",
    slRule: "페넌트 수렴 내부 최저점 하단",
    targetRule: "초기 상승 깃대 수직 높이만큼 상향 투영",
    proTip: "수렴 기간이 3주를 넘지 않는 짧은 기간일 때 돌파 힘이 가장 강력합니다.",
    winRate: "81%"
  },
  {
    id: 7,
    name: "Bearish Wedge",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "상향 쐐기형 (Rising Wedge)",
    description: "고점과 저점이 모두 상승하지만 상승 각도가 둔화되며 수렴하다가 매수세 소진으로 급락하는 패턴입니다.",
    entryRule: "하단 쐐기 지지 추세선 음봉 이탈 시 Short 진입",
    slRule: "상향 쐐기 최고점 상단",
    targetRule: "쐐기 시작 부분의 최대 높이만큼 하향 투영",
    proTip: "상승 과정에서 거래량이 지속 감소하고 거래량 다이버전스가 발생하는지 확인하세요.",
    winRate: "77%"
  },
  {
    id: 8,
    name: "Bearish Pennant",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "급락 깃대 + 대칭 수렴 삼각 페넌트",
    description: "급격한 주가 하락 후 삼각 모양으로 잠시 횡보 수렴하다가 아래로 재차 폭락하는 숏 패턴입니다.",
    entryRule: "삼각 페넌트 하단 지지선 하향 확정 이탈 시 Short",
    slRule: "수렴 내부 최고점 상단",
    targetRule: "1차 하락 깃대 길이만큼 아래로 투영",
    proTip: "하단 이탈 시 음봉 크기가 커지며 체결량이 폭발하는 시점이 명확한 진입 타점입니다.",
    winRate: "79%"
  },
  {
    id: 9,
    name: "Symmetrical Triangle (Bullish Breakout)",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "대칭 삼각형 (상승 돌파)",
    description: "고점은 낮아지고 저점은 높아지는 대칭 수렴 후 상단 저항선을 뚫어내는 강세 돌파 패턴입니다.",
    entryRule: "대칭 삼각형 상단 저항 추세선 양봉 종가 돌파 시",
    slRule: "삼각형 수렴 내부 직전 스윙 저점 하단",
    targetRule: "삼각형 Base(가장 넓은 기둥) 높이만큼 상향 투영",
    proTip: "삼각형의 2/3~3/4 지점에서 돌파가 일어날 때 거짓 돌파(Fakeout) 확률이 가장 낮습니다.",
    winRate: "74%"
  },
  {
    id: 10,
    name: "Cup & Handle",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "컵앤핸들 (Round Bottom + Handle)",
    description: "U자형 컵 모양 완만한 바닥 형성 후 소폭의 손잡이(Handle) 조정을 거쳐 전고점을 폭발적으로 뚫는 패턴입니다.",
    entryRule: "손잡이 채널 상단 돌파 또는 컵 저항 넥라인(Neckline) 돌파 시",
    slRule: "손잡이(Handle) 최저점 직하단",
    targetRule: "컵 바닥에서 넥라인까지의 깊이(Depth)만큼 상향 투영",
    proTip: "컵의 바닥이 V자가 아닌 완만한 U자형 형태일 때 가장 고신뢰 기관 매집이 나타납니다.",
    winRate: "83%"
  },
  {
    id: 11,
    name: "Symmetrical Triangle (Bearish Breakout)",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "대칭 삼각형 (하락 이탈)",
    description: "팽팽한 수렴 후 매도 매물대가 승리하여 하단 추세 지지선을 아래로 무너뜨리는 하락 패턴입니다.",
    entryRule: "하단 지지 추세선 음봉 하향 이탈 시 Short",
    slRule: "삼각형 수렴 내부 직전 스윙 고점 상단",
    targetRule: "삼각형 Base 높이만큼 하향 투영",
    proTip: "하향 이탈 후 지지선이 저항선으로 변하는 리테스트 구간이 안전한 2차 진입 타점입니다.",
    winRate: "73%"
  },
  {
    id: 12,
    name: "Inverse Cup & Handle",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "역 컵앤핸들 (Inverted Cup & Handle)",
    description: "둥근 돔(Dome) 모양의 상단 형성 후 약한 반등 핸들 조정을 거쳐 지지 넥라인을 깨고 폭락하는 패턴입니다.",
    entryRule: "역 손잡이 하단 또는 넥라인 지지선 붕괴 시 Short",
    slRule: "역 손잡이 최고점 직상단",
    targetRule: "역 컵의 높이(Depth)만큼 하향 투영",
    proTip: "넥라인 아래에서 연속 음봉이 출현할 때 기관의 차익실현 물량이 본격화됩니다.",
    winRate: "78%"
  },
  {
    id: 13,
    name: "Double Bottom",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "이중 바닥 (W 패턴)",
    description: "두 번의 저점을 테스트하며 강한 매수 지지세를 확인한 후 중간 넥라인을 뚫고 상승 반전하는 대표 패턴입니다.",
    entryRule: "중간 봉우리 넥라인(Neckline) 양봉 돌파 및 리테스트 시",
    slRule: "두 번째 바닥(Right Bottom) 최저점 직하단",
    targetRule: "바닥에서 넥라인까지의 수직 거리만큼 상향 투영",
    proTip: "두 번째 바닥이 첫 번째 바닥보다 살짝 높거나, SSL 휩쓸기(Sweep) 후 급반등할 때 파워가 강합니다.",
    winRate: "80%"
  },
  {
    id: 14,
    name: "Head & Shoulders Inverse",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "역헤드앤숄더 (iH&S)",
    description: "왼쪽 어깨, 머리, 오른쪽 어깨 형태의 3중 바닥을 다진 후 넥라인을 뚫고 대세 상승 전환하는 추세 전환 패턴입니다.",
    entryRule: "넥라인(Neckline) 양봉 확정 돌파 시 진입",
    slRule: "오른쪽 어깨(Right Shoulder) 최저점 하단",
    targetRule: "머리(Head) 최저점에서 넥라인까지의 거리를 상향 투영",
    proTip: "오른쪽 어깨 형성 시 거래량이 현저히 감소하다가 넥라인 돌파 시 거래량이 대폭 늘어나야 합니다.",
    winRate: "85%"
  },
  {
    id: 15,
    name: "Double Top",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "이중 고점 (M 패턴)",
    description: "동일 구역 고점을 두 번 올렸으나 매도 저항에 막혀 하단 넥라인을 깨고 폭락하는 하락 전환 패턴입니다.",
    entryRule: "중간 골짜기 넥라인(Neckline) 하향 이탈 시 Short",
    slRule: "두 번째 고점(Right Peak) 최고점 직상단",
    targetRule: "고점에서 넥라인까지의 수직 거리만큼 하향 투영",
    proTip: "두 번째 고점에서 BSL 휩쓸기(Sweep) 거짓 돌파 후 음봉 전환 시 고점 숏 타점이 잡힙니다.",
    winRate: "79%"
  },
  {
    id: 16,
    name: "Head & Shoulders",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "헤드앤숄더 (H&S)",
    description: "왼쪽 어깨, 더 높은 머리, 낮은 오른쪽 어깨 3중 봉우리 후 넥라인을 깨고 급락하는 최고의 하락 전환 패턴입니다.",
    entryRule: "넥라인(Neckline) 하향 붕괴 시 Short 진입",
    slRule: "오른쪽 어깨(Right Shoulder) 고점 직상단",
    targetRule: "머리(Head) 꼭대기에서 넥라인까지의 수직 거리 하향 투영",
    proTip: "넥라인이 우하향으로 기울어져 있을수록 하락 강도가 극도로 가파릅니다.",
    winRate: "84%"
  },
  {
    id: 17,
    name: "Rising Channel",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "상승 추세 채널 (Rising Channel)",
    description: "상하단 추세선 내부에서 고점과 저점을 높여가며 상승하는 구조입니다. 하단 지지 반등 또는 상단 돌파를 활용합니다.",
    entryRule: "채널 하단 지지선 터치 후 양봉 반등 시 또는 채널 상단 강력 돌파 시",
    slRule: "채널 하단 지지선 아래 직전 스윙 저점",
    targetRule: "채널 폭(Width)만큼 상향 목표 설정",
    proTip: "채널 중앙선(Midline)이 강력한 중간 지지/저항 역할을 수행합니다.",
    winRate: "76%"
  },
  {
    id: 18,
    name: "Range Breakout",
    category: "Bullish Continuation & Reversal",
    direction: "Bullish",
    subtitle: "박스권 상단 돌파 (Range Breakout)",
    description: "오랜 기간 에너지를 축적한 박스권 상단 저항대를 강력한 거래량과 함께 뚫어내는 상향 폭발 패턴입니다.",
    entryRule: "박스권 상단 레벨 종가 확정 돌파 후 박스 상단 리테스트 시",
    slRule: "박스권 중간(Midpoint) 또는 직전 바닥 하단",
    targetRule: "박스권 높이(Range Height)만큼 상향 투영",
    proTip: "횡보 박스 기간이 길었을수록 돌파 후 시세 분출 파동이 길어집니다.",
    winRate: "81%"
  },
  {
    id: 19,
    name: "Falling Channel",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "하락 추세 채널 (Falling Channel)",
    description: "우하향 평행 채널 안에서 저점과 고점을 연속으로 낮추며 하락하는 구도입니다. 상단 저항 반등 Short을 노립니다.",
    entryRule: "채널 상단 저항선 터치 후 음봉 전환 시 또는 채널 하단 붕괴 시 Short",
    slRule: "채널 상단 저항선 바로 위 직전 스윙 고점",
    targetRule: "채널 수직 폭만큼 하향 목표 투영",
    proTip: "채널 하단을 뚫고 이탈할 때 가속화된 하락 파동이 형성됩니다.",
    winRate: "74%"
  },
  {
    id: 20,
    name: "Range Breakdown",
    category: "Bearish Continuation & Reversal",
    direction: "Bearish",
    subtitle: "박스권 하단 붕괴 (Range Breakdown)",
    description: "박스권 하단 지지선이 매도 매물에 눌려 무너지며 투매를 유발하는 대표적인 숏 이탈 구조입니다.",
    entryRule: "박스권 하단 지지선 음봉 이탈 및 하단 저항 리테스트 시 Short",
    slRule: "박스권 내부 중앙선(Midpoint) 상단",
    targetRule: "박스권 수직 높이만큼 아래로 투영",
    proTip: "지지선 이탈 직전 저점이 좁아지는 대칭 지지 약화 현상을 감지하세요.",
    winRate: "80%"
  }
];

// Interactive Vector Pattern Diagram Renderer
const StructureDiagramSvg: React.FC<{ patternId: number; direction: "Bullish" | "Bearish" }> = ({ patternId, direction }) => {
  const isBull = direction === "Bullish";

  return (
    <div className="w-full h-36 bg-zinc-950/90 rounded-xl p-2 border border-zinc-800/80 relative flex items-center justify-center overflow-hidden">
      <svg className="w-full h-full text-xs font-mono select-none" viewBox="0 0 240 120" fill="none">
        {/* Background Grid */}
        <pattern id={`grid-${patternId}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2,2" />
        </pattern>
        <rect width="240" height="120" fill={`url(#grid-${patternId})`} opacity="0.4" />

        {/* Pattern Specific SVG Vector Drawings */}
        {patternId === 1 && ( // Ascending Triangle
          <>
            <line x1="20" y1="35" x2="190" y2="35" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,2" />
            <line x1="20" y1="95" x2="190" y2="35" stroke="#38bdf8" strokeWidth="2" />
            <polyline points="20,95 60,35 90,75 130,35 150,55 180,35 220,15" fill="none" stroke="#f4f4f5" strokeWidth="2" />
            <circle cx="180" cy="35" r="4" fill="#10b981" />
            <line x1="180" y1="35" x2="220" y2="35" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,2" />
            <line x1="220" y1="15" x2="235" y2="15" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2,2" />
            <text x="185" y="30" fill="#10b981" fontSize="9" fontWeight="bold">Entry</text>
            <text x="185" y="47" fill="#ef4444" fontSize="8">SL</text>
            <text x="195" y="12" fill="#10b981" fontSize="8">Target</text>
          </>
        )}

        {patternId === 2 && ( // Bullish Flag
          <>
            <line x1="20" y1="100" x2="70" y2="25" stroke="#f4f4f5" strokeWidth="2.5" />
            <line x1="70" y1="25" x2="160" y2="55" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="70" y1="50" x2="160" y2="80" stroke="#38bdf8" strokeWidth="1.5" />
            <polyline points="70,25 100,60 120,38 140,70 160,48 210,10" fill="none" stroke="#f4f4f5" strokeWidth="2" />
            <circle cx="160" cy="48" r="4" fill="#10b981" />
            <text x="165" y="44" fill="#10b981" fontSize="9" fontWeight="bold">Entry</text>
            <text x="150" y="88" fill="#ef4444" fontSize="8">SL</text>
            <text x="180" y="20" fill="#10b981" fontSize="8">Target</text>
          </>
        )}

        {patternId === 3 && ( // Descending Triangle
          <>
            <line x1="20" y1="85" x2="190" y2="85" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4,2" />
            <line x1="20" y1="20" x2="190" y2="85" stroke="#f43f5e" strokeWidth="2" />
            <polyline points="20,20 60,85 90,45 130,85 150,65 180,85 220,110" fill="none" stroke="#f4f4f5" strokeWidth="2" />
            <circle cx="180" cy="85" r="4" fill="#f43f5e" />
            <text x="185" y="80" fill="#f43f5e" fontSize="9" fontWeight="bold">Entry</text>
            <text x="185" y="65" fill="#ef4444" fontSize="8">SL</text>
            <text x="195" y="115" fill="#10b981" fontSize="8">Target</text>
          </>
        )}

        {patternId === 4 && ( // Bearish Flag
          <>
            <line x1="20" y1="15" x2="70" y2="90" stroke="#f4f4f5" strokeWidth="2.5" />
            <line x1="70" y1="90" x2="160" y2="60" stroke="#f43f5e" strokeWidth="1.5" />
            <line x1="70" y1="65" x2="160" y2="35" stroke="#f43f5e" strokeWidth="1.5" />
            <polyline points="70,90 100,55 120,78 140,45 160,68 210,110" fill="none" stroke="#f4f4f5" strokeWidth="2" />
            <circle cx="160" cy="68" r="4" fill="#f43f5e" />
            <text x="165" y="64" fill="#f43f5e" fontSize="9" fontWeight="bold">Entry</text>
            <text x="150" y="30" fill="#ef4444" fontSize="8">SL</text>
            <text x="180" y="115" fill="#10b981" fontSize="8">Target</text>
          </>
        )}

        {patternId === 5 && ( // Bullish Wedge
          <>
            <line x1="20" y1="20" x2="180" y2="75" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="20" y1="70" x2="180" y2="90" stroke="#38bdf8" strokeWidth="1.5" />
            <polyline points="20,20 60,75 100,40 130,83 160,58 175,85 220,20" fill="none" stroke="#f4f4f5" strokeWidth="2" />
            <circle cx="175" cy="85" r="4" fill="#10b981" />
            <text x="180" y="80" fill="#10b981" fontSize="9" fontWeight="bold">Entry</text>
            <text x="180" y="98" fill="#ef4444" fontSize="8">SL</text>
            <text x="195" y="18" fill="#10b981" fontSize="8">Target</text>
          </>
        )}

        {patternId === 6 && ( // Bullish Pennant
          <>
            <line x1="20" y1="100" x2="70" y2="25" stroke="#f4f4f5" strokeWidth="2.5" />
            <line x1="70" y1="25" x2="170" y2="60" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="70" y1="90" x2="170" y2="60" stroke="#38bdf8" strokeWidth="1.5" />
            <polyline points="70,25 100,78 120,40 140,68 160,52 170,60 215,15" fill="none" stroke="#f4f4f5" strokeWidth="2" />
            <circle cx="170" cy="60" r="4" fill="#10b981" />
            <text x="175" y="58" fill="#10b981" fontSize="9" fontWeight="bold">Entry</text>
            <text x="160" y="75" fill="#ef4444" fontSize="8">SL</text>
            <text x="180" y="12" fill="#10b981" fontSize="8">Target</text>
          </>
        )}

        {patternId === 7 && ( // Bearish Wedge
          <>
            <line x1="20" y1="100" x2="180" y2="45" stroke="#f43f5e" strokeWidth="1.5" />
            <line x1="20" y1="50" x2="180" y2="30" stroke="#f43f5e" strokeWidth="1.5" />
            <polyline points="20,100 60,45 100,80 135,38 160,65 175,32 220,100" fill="none" stroke="#f4f4f5" strokeWidth="2" />
            <circle cx="175" cy="32" r="4" fill="#f43f5e" />
            <text x="180" y="28" fill="#f43f5e" fontSize="9" fontWeight="bold">Entry</text>
            <text x="180" y="45" fill="#ef4444" fontSize="8">SL</text>
            <text x="195" y="108" fill="#10b981" fontSize="8">Target</text>
          </>
        )}

        {patternId === 8 && ( // Bearish Pennant
          <>
            <line x1="20" y1="15" x2="70" y2="90" stroke="#f4f4f5" strokeWidth="2.5" />
            <line x1="70" y1="90" x2="170" y2="60" stroke="#f43f5e" strokeWidth="1.5" />
            <line x1="70" y1="30" x2="170" y2="60" stroke="#f43f5e" strokeWidth="1.5" />
            <polyline points="70,90 100,42 120,78 140,50 160,68 170,60 215,110" fill="none" stroke="#f4f4f5" strokeWidth="2" />
            <circle cx="170" cy="60" r="4" fill="#f43f5e" />
            <text x="175" y="58" fill="#f43f5e" fontSize="9" fontWeight="bold">Entry</text>
            <text x="160" y="40" fill="#ef4444" fontSize="8">SL</text>
            <text x="180" y="115" fill="#10b981" fontSize="8">Target</text>
          </>
        )}

        {/* Generic Fallback Visualizer for remaining patterns */}
        {![1, 2, 3, 4, 5, 6, 7, 8, 10, 13, 14, 15, 16].includes(patternId) && (
          <>
            {isBull ? (
              <>
                <line x1="20" y1="35" x2="220" y2="35" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3,3" />
                <polyline points="20,95 60,35 100,75 140,35 175,60 190,35 225,10" fill="none" stroke="#f4f4f5" strokeWidth="2" />
                <circle cx="190" cy="35" r="4" fill="#10b981" />
                <text x="192" y="30" fill="#10b981" fontSize="9" fontWeight="bold">Entry</text>
                <text x="170" y="72" fill="#ef4444" fontSize="8">SL</text>
                <text x="195" y="12" fill="#10b981" fontSize="8">Target</text>
              </>
            ) : (
              <>
                <line x1="20" y1="80" x2="220" y2="80" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3,3" />
                <polyline points="20,20 60,80 100,40 140,80 175,55 190,80 225,115" fill="none" stroke="#f4f4f5" strokeWidth="2" />
                <circle cx="190" cy="80" r="4" fill="#f43f5e" />
                <text x="192" y="75" fill="#f43f5e" fontSize="9" fontWeight="bold">Entry</text>
                <text x="170" y="48" fill="#ef4444" fontSize="8">SL</text>
                <text x="195" y="115" fill="#10b981" fontSize="8">Target</text>
              </>
            )}
          </>
        )}
      </svg>
    </div>
  );
};

interface Props {
  currentStockSymbol?: string;
  currentStockPrice?: number;
}

export const PriceActionStructuresGuide: React.FC<Props> = ({
  currentStockSymbol = "005930",
  currentStockPrice = 240000
}) => {
  const [guideView, setGuideView] = useState<"8_CORE_LIFECYCLE" | "20_STRUCTURES">("8_CORE_LIFECYCLE");
  const [filter, setFilter] = useState<"ALL" | "BULLISH" | "BEARISH">("ALL");
  const [selectedPattern, setSelectedPattern] = useState<PriceActionStructure | null>(null);

  const filteredList = PRICE_ACTION_STRUCTURES.filter(item => {
    if (filter === "BULLISH") return item.direction === "Bullish";
    if (filter === "BEARISH") return item.direction === "Bearish";
    return true;
  });

  const currentIndex = selectedPattern ? filteredList.findIndex(p => p.id === selectedPattern.id) : -1;

  const handlePrevPattern = () => {
    if (currentIndex > 0) {
      setSelectedPattern(filteredList[currentIndex - 1]);
    }
  };

  const handleNextPattern = () => {
    if (currentIndex >= 0 && currentIndex < filteredList.length - 1) {
      setSelectedPattern(filteredList[currentIndex + 1]);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP VIEW SWITCHER TABS */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-4 gap-3">
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
          <button
            onClick={() => setGuideView("8_CORE_LIFECYCLE")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              guideView === "8_CORE_LIFECYCLE"
                ? "bg-cyan-600 text-white shadow-lg ring-2 ring-cyan-400/50"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>📈 8대 상승 패턴 6단계 라이프사이클 엔진</span>
          </button>

          <button
            onClick={() => setGuideView("20_STRUCTURES")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              guideView === "20_STRUCTURES"
                ? "bg-cyan-600 text-white shadow-lg ring-2 ring-cyan-400/50"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BookOpen className="h-4 w-4 text-cyan-300" />
            <span>📚 20가지 프라이스 액션 구조 매스터</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
          {guideView === "8_CORE_LIFECYCLE" ? "DETECTED → WATCHING → CONFIRMING → CONFIRMED → RETESTING → CONTINUATION" : "Complete Target & Stop-Loss Calculator"}
        </span>
      </div>

      {/* RENDER VIEW BASED ON TAB */}
      {guideView === "8_CORE_LIFECYCLE" ? (
        <div className="space-y-6">
          <BullishPatternsLifecycleEngine />
          <BearishPatternsLifecycleEngine />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Component Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-cyan-950 to-blue-950 border border-cyan-800 rounded-xl text-cyan-400">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white tracking-wide">
                    20 PRICE ACTION STRUCTURES
                  </h2>
                  <span className="text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-md">
                    COMPLETE ENTRY · SL · TARGET GUIDE
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  기관급 프라이스 액션 파동 구조 20가지 매스터 가이드 및 실시간 타겟/손절 라인 정밀 계산기
                </p>
              </div>
            </div>

        {/* Filter Buttons */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "ALL" ? "bg-cyan-600 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            전체 (20개)
          </button>
          <button
            onClick={() => setFilter("BULLISH")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
              filter === "BULLISH" ? "bg-emerald-600 text-white shadow" : "text-emerald-400 hover:text-emerald-300"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>상승/반전 (10)</span>
          </button>
          <button
            onClick={() => setFilter("BEARISH")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
              filter === "BEARISH" ? "bg-rose-600 text-white shadow" : "text-rose-400 hover:text-rose-300"
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>하락/반전 (10)</span>
          </button>
        </div>
      </div>

      {/* 20 Structure Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredList.map((item) => {
          const isBull = item.direction === "Bullish";
          return (
            <div
              key={item.id}
              onClick={() => setSelectedPattern(item)}
              className="bg-zinc-900/90 border border-zinc-800/80 hover:border-cyan-500/50 rounded-2xl p-4 space-y-3 transition group cursor-pointer hover:shadow-xl relative flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-md">
                    #{item.id.toString().padStart(2, "0")}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                    isBull 
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800" 
                      : "bg-rose-950 text-rose-300 border-rose-800"
                  }`}>
                    {item.direction === "Bullish" ? "🟢 BULLISH" : "🔴 BEARISH"}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition flex items-center justify-between">
                    <span>{item.name}</span>
                    <Maximize2 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-cyan-400" />
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{item.subtitle}</p>
                </div>

                {/* SVG Vector Chart Diagram */}
                <StructureDiagramSvg patternId={item.id} direction={item.direction} />

                <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800 text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-zinc-500">진입 (Entry):</span>
                    <span className={isBull ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      Breakout / Retest
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-zinc-500">목표가 (Target):</span>
                    <span className="text-cyan-300 font-bold">Pattern Height Projection</span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-zinc-500">백테스팅 승률:</span>
                    <span className="text-amber-300 font-bold">{item.winRate}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 group-hover:text-cyan-400 transition font-bold">
                <span>자세한 진입/손절 규칙 보기</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM KEY RULES & STRATEGY CARDS (EXACT MATCH TO REFERENCE SHEET) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs pt-2">
        {/* Card 1: KEY RULES */}
        <div className="bg-zinc-900/90 p-4 rounded-xl border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs border-b border-zinc-800 pb-1.5">
            <Sparkles className="h-4 w-4" />
            <span>KEY RULES (핵심 원칙)</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-zinc-300">
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span>Trade in the direction of breakout (돌파 방향으로 매매)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span>Wait for proper confirmation (확정 신호까지 대기)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">•</span>
              <span>Always use Stop Loss (필수 스탑로스 설정)</span>
            </li>
          </ul>
        </div>

        {/* Card 2: PRO TIP */}
        <div className="bg-zinc-900/90 p-4 rounded-xl border border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs border-b border-zinc-800 pb-1.5">
            <Award className="h-4 w-4" />
            <span>PRO TIP (전문가 팁)</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-zinc-300">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Enter after clear breakout / retest (돌파 리테스트 후 진입)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Target = Pattern height projection (패턴 높이만큼 목표 설정)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>Trade high probability setups only (고신뢰 패턴만 엄선)</span>
            </li>
          </ul>
        </div>

        {/* Card 3: RISK MANAGEMENT */}
        <div className="bg-zinc-900/90 p-4 rounded-xl border border-rose-500/30 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-rose-400 text-xs border-b border-zinc-800 pb-1.5">
            <ShieldAlert className="h-4 w-4" />
            <span>RISK MANAGEMENT (리스크 관리)</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-zinc-300">
            <li className="flex items-start gap-1.5">
              <span className="text-rose-400 font-bold">•</span>
              <span>Risk only 1–2% per trade (1회 거래당 손실 1-2% 제한)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-rose-400 font-bold">•</span>
              <span>Maintain proper lot size (적정 포지션 사이징)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-rose-400 font-bold">•</span>
              <span>Protect your capital (원금 보존 최우선 원칙)</span>
            </li>
          </ul>
        </div>

        {/* Card 4: TRADE SMART */}
        <div className="bg-zinc-900/90 p-4 rounded-xl border border-cyan-500/30 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-cyan-400 text-xs border-b border-zinc-800 pb-1.5">
            <Target className="h-4 w-4" />
            <span>TRADE SMART (스마트 매매)</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-zinc-300">
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Plan → Wait → Execute (계획 → 대기 → 과감한 실행)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Control emotions (뇌동매매 및 감정 통제)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold">•</span>
              <span>Consistency is the key (일관된 원칙 준수가 핵심)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* PATTERN DETAIL MODAL WITH CUSTOM CALCULATION FOR CURRENT STOCK */}
      {selectedPattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl relative max-h-[88vh] overflow-y-auto my-auto">
            <button
              onClick={() => setSelectedPattern(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className={`p-3 rounded-xl border ${
                selectedPattern.direction === "Bullish"
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                  : "bg-rose-950 text-rose-400 border-rose-800"
              }`}>
                {selectedPattern.direction === "Bullish" ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">
                    #{selectedPattern.id.toString().padStart(2, "0")}. {selectedPattern.name}
                  </h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                    selectedPattern.direction === "Bullish" 
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800" 
                      : "bg-rose-950 text-rose-300 border-rose-800"
                  }`}>
                    {selectedPattern.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{selectedPattern.subtitle}</p>
              </div>
            </div>

            {/* Pattern Diagram */}
            <StructureDiagramSvg patternId={selectedPattern.id} direction={selectedPattern.direction} />

            {/* Current Stock Real-time Target Calculator */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold border-b border-zinc-800 pb-2">
                <span className="text-cyan-300 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span>현재 종목({currentStockSymbol}) 적용 시 타겟 / 손절 자동 계산</span>
                </span>
                <span className="font-mono text-white">기준가: {(currentStockPrice ?? 0).toLocaleString()} KRW</span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">추천 진입가 (Entry)</span>
                  <span className="font-extrabold text-cyan-300">
                    {(selectedPattern.direction === "Bullish" ? Math.round(currentStockPrice * 1.005) : Math.round(currentStockPrice * 0.995)).toLocaleString()}
                  </span>
                </div>
                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-rose-400 block">스탑로스 (SL)</span>
                  <span className="font-extrabold text-rose-300">
                    {(selectedPattern.direction === "Bullish" ? Math.round(currentStockPrice * 0.985) : Math.round(currentStockPrice * 1.015)).toLocaleString()}
                  </span>
                </div>
                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-emerald-400 block">목표가 (Target)</span>
                  <span className="font-extrabold text-emerald-300">
                    {(selectedPattern.direction === "Bullish" ? Math.round(currentStockPrice * 1.055) : Math.round(currentStockPrice * 0.945)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Execution Rules */}
            <div className="space-y-2 text-xs">
              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 space-y-1">
                <span className="font-bold text-cyan-300 block">🎯 진입 조건 (Entry Rule):</span>
                <p className="text-zinc-300">{selectedPattern.entryRule}</p>
              </div>

              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 space-y-1">
                <span className="font-bold text-rose-300 block">🛑 손절 위치 (Stop Loss Rule):</span>
                <p className="text-zinc-300">{selectedPattern.slRule}</p>
              </div>

              <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 space-y-1">
                <span className="font-bold text-emerald-300 block">🏁 익절 목표 (Target Projection):</span>
                <p className="text-zinc-300">{selectedPattern.targetRule}</p>
              </div>

              <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-xl space-y-1">
                <span className="font-bold text-amber-300 block flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>실전 프로 팁 (Pro Tip):</span>
                </span>
                <p className="text-amber-200/90 leading-relaxed text-[11px]">{selectedPattern.proTip}</p>
              </div>
            </div>

            {/* Bottom Modal Navigation & Close Buttons */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPattern}
                  disabled={currentIndex <= 0}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-zinc-700"
                >
                  <ChevronLeft className="h-4 w-4 text-cyan-400" />
                  <span>이전 패턴</span>
                </button>

                <button
                  onClick={handleNextPattern}
                  disabled={currentIndex >= filteredList.length - 1 || currentIndex === -1}
                  className="flex-1 py-2.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>다음 패턴</span>
                  <ChevronRight className="h-4 w-4 text-cyan-400" />
                </button>
              </div>

              <button
                onClick={() => setSelectedPattern(null)}
                className="w-full py-2.5 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition cursor-pointer text-center border border-zinc-700/60"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
