import React from 'react';
import { RebalanceScenario } from '@/types/portfolio';

interface Props {
  results: RebalanceScenario;
  useAdditionalCash: boolean;
  additionalCashType: 'none' | 'percent' | 'fixed';
  additionalCashPercent: number;
  additionalCashFixed: number;
}

export default function PortfolioSummary({
  results,
  useAdditionalCash,
  additionalCashType,
  additionalCashPercent,
  additionalCashFixed
}: Props) {
  return (
    <div className="mt-6 bg-white p-4 rounded-lg shadow-sm space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">총 포트폴리오 가치</p>
          <p className="text-lg font-medium">
            {Math.round(results.totalAssetValueKRW).toLocaleString()}원
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">남은 예수금</p>
          <p className="text-lg font-medium">
            {Math.round(results.remainingCash).toLocaleString()}원
          </p>
        </div>
        {useAdditionalCash && (
          <div>
            <p className="text-sm text-gray-600">추가 예수금</p>
            <p className="text-lg font-medium text-blue-600">
              {additionalCashType === 'percent' 
                ? `${additionalCashPercent}% (${Math.round(results.totalAssetValueKRW * (additionalCashPercent / 100)).toLocaleString()}원)`
                : `${Math.round(additionalCashFixed).toLocaleString()}원`}
            </p>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600">리밸런싱 필요 여부</p>
          <p className={`text-lg font-medium ${results.needsRebalancing ? 'text-red-600' : 'text-green-600'}`}>
            {results.needsRebalancing ? '리밸런싱 필요' : '리밸런싱 불필요'}
          </p>
        </div>
        {results.needsRebalancing && (
          <>
            <div>
              <p className="text-sm text-gray-600">최대 비중 차이</p>
              <p className="text-lg font-medium text-red-600">
                {results.maxWeightDiff.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">총 비중 차이</p>
              <p className="text-lg font-medium text-red-600">
                {results.totalWeightDiff.toFixed(2)}%
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 