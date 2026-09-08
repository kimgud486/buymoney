import { BrokerGatewayRouter } from "./BrokerGatewayRouter";

export interface ReconciliationReport {
  reconciledAt: number;
  brokerPositionsCount: number;
  localPositionsCount: number;
  discrepancies: string[];
  synchronized: boolean;
}

export class ExecutionReconciler {
  constructor(private router: BrokerGatewayRouter) {}

  public async reconcile(
    localPositions: Array<{ symbol: string; quantity: number; market: "KR" | "US" | "CRYPTO" }>
  ): Promise<ReconciliationReport> {
    const discrepancies: string[] = [];

    const kisGateway = this.router.getKisGateway();
    const upbitGateway = this.router.getUpbitGateway();

    const kisPositions = await kisGateway.getPositions();
    const upbitPositions = await upbitGateway.getPositions();

    const allBrokerPositionsMap = new Map<string, number>();
    for (const p of kisPositions) {
      allBrokerPositionsMap.set(p.symbol, (allBrokerPositionsMap.get(p.symbol) ?? 0) + p.quantity);
    }
    for (const p of upbitPositions) {
      allBrokerPositionsMap.set(p.symbol, (allBrokerPositionsMap.get(p.symbol) ?? 0) + p.quantity);
    }

    const localMap = new Map<string, number>();
    for (const lp of localPositions) {
      localMap.set(lp.symbol, (localMap.get(lp.symbol) ?? 0) + lp.quantity);
    }

    // Compare broker vs local
    for (const [sym, brokerQty] of allBrokerPositionsMap.entries()) {
      const localQty = localMap.get(sym) ?? 0;
      if (brokerQty !== localQty) {
        discrepancies.push(`Quantity mismatch for ${sym}: Broker=${brokerQty}, Local=${localQty}`);
      }
    }

    for (const [sym, localQty] of localMap.entries()) {
      if (!allBrokerPositionsMap.has(sym) && localQty > 0) {
        discrepancies.push(`Local position ${sym} (${localQty}) does not exist on Broker`);
      }
    }

    return {
      reconciledAt: Date.now(),
      brokerPositionsCount: allBrokerPositionsMap.size,
      localPositionsCount: localPositions.length,
      discrepancies,
      synchronized: discrepancies.length === 0
    };
  }
}
