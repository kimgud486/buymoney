import { useEffect } from "react";

const TEXT_MAP: Record<string, string> = {
  "ALL MARKET RADAR · 전종목 시장 레이더": "전체 시장 레이더 · 모든 종목 살펴보기",
  "RUNNING": "작동 중",
  "PAUSED": "멈춤",
  "Dashboard": "한눈에 보기",
  "Settings": "설정",
  "Search": "찾기",
  "Scanner": "종목 찾기",
  "Analysis": "분석",
  "AI Analysis": "AI 분석",
  "Market": "시장",
  "Portfolio": "내 자산",
  "Holdings": "보유 종목",
  "Balance": "잔액",
  "Profit": "수익",
  "Loss": "손실",
  "Risk": "위험",
  "BUY": "매수",
  "SELL": "매도",
  "HOLD": "기다리기",
  "WAIT": "기다리기",
  "LONG": "상승 예상",
  "SHORT": "하락 예상",
  "BULLISH": "오를 가능성",
  "BEARISH": "내릴 가능성",
  "NEUTRAL": "방향 불확실",
  "SIGNAL": "신호 있음",
  "NO DATA": "자료 없음",
  "NO_DATA": "자료 없음",
  "API ERROR": "연결 문제",
  "API_ERROR": "연결 문제",
  "Loading": "불러오는 중",
  "Ready": "준비됨",
  "Connected": "연결됨",
  "Disconnected": "연결 안 됨",
  "Start": "시작",
  "Stop": "중지",
  "Refresh": "새로고침",
  "Save": "저장",
  "Cancel": "취소",
  "Close": "닫기",
  "Details": "자세히 보기",
  "Overview": "전체 보기",
  "Current Price": "현재 가격",
  "Price": "가격",
  "Volume": "거래량",
  "Chart": "차트",
  "Pattern": "패턴",
  "Patterns": "패턴",
  "Strategy": "전략",
  "Performance": "성과",
  "Report": "보고서",
  "History": "기록",
  "Status": "상태",
  "Today": "오늘",
  "Total": "전체",
  "Current": "현재",
  "Expected": "예상",
  "Confidence": "믿을 만한 정도",
  "Score": "점수",
  "High": "높음",
  "Medium": "보통",
  "Low": "낮음",
  "Strong": "강함",
  "Weak": "약함",
  "Entry": "매수 시작 가격",
  "Exit": "팔 가격",
  "Target": "목표 가격",
  "Stop Loss": "손절 가격",
  "Take Profit": "수익 실현",
  "Watchlist": "관심 종목",
  "Market Overview": "시장 한눈에 보기",
  "Real-time": "실시간",
  "Realtime": "실시간",
  "Live": "실시간",
  "Open": "열기",
  "Active": "사용 중",
  "Inactive": "사용 안 함",
  "Running": "작동 중",
  "Paused": "멈춤"
};

function translateTextNode(node: Text) {
  const raw = node.nodeValue ?? "";
  const trimmed = raw.trim();
  const translated = TEXT_MAP[trimmed];
  if (!translated || translated === trimmed) return;
  const left = raw.match(/^\s*/)?.[0] ?? "";
  const right = raw.match(/\s*$/)?.[0] ?? "";
  node.nodeValue = `${left}${translated}${right}`;
}

function translateElement(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text);
    current = walker.nextNode();
  }
}

export function MainScreenKoreanText() {
  useEffect(() => {
    translateElement(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateElement(mutation.target);
        for (const node of Array.from(mutation.addedNodes)) translateElement(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
