import React, { useMemo, useState } from "react";
import { CheckCircle2, CircleDollarSign, RefreshCw, Rocket, Target } from "lucide-react";

type RoadmapPhase = {
  days: string;
  title: string;
  outcome: string;
  actions: string[];
  kpis: string[];
};

const STORAGE_KEY = "BUYMONEY_REVENUE_SYSTEM_INPUT";

function loadSavedInput(): { situation: string; goal: string } {
  if (typeof window === "undefined") return { situation: "", goal: "" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { situation: "", goal: "" };
    const parsed = JSON.parse(raw);
    return {
      situation: typeof parsed?.situation === "string" ? parsed.situation : "",
      goal: typeof parsed?.goal === "string" ? parsed.goal : "",
    };
  } catch {
    return { situation: "", goal: "" };
  }
}

function buildRoadmap(situation: string, goal: string): RoadmapPhase[] {
  const target = goal.trim() || "유료 사용자가 반복적으로 결제하는 제품 만들기";
  const context = situation.trim() || "실시간 주식·비트코인 분석 기능을 개발 중인 단계";

  return [
    {
      days: "DAY 1-30",
      title: "검증 가능한 핵심가치 만들기",
      outcome: `${context}에서 고객이 실제로 돈을 낼 1개의 핵심 문제를 확정합니다.`,
      actions: [
        "실시간 시세·차트·신호의 데이터 출처와 지연 상태를 UI에서 명확히 표시",
        "무료 기능과 유료 기능의 경계를 1페이지로 정의",
        "가장 강한 사용 시나리오 1개만 선택해 온보딩을 3단계 이하로 축소",
        "사용자가 신호를 클릭했을 때 근거·무효화 조건·리스크를 같은 화면에서 확인하도록 구성",
      ],
      kpis: ["주간 활성 사용자", "신호 상세 진입률", "7일 재방문율", "오류/데이터 누락률"],
    },
    {
      days: "DAY 31-60",
      title: "유료 베타와 가격 검증",
      outcome: `${target}을 목표로 작은 유료 베타를 운영합니다.`,
      actions: [
        "FREE / PRO 2단계 가격 구조로 시작하고 PRO의 차별점을 실시간 알림·고급 분석·저장 기능에 집중",
        "결제 전환을 유도하는 사용량 한도를 제품 안에서 투명하게 표시",
        "유료 사용자가 실제로 반복 사용하는 기능만 남기고 사용하지 않는 기능은 우선순위 하향",
        "가격은 기능 개수가 아니라 절약되는 시간·검증 수준·알림 가치 기준으로 테스트",
      ],
      kpis: ["무료→유료 전환율", "유료 유지율", "사용자당 월매출", "지원 문의당 해결시간"],
    },
    {
      days: "DAY 61-90",
      title: "반복 가능한 성장 시스템",
      outcome: "획득→활성화→결제→유지의 흐름을 측정하고 자동화합니다.",
      actions: [
        "가입·첫 검색·첫 신호 확인·첫 알림 설정·결제 이벤트를 하나의 퍼널로 측정",
        "전환이 가장 높은 유입 채널 1~2개에만 콘텐츠와 광고 테스트를 집중",
        "서비스 장애·실시간 연결 끊김·데이터 지연을 자동 감지하고 사용자에게 즉시 상태 표시",
        "매주 KPI 리뷰에서 기능 추가보다 전환 병목과 이탈 원인을 먼저 수정",
      ],
      kpis: ["고객획득비용(CAC)", "월 반복매출(MRR)", "결제 이탈률", "퍼널 단계별 전환율"],
    },
  ];
}

export function RevenueSystemRoadmap() {
  const saved = useMemo(loadSavedInput, []);
  const [situation, setSituation] = useState(saved.situation);
  const [goal, setGoal] = useState(saved.goal);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>(() => buildRoadmap(saved.situation, saved.goal));

  const regenerate = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ situation, goal }));
    } catch {
      // Storage is optional. The planner still works without persistence.
    }
    setRoadmap(buildRoadmap(situation, goal));
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8" aria-labelledby="revenue-system-title">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-950 px-5 py-6 text-white sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <CircleDollarSign className="h-4 w-4" />
                BUYMoney Business OS
              </div>
              <h2 id="revenue-system-title" className="text-2xl font-black tracking-tight sm:text-3xl">
                90일 수익화 시스템 설계
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                기능을 더 쌓기 전에, 고객 가치 → 유료 전환 → 반복 매출의 흐름을 제품 안에서 검증합니다.
                목표 수익은 보장하지 않으며 실제 지표로 가설을 계속 수정하는 운영 보드입니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
              <div className="text-xs text-slate-400">핵심 원칙</div>
              <div className="mt-1 text-sm font-bold">측정 → 검증 → 결제 → 유지</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 sm:p-7">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Target className="h-4 w-4" /> 현재 상황
            </span>
            <textarea
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              rows={3}
              placeholder="예: 실시간 종목검색·차트·AI 신호 기능은 있으나 유료 고객은 아직 없음"
              className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Rocket className="h-4 w-4" /> 90일 목표
            </span>
            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              rows={3}
              placeholder="예: PRO 유료 베타 출시 후 반복 결제 고객 확보"
              className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              로드맵 다시 설계
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-3 sm:p-7">
          {roadmap.map((phase) => (
            <article key={phase.days} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black tracking-[0.18em] text-emerald-700">{phase.days}</div>
              <h3 className="mt-2 text-lg font-black text-slate-900">{phase.title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{phase.outcome}</p>

              <div className="mt-5 space-y-3">
                {phase.actions.map((action) => (
                  <div key={action} className="flex gap-2 text-sm leading-5 text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="text-xs font-bold text-slate-500">TRACK</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {phase.kpis.map((kpi) => (
                    <span key={kpi} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {kpi}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
