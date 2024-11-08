import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: '리밸런싱은 언제 해야 하나요?',
    answer: '일반적으로 포트폴리오의 자산 비중이 목표 비중에서 0.5% 이상 벗어났을 때 리밸런싱을 고려할 수 있습니다. 하지만 너무 잦은 리밸런싱은 거래 비용을 증가시킬 수 있으므로, 분기 또는 반기 단위로 정기적인 점검을 추천드립니다.'
  },
  {
    question: '추가 예수금은 어떤 경우에 사용하나요?',
    answer: '리밸런싱 시 추가 투자를 계획하고 있는 경우, 추가 예수금 기능을 활용하면 새로운 자금을 포함한 최적의 포트폴리오 비중을 계산할 수 있습니다. 비율이나 금액으로 설정 가능합니다.'
  },
  {
    question: '실시간 가격은 어떻게 업데이트되나요?',
    answer: '야후 파이낸스 API를 통해 실시간 시장 가격을 조회합니다. 시장 운영 시간 동안 1분 간격으로 가격이 자동 업데이트됩니다.'
  },
  {
    question: '설정은 자동으로 저장되나요?',
    answer: '네, 포트폴리오 구성과 모든 설정은 브라우저의 로컬 스토리지에 자동 저장됩니다. 다음 방문 시에도 이전 설정을 그대로 불러올 수 있습니다.'
  },
  {
    question: '목표 비중은 어떻게 변경하나요?',
    answer: '각 ETF의 목표 비중은 테이블의 "목표 비중" 열에서 직접 수정할 수 있습니다. 입력한 값은 자동으로 저장되며, 즉시 리밸런싱 계산에 반영됩니다.'
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        자주 묻는 질문
      </h2>
      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <div key={index} className="border rounded-lg overflow-hidden">
            <button
              className="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none flex justify-between items-center"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <span className="font-medium text-gray-800">{item.question}</span>
              <span className="ml-6 flex-shrink-0">
                {openIndex === index ? (
                  <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </span>
            </button>
            {openIndex === index && (
              <div className="px-4 py-3 bg-gray-50">
                <p className="text-gray-600">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
} 