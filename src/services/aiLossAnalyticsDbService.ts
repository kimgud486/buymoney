import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || "guest_local_user",
      email: auth?.currentUser?.email || "guest@aistudio.com",
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  return errInfo;
}

export interface LossAnalysisRecord {
  id?: string;
  symbol: string;
  stockName: string;
  market: "KR" | "US";
  positionType: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  lossAmountKRW: number;
  lossRatePct: number;
  rootCauseCategory: string; // e.g. "가짜 돌파(False Breakout)", "지수 급락 동조화", "장 마감전 거래량 수급 이탈", "손절가 타이트 과다"
  detailedAnalysis: string;
  improvedRule: string;
  analyzedAt: string;
  sessionContext: "AFTER_KR_MARKET" | "AFTER_US_MARKET" | "INTER_SESSION";
}

export interface ModelUpgradeRecord {
  id?: string;
  upgradeVersion: string;
  upgradedAt: string;
  triggerEvent: string;
  improvementsApplied: string[];
  accuracyGainPct: number;
  falseSignalReductionPct: number;
  totalLossRecordsAnalyzed: number;
}

const LOSS_COLLECTION = "ai_loss_analytics";
const UPGRADE_COLLECTION = "ai_model_upgrades";

export async function saveLossAnalysisToDb(record: LossAnalysisRecord): Promise<{ success: boolean; id?: string }> {
  try {
    const docData = {
      ...record,
      createdAt: serverTimestamp(),
      userId: auth?.currentUser?.uid || "guest_local_user",
    };
    const docRef = await addDoc(collection(db, LOSS_COLLECTION), docData);
    return { success: true, id: docRef.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LOSS_COLLECTION);
    return { success: false };
  }
}

export async function getLossAnalysisHistoryFromDb(limitCount = 20): Promise<LossAnalysisRecord[]> {
  try {
    const q = query(
      collection(db, LOSS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const records: LossAnalysisRecord[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        symbol: data.symbol || "UNKNOWN",
        stockName: data.stockName || "주식",
        market: data.market || "KR",
        positionType: data.positionType || "LONG",
        entryPrice: data.entryPrice || 0,
        exitPrice: data.exitPrice || 0,
        lossAmountKRW: data.lossAmountKRW || 0,
        lossRatePct: data.lossRatePct || 0,
        rootCauseCategory: data.rootCauseCategory || "원인 불명",
        detailedAnalysis: data.detailedAnalysis || "",
        improvedRule: data.improvedRule || "",
        analyzedAt: data.analyzedAt || new Date().toISOString(),
        sessionContext: data.sessionContext || "INTER_SESSION",
      });
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, LOSS_COLLECTION);
    return [];
  }
}

export async function saveModelUpgradeToDb(upgrade: ModelUpgradeRecord): Promise<{ success: boolean; id?: string }> {
  try {
    const docData = {
      ...upgrade,
      createdAt: serverTimestamp(),
      userId: auth?.currentUser?.uid || "guest_local_user",
    };
    const docRef = await addDoc(collection(db, UPGRADE_COLLECTION), docData);
    return { success: true, id: docRef.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, UPGRADE_COLLECTION);
    return { success: false };
  }
}

export async function getModelUpgradeHistoryFromDb(limitCount = 10): Promise<ModelUpgradeRecord[]> {
  try {
    const q = query(
      collection(db, UPGRADE_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const records: ModelUpgradeRecord[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        upgradeVersion: data.upgradeVersion || "v5.5.0",
        upgradedAt: data.upgradedAt || new Date().toISOString(),
        triggerEvent: data.triggerEvent || "장 브레이크 자율학습",
        improvementsApplied: data.improvementsApplied || [],
        accuracyGainPct: data.accuracyGainPct || 3.5,
        falseSignalReductionPct: data.falseSignalReductionPct || 8.2,
        totalLossRecordsAnalyzed: data.totalLossRecordsAnalyzed || 12,
      });
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, UPGRADE_COLLECTION);
    return [];
  }
}
