import React from "react";
import { 
  Building2, 
  Zap, 
  Activity, 
  Shield, 
  Cpu, 
  Brain, 
  Newspaper, 
  Search, 
  Radio, 
  Sliders, 
  Sparkles, 
  FileText,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  Flame,
  ArrowRight
} from "lucide-react";
import { MasterFeatureKey, MASTER_FEATURE_LIST } from "./MasterFeatureModalHub";

interface MasterHubIntegratedGridProps {
  onLaunchFeature: (key: MasterFeatureKey) => void;
}

export const MasterHubIntegratedGrid: React.FC<MasterHubIntegratedGridProps> = ({
  onLaunchFeature
}) => {
  const categories = [
    { key: "ALL", label: "전체 12대 시스템 (ALL)" },
    { key: "CORE", label: "코어 관제 & 뇌통합" },
    { key: "BOT", label: "멀티봇 & 자율매매" },
    { key: "ANALYTICS", label: "뉴스 & 스캐너 분석" },
    { key: "STRATEGY", label: "퀀트 & 샌드박스" }
  ];

  const [activeCategory, setActiveCategory] = React.useState<string>("ALL");

  const filteredList = MASTER_FEATURE_LIST.filter(
    (item) => activeCategory === "ALL" || item.category === activeCategory
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>12대 마스터 시스템 통합 관제 허브</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-mono font-bold border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                12/12 ACTIVE
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              전체 12가지 AI 트레이딩 및 퀀트 리서치 모듈이 중앙 엔진에 완전 동기화되어 가동 중입니다.
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeCategory === c.key
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 12-System Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredList.map((item, idx) => {
          const IconComp = item.icon || Brain;
          return (
            <div
              key={item.key}
              onClick={() => onLaunchFeature(item.key)}
              className="group bg-slate-50/70 hover:bg-white border border-slate-200/90 hover:border-blue-500 rounded-xl p-3.5 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition shadow-2xs">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        SYSTEM #{idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-bold border border-blue-200 whitespace-nowrap">
                    {item.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  실시간 연동 완료
                </span>

                <span className="text-blue-600 group-hover:translate-x-1 transition font-bold flex items-center gap-1">
                  <span>콘솔 열기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
