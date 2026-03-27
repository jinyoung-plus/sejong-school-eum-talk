import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-700 text-navy-300 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-400 to-primary-600 rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[9px]">이음</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">세종 스쿨이음톡</p>
              <p className="text-[11px] text-navy-400">
                부서 간 칸막이를 허무는 학교데이터 원클릭 공유 플랫폼
              </p>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-xs text-navy-400 flex items-center gap-1 justify-center md:justify-end">
              세종특별자치시교육청 AI 학습동아리
              <Heart size={10} className="text-primary-400 fill-primary-400" />
            </p>
            <p className="text-[10px] text-navy-500 mt-1">
              © 2026 SejongSchoolEumTalk. 데이터 기준일: 2026.03.01
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
