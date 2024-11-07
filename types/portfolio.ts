export interface ETF {
  ticker: string;
  quantity: number;
  targetWeight: number;
}

export interface AdjustedTrade extends ETF {
  currentValue: number;
  currentWeight: number;
  weightDiff: number;
  pricePer: number;
  exchange: string;
  isWithinThreshold: boolean;
  targetValue: number;
  valueDiff: number;
  quantityDiff: number;
  newQuantity: number;
  newValue: number;
  newWeight: number;
  weightDiffAfterTrade: number;
  adjustmentReason: string;
}

export interface OutOfRangeETF {
  ticker: string;
  targetWeight: number;
  finalWeight: number;
  difference: number;
}

export interface RebalanceResults {
  totalValueUSD: number;
  totalValueKRW: number;
  remainingCash: number;
  additionalCashNeeded: number;
  items: AdjustedTrade[];
  rebalancingPossible: boolean;
  totalBuyNeeded: number;
  availableCash: number;
  outOfRangeETFs: OutOfRangeETF[];
  cashBalance: number;
  totalSellValue: number;
} 