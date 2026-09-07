// ----------------------------------------------------------------------
// KIS EXECUTION NOTICE PARSER V20 (AISTOCK FINAL RC)
// Parses encrypted/decrypted KIS account execution notices
// H0STCNI0 (Domestic) & H0GSCNI0 (Overseas)
// ----------------------------------------------------------------------

import crypto from "crypto";
import { H0STCNI0, H0GSCNI0 } from "../../src/services/KISRealtimeFieldSchema";

export interface ParsedExecutionNotice {
  rawTrId: "H0STCNI0" | "H0GSCNI0" | string;
  noticeId: string;
  accountNo: string;
  orderId: string;
  originalOrderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  execQty: number;
  execPrice: number;
  orderQty: number;
  remainingQty: number;
  isExecuted: boolean;
  execTime: string;
  timestamp: number;
  rawFields: string[];
}

export class KISExecutionNoticeParserV20 {
  /**
   * Decrypt AES-256-CBC encrypted payload from KIS WS if encrypted
   */
  public static decryptPayload(encryptedBase64: string, keyHex: string, ivHex: string): string {
    try {
      const key = Buffer.from(keyHex, "utf8");
      const iv = Buffer.from(ivHex, "utf8");
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encryptedBase64, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      console.error("[KISExecutionNoticeParserV20] Decryption failed:", err);
      return encryptedBase64;
    }
  }

  /**
   * Parse KIS execution notice payload string
   */
  public static parse(trId: string, rawData: string): ParsedExecutionNotice | null {
    if (!rawData) return null;

    const fields = rawData.split("^");
    if (fields.length < 10) return null;

    const isDomestic = trId === "H0STCNI0";
    const schema = isDomestic ? H0STCNI0 : H0GSCNI0;

    const accountNo = fields[schema.ACCOUNT_NO] || "";
    const orderId = fields[schema.ORDER_ID] || "";
    const originalOrderId = fields[schema.ORIGINAL_ORDER_ID] || "";
    const symbol = fields[schema.SYMBOL] || "";
    const sideCode = fields[schema.SIDE_CODE] || "";
    
    // Side code '01' is sell, '02' is buy in KIS domestic; or 'SELL'/'BUY'
    const side: "BUY" | "SELL" = sideCode === "01" ? "SELL" : "BUY";

    const execQty = parseFloat(fields[schema.EXEC_QTY] || "0") || 0;
    const execPrice = parseFloat(fields[schema.EXEC_PRICE] || "0") || 0;
    const orderQty = parseFloat(fields[schema.ORDER_QTY] || "0") || 0;
    const execFlag = fields[schema.EXEC_FLAG] || "1";
    
    // execFlag === '1' or '2' means execution confirmed, or execQty > 0
    const isExecuted = (execFlag === "1" || execFlag === "2" || execQty > 0) && execQty > 0;
    const execTime = fields[schema.EXEC_TIME] || "";
    const noticeId = `notice_${trId}_${symbol}_${orderId}_${Date.now()}`;

    return {
      rawTrId: trId,
      noticeId,
      accountNo,
      orderId,
      originalOrderId,
      symbol,
      side,
      execQty,
      execPrice,
      orderQty,
      remainingQty: Math.max(0, orderQty - execQty),
      isExecuted,
      execTime,
      timestamp: Date.now(),
      rawFields: fields
    };
  }
}
