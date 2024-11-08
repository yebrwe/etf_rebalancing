export interface ETF {
  ticker: string;
  quantity: number;
}

export interface PriceData {
  price: number;
  currency: string;
  timestamp: string;
}

export interface Trade {
  ticker: string;
  currentQuantity: number;
  newQuantity: number;
  quantityDiff: number;
  currentValue: number;
  newValue: number;
  currentWeight: number;
  newWeight: number;
  targetWeight: number;
  price: number;
}

export interface RebalanceScenario {
  trades: Trade[];
  totalAssetValue: number;
  totalAssetValueKRW: number;
  additionalCashNeeded: number;
  remainingCash: number;
  maxWeightDiff: number;
  totalWeightDiff: number;
  needsRebalancing: boolean;
} 