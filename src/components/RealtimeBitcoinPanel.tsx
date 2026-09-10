import React from "react";
import { CryptoLiveWorkbench } from "./CryptoLiveWorkbench";

/**
 * 메인 화면에서는 코인 관련 정보를 하나의 간단한 한글 패널로만 보여준다.
 * 실시간 시세, 판단, 매수 금액, 매도 비율, 목표/손절, 상세 차트는
 * CryptoLiveWorkbench 안에서 통합 제공한다.
 */
export const RealtimeBitcoinPanel: React.FC = () => <CryptoLiveWorkbench />;
