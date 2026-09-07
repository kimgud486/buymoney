import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { CashBreakdown } from "../types";

export interface BalanceManagerResult {
  koreaCash: number;
  upbitCash: number;
  totalCash: number;
  totalAssetValuation: number;
  isSyncing: boolean;
  lastSynced: Date | null;
  syncError: string | null;
  brokerStatuses: {
    korea: { connected: boolean; cash: number };
    upbit: { connected: boolean; cash: number };
  };
  refetchBalance: (broker?: 'korea' | 'us' | 'upbit' | 'all') => Promise<CashBreakdown>;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
}

export function useBalanceManager(autoRefreshIntervalMs: number = 30000): BalanceManagerResult {
  const { profile, cashBreakdown, syncRealAccountBalance } = useApp();

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(new Date());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);

  const hasKoreaConnected = Boolean((profile?.koreaAppKey && profile?.koreaAppSecret) || profile?.koreaAccountNo);
  const hasUpbitConnected = Boolean((profile?.upbitAccessKey && profile?.upbitSecretKey) || profile?.upbitAccessKey2);

  const koreaCash = cashBreakdown?.koreaCash ?? 0;
  const upbitCash = cashBreakdown?.upbitCash ?? 0;
  const totalCash = cashBreakdown?.totalCash ?? profile?.balance ?? 0;
  const totalAssetValuation = cashBreakdown?.grandTotalAssets ?? profile?.balance ?? totalCash;

  const refetchBalance = useCallback(async (
    brokerTarget: 'korea' | 'us' | 'upbit' | 'all' = 'all',
    silent: boolean = false
  ): Promise<CashBreakdown> => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await syncRealAccountBalance(brokerTarget, silent);
      setLastSynced(new Date());
      return result?.cashBreakdown || cashBreakdown || {
        koreaCash: 0,
        koreaInvested: 0,
        koreaTotal: 0,
        upbitCash: 0,
        upbitInvested: 0,
        upbitTotal: 0,
        totalCash: 0,
        totalInvested: 0,
        grandTotalAssets: 0
      };
    } catch (err: any) {
      const msg = err?.message || "예수금 동기화 실패";
      setSyncError(msg);
      return cashBreakdown || {
        koreaCash,
        upbitCash,
        totalCash: profile?.balance ?? 0,
        koreaInvested: 0,
        koreaTotal: 0,
        upbitInvested: 0,
        upbitTotal: 0,
        totalInvested: 0,
        grandTotalAssets: profile?.balance ?? 0
      };
    } finally {
      setIsSyncing(false);
    }
  }, [syncRealAccountBalance, cashBreakdown, koreaCash, upbitCash, profile?.balance]);

  return {
    koreaCash,
    upbitCash,
    totalCash,
    totalAssetValuation,
    isSyncing,
    lastSynced,
    syncError,
    brokerStatuses: {
      korea: { connected: hasKoreaConnected, cash: koreaCash },
      upbit: { connected: hasUpbitConnected, cash: upbitCash }
    },
    refetchBalance,
    autoSyncEnabled,
    setAutoSyncEnabled
  };
}
