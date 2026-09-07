// KIS Account Query Service
// Retrieves authentic account balance, holdings, and buying power from KIS REST API

export interface KISAccountBalance {
  accountNo: string;
  totalDeposit: number;
  availableBuyingPower: number;
  totalEvaluationValue: number;
  unrealizedPnl: number;
  returnPct: number;
}

export class KISAccountService {
  private static instance: KISAccountService;

  public static getInstance(): KISAccountService {
    if (!KISAccountService.instance) {
      KISAccountService.instance = new KISAccountService();
    }
    return KISAccountService.instance;
  }

  public async fetchBalance(): Promise<KISAccountBalance> {
    const appKey = process.env.KIS_APPKEY;
    const accountNo = process.env.KIS_CANO;

    if (!appKey || !accountNo) {
      throw new Error("KIS_ACCOUNT_ERROR: KIS_APPKEY or KIS_CANO missing");
    }

    try {
      const url = `https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/trading/inquire-balance?CANO=${accountNo}&ACNT_PRDT_CD=01&AFHR_FLPR_YN=N&OFL_YN=&INQR_DVSN=02&UNPR_DVSN=01&FUND_STTL_ICLD_YN=N&FNCG_AMT_AUTO_RDPT_YN=N&PRCS_DVSN=00&CTX_AREA_FK100=&CTX_AREA_NK100=`;

      const res = await fetch(url, {
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${process.env.KIS_ACCESS_TOKEN || ''}`,
          "appkey": appKey,
          "appsecret": process.env.KIS_APPSECRET || '',
          "tr_id": "TTTC8434R"
        }
      });

      if (!res.ok) {
        throw new Error(`KIS_ACCOUNT_HTTP_ERROR:${res.status}`);
      }

      const json = await res.json();
      const output2 = json.output2 && json.output2[0] ? json.output2[0] : {};

      return {
        accountNo,
        totalDeposit: parseFloat(output2.dnca_tot_amt || "0"),
        availableBuyingPower: parseFloat(output2.prvs_rcdl_exn_amt || output2.dnca_tot_amt || "0"),
        totalEvaluationValue: parseFloat(output2.tot_evlu_amt || "0"),
        unrealizedPnl: parseFloat(output2.evlu_pfls_smttl_amt || "0"),
        returnPct: parseFloat(output2.evlu_pfls_icvs_scl_rat || "0")
      };
    } catch (err: any) {
      throw new Error(`KIS_ACCOUNT_FETCH_FAILED:${err.message}`);
    }
  }
}

export const kisAccountService = KISAccountService.getInstance();
