/**
 * UserFilterSettingsStore.ts
 * 
 * 💾 사용자가 설정한 목표 수익률, 기대 손익비, 하락봉 v5 필터 등 매매 조건을
 * 브라우저 로컬 스토리지(localStorage)에 영구 저장하고 전역에서 동기화하는 스토어
 */

export interface UserFilterSettings {
  // 1. 목표 수익률 & 손절폭
  minTargetProfitRate: number; // e.g. 3.5 (%)
  maxAllowedStopLossPct: number; // e.g. 2.5 (%)
  minRiskRewardRatio: number; // e.g. 2.0 (배)

  // 2. 엔진 & 필터 스위치
  enableAntiDowntrendV5: boolean; // 하락봉 탐지 엔진 v5
  enableCandleConfirmation: boolean; // 캔들 종가 확정 및 2틱 지지
  strictFakeoutFilter: boolean; // 4단계 안티-페이크아웃 필터
  requireOrderbookPositiveDelta: boolean; // CVD 양의 수급 유입 필수
  enableBepHoldPredictiveAlert: boolean; // BEP 손익분기 도달 후 AI 고점 예측 홀딩 알림

  // 3. AI 봇 합의 기준
  minAiConsensusScore: number; // e.g. 82 (점)
  minBrainEnginesCount: number; // e.g. 13 (개)

  // 4. 정렬 및 스캔 범위
  sortMetric: "AI_SCORE" | "EXPECTED_GAIN" | "RR_RATIO" | "VOLUME" | "WIN_PROBABILITY";
  marketScope: "ALL" | "UPBIT_CRYPTO" | "KR_STOCK" | "US_STOCK";
  
  // 5. 업데이트 타임스탬프
  lastUpdated: number;
}

export const DEFAULT_USER_FILTER_SETTINGS: UserFilterSettings = {
  minTargetProfitRate: 2.8,
  maxAllowedStopLossPct: 1.0,
  minRiskRewardRatio: 2.5,
  enableAntiDowntrendV5: true,
  enableCandleConfirmation: true,
  strictFakeoutFilter: true,
  requireOrderbookPositiveDelta: true,
  enableBepHoldPredictiveAlert: true,
  minAiConsensusScore: 88,
  minBrainEnginesCount: 14,
  sortMetric: "AI_SCORE",
  marketScope: "ALL",
  lastUpdated: Date.now()
};

const STORAGE_KEY = "aistock_user_custom_filter_settings_v5";

export class UserFilterSettingsStore {
  private static cachedSettings: UserFilterSettings | null = null;
  private static listeners: Array<(settings: UserFilterSettings) => void> = [];

  /**
   * 로컬 스토리지에서 설정 불러오기 (없으면 기본값 생성 후 저장)
   */
  public static getSettings(): UserFilterSettings {
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.cachedSettings = {
          ...DEFAULT_USER_FILTER_SETTINGS,
          ...parsed
        };
        return this.cachedSettings!;
      }
    } catch (e) {
      console.warn("Failed to load user filter settings from localStorage, using defaults", e);
    }

    this.cachedSettings = { ...DEFAULT_USER_FILTER_SETTINGS };
    this.saveSettings(this.cachedSettings);
    return this.cachedSettings;
  }

  /**
   * 설정 변경 및 로컬 스토리지 영구 저장
   */
  public static saveSettings(settings: Partial<UserFilterSettings>): UserFilterSettings {
    const current = this.getSettings();
    const updated: UserFilterSettings = {
      ...current,
      ...settings,
      lastUpdated: Date.now()
    };

    this.cachedSettings = updated;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save user filter settings to localStorage", e);
    }

    // Notify all active subscribers
    this.notifyListeners(updated);
    return updated;
  }

  /**
   * 기본 설정값으로 초기화
   */
  public static resetToDefaults(): UserFilterSettings {
    this.cachedSettings = {
      ...DEFAULT_USER_FILTER_SETTINGS,
      lastUpdated: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cachedSettings));
    } catch (e) {}

    this.notifyListeners(this.cachedSettings);
    return this.cachedSettings;
  }

  /**
   * 설정 변경 리스너 등록
   */
  public static subscribe(listener: (settings: UserFilterSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notifyListeners(settings: UserFilterSettings) {
    this.listeners.forEach(fn => {
      try {
        fn(settings);
      } catch (err) {
        console.error("Error in filter settings subscriber", err);
      }
    });
  }
}
