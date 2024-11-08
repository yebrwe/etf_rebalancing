export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 tracking-wider uppercase">
              ETF 리밸런싱 계산기
            </h3>
            <p className="mt-4 text-sm text-gray-500">
              미국 ETF 포트폴리오 리밸런싱을 쉽게 계산해보세요.
              실시간 가격 정보를 기반으로 정확한 리밸런싱을 도와드립니다.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 tracking-wider uppercase">
              주요 기능
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                  실시간 ETF 가격 조회
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                  포트폴리오 리밸런싱
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                  매매 수량 계산
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600 tracking-wider uppercase">
              법적 고지
            </h3>
            <p className="mt-4 text-sm text-gray-500">
              본 서비스는 투자 권유가 아닙니다.
              제공되는 정보는 투자 결정의 참고 자료로만 사용하시기 바랍니다.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-400 text-center">
            &copy; {new Date().getFullYear()} ETF 리밸런싱 계산기. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
} 