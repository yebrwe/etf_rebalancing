import React from 'react';

interface Props {
  useAdditionalCash: boolean;
  setUseAdditionalCash: (value: boolean) => void;
  additionalCashType: 'none' | 'percent' | 'fixed';
  setAdditionalCashType: (value: 'none' | 'percent' | 'fixed') => void;
  additionalCashPercent: number;
  setAdditionalCashPercent: (value: number) => void;
  additionalCashFixed: number;
  setAdditionalCashFixed: (value: number) => void;
}

export default function AdditionalCashSettings({
  useAdditionalCash,
  setUseAdditionalCash,
  additionalCashType,
  setAdditionalCashType,
  additionalCashPercent,
  setAdditionalCashPercent,
  additionalCashFixed,
  setAdditionalCashFixed
}: Props) {
  return (
    <section 
      aria-label="추가 예수금 설정" 
      className="mb-6 space-y-4 bg-white p-4 rounded-lg shadow-sm"
    >
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="useAdditionalCash"
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            checked={useAdditionalCash}
            onChange={(e) => {
              setUseAdditionalCash(e.target.checked);
              if (e.target.checked) {
                setAdditionalCashType('percent');
                setAdditionalCashPercent(10);
              } else {
                setAdditionalCashType('none');
              }
            }}
          />
          <label htmlFor="useAdditionalCash" className="ml-2 text-sm font-medium text-gray-700">
            추가 예수금 사용
          </label>
        </div>

        {useAdditionalCash && (
          <div className="ml-6 space-y-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="w-4 h-4 text-blue-600"
                  name="additionalCashType"
                  checked={additionalCashType === 'percent'}
                  onChange={() => setAdditionalCashType('percent')}
                />
                <span className="ml-2 text-sm">비율로 설정</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="w-4 h-4 text-blue-600"
                  name="additionalCashType"
                  checked={additionalCashType === 'fixed'}
                  onChange={() => setAdditionalCashType('fixed')}
                />
                <span className="ml-2 text-sm">금액으로 설정</span>
              </label>
            </div>

            {additionalCashType === 'percent' && (
              <div className="flex items-center gap-2">
                <select
                  className="form-select rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  value={additionalCashPercent}
                  onChange={(e) => setAdditionalCashPercent(Number(e.target.value))}
                >
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={20}>20%</option>
                </select>
                <span className="text-sm text-gray-600">총 자산 대비</span>
              </div>
            )}

            {additionalCashType === 'fixed' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={additionalCashFixed.toLocaleString()}
                  onChange={(e) => {
                    const value = Number(e.target.value.replace(/,/g, ''));
                    if (!isNaN(value)) {
                      setAdditionalCashFixed(value);
                    }
                  }}
                  placeholder="추가 예수금 입력"
                />
                <span className="text-sm text-gray-600">원</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
} 