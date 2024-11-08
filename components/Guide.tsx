import React from 'react';

export default function Guide() {
  return (
    <section className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        사용 가이드
      </h2>
      <div className="space-y-8">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            1. 포트폴리오 설정
          </h3>
          <ul className="space-y-2 list-disc list-inside text-gray-600">
            <li>ETF 티커와 보유 수량을 입력합니다.</li>
            <li>각 ETF의 목표 비중을 설정합니다.</li>
            <li>현재 보유 중인 예수금을 입력합니다.</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            2. 추가 예수금 설정
          </h3>
          <ul className="space-y-2 list-disc list-inside text-gray-600">
            <li>추가 투자 계획이 있는 경우 활성화합니다.</li>
            <li>비율 또는 금액으로 설정 가능합니다.</li>
            <li>전체 자산 대비 비율로 설정하거나 구체적인 금액을 입력할 수 있습니다.</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            3. 리밸런싱 결과 확인
          </h3>
          <ul className="space-y-2 list-disc list-inside text-gray-600">
            <li>현재 비중과 목표 비중의 차이를 확인합니다.</li>
            <li>매수/매도가 필요한 수량을 확인합니다.</li>
            <li>리밸런싱 후의 예상 포트폴리오 비중을 검토합니다.</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            4. 설정 저장 및 초기화
          </h3>
          <ul className="space-y-2 list-disc list-inside text-gray-600">
            <li>모든 설정은 자동으로 저장됩니다.</li>
            <li>필요한 경우 초기화 버튼을 통해 설정을 리셋할 수 있습니다.</li>
            <li>브라우저 캐시를 삭제하면 저장된 설정이 초기화됩니다.</li>
          </ul>
        </div>
      </div>
    </section>
  );
} 