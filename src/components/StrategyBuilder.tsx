import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { StrategyCondition, TradingStrategy } from "../types";
import { Plus, Trash, HelpCircle, Save, Sparkles, BookOpen } from "lucide-react";

export const StrategyBuilder: React.FC = () => {
  const { addStrategy, strategies, deleteStrategy } = useApp();
  
  // Strategy Builder form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TradingStrategy["type"]>("trend");
  const [allocation, setAllocation] = useState(25);
  const [conditions, setConditions] = useState<StrategyCondition[]>([
    { indicator: "rsi", operator: "less_than", value: "35" }
  ]);

  const handleAddCondition = () => {
    setConditions(prev => [
      ...prev,
      { indicator: "volume", operator: "greater_than", value: "150" }
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof StrategyCondition, value: string) => {
    setConditions(prev => prev.map((cond, i) => i === index ? { ...cond, [field]: value } : cond));
  };

  const handleSaveStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("전략 이름을 입력해 주세요.");
      return;
    }
    if (conditions.length === 0) {
      alert("최소 한 개 이상의 분석 조건을 추가해야 합니다.");
      return;
    }

    const defaultDesc = description.trim() || `${name} - AI ${type === 'trend' ? '추세추종' : '눌림목'} 투자 자동 조건부 조립 전략.`;

    await addStrategy({
      name,
      description: defaultDesc,
      type,
      isActive: true,
      conditions,
      allocation
    });

    // Reset Form
    setName("");
    setDescription("");
    setType("trend");
    setAllocation(25);
    setConditions([{ indicator: "rsi", operator: "less_than", value: "35" }]);

    alert("새 자동매매 전략이 정상적으로 등록 및 활성화되었습니다!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Interactive Builder Panel */}
      <form onSubmit={handleSaveStrategy} className="bg-white border border-zinc-200 p-5 rounded-lg lg:col-span-2 space-y-5">
        <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center justify-between">
          <span>신규 자동매매 전략 조립 (Strategy Assembly)</span>
          <Sparkles className="h-4 w-4 text-zinc-500" />
        </h3>

        {/* Name and description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">전략 명칭</label>
            <input
              type="text"
              placeholder="예: AI 상방 돌파 분할진입"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-zinc-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">전략 타입</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full p-2 border border-zinc-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50"
            >
              <option value="trend">추세추종 (Trend-Following)</option>
              <option value="pullback">눌림목 (Pullback Bounce)</option>
              <option value="volatility">변동성 돌파 (Volatility Breakout)</option>
              <option value="mean_reversion">평균회귀 (Mean Reversion)</option>
              <option value="news">뉴스이벤트 (News/Sentiment Catalyst)</option>
              <option value="value">장기 우량 가치투자 (Value Growth)</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">전략 상세 설명 (선택)</label>
          <input
            type="text"
            placeholder="예: 보조 지표 과매도 신호 포착 후 AI 동시 승인 시 진입하는 단기 회귀 전략."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-zinc-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50"
          />
        </div>

        {/* Capital Allocation & Risk weighting */}
        <div className="space-y-2 border-t border-zinc-100 pt-4">
          <div className="flex justify-between items-center text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
            <span>자산 배분 가중치 (Allocation Weight)</span>
            <span className="text-zinc-900 font-bold">{allocation}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={allocation}
            onChange={(e) => setAllocation(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
          />
          <p className="text-[10px] text-zinc-400">
            자동매매 감시 중 매매 시그널이 도출되었을 때, 이 전략에 배정하여 동시 투자할 전체 포트폴리오 자산의 최대 비율 한도입니다.
          </p>
        </div>

        {/* Dynamic Conditions Block Builder */}
        <div className="space-y-3.5 border-t border-zinc-100 pt-4">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">진입/청산 융합 분석 조건 (Conditions)</label>
            <button
              type="button"
              onClick={handleAddCondition}
              className="flex items-center gap-1 text-[10px] bg-zinc-100 hover:bg-zinc-200 font-bold text-zinc-800 px-2 py-1 rounded transition cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>조건 추가</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {conditions.map((cond, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-2 items-center bg-zinc-50 border border-zinc-200 p-3 rounded">
                
                {/* Field Select */}
                <select
                  value={cond.indicator}
                  onChange={(e) => handleConditionChange(index, "indicator", e.target.value)}
                  className="w-full md:w-1/3 p-1.5 border border-zinc-200 bg-white rounded text-xs focus:outline-none"
                >
                  <option value="rsi">보조지표: RSI (상대강도지수)</option>
                  <option value="volume">당일 거래량 (20일 평균 대비 %)</option>
                  <option value="ma_cross">평균회귀선: MA 돌파기간</option>
                  <option value="bollinger">볼린저 밴드 이탈 강도</option>
                  <option value="sentiment">AI 감성 종합 점수 (0-100)</option>
                  <option value="market_risk">시장 위험 레벨</option>
                </select>

                {/* Operator Select */}
                <select
                  value={cond.operator}
                  onChange={(e) => handleConditionChange(index, "operator", e.target.value)}
                  className="w-full md:w-1/4 p-1.5 border border-zinc-200 bg-white rounded text-xs focus:outline-none"
                >
                  <option value="less_than">이하 (&lt;)</option>
                  <option value="greater_than">이상 (&gt;)</option>
                  <option value="equals">같음 (=)</option>
                  <option value="crosses_above">골든크로스 돌파 (▲)</option>
                  <option value="crosses_below">데드크로스 이탈 (▼)</option>
                </select>

                {/* Value Input */}
                <input
                  type="text"
                  placeholder="값 입력 (예: 35, 150)"
                  value={cond.value}
                  onChange={(e) => handleConditionChange(index, "value", e.target.value)}
                  className="w-full md:w-1/4 p-1.5 border border-zinc-200 bg-white rounded text-xs focus:outline-none font-mono"
                />

                {/* Remove Condition */}
                <button
                  type="button"
                  onClick={() => handleRemoveCondition(index)}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 rounded hover:bg-zinc-100 transition cursor-pointer"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Form button */}
        <div className="pt-4 border-t border-zinc-100 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Save className="h-4 w-4" />
            <span>이 전략 생성 및 AI 감시 등록</span>
          </button>
        </div>
      </form>

      {/* Strategies catalog sidebar */}
      <div className="bg-white border border-zinc-200 p-5 rounded-lg lg:col-span-1 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3 flex items-center gap-1.5">
          <BookOpen className="h-4.5 w-4.5 text-zinc-500" />
          <span>등록된 전략 카탈로그</span>
        </h3>
        <p className="text-[11px] text-zinc-400">
          현재 가동 중인 자동매매 알고리즘 목록입니다. 불필요하거나 폐기할 전략은 삭제할 수 있습니다.
        </p>

        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {strategies.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-400">
              등록된 전략이 아직 존재하지 않습니다.
            </div>
          ) : (
            strategies.map((strat, idx) => (
              <div key={`${strat.id}_${idx}`} className="p-3 border border-zinc-150 rounded bg-zinc-50 space-y-2 relative group">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 truncate max-w-[140px]">{strat.name}</span>
                    <button
                      onClick={() => deleteStrategy(strat.id)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-zinc-200 transition opacity-0 group-hover:opacity-100 absolute top-2 right-2"
                      title="전략 영구 삭제"
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-2">{strat.description}</p>
                </div>

                {/* Display compiled strategy rules */}
                <div className="text-[9px] font-mono text-zinc-500 bg-white border border-zinc-200 p-2 rounded space-y-1">
                  <div className="text-zinc-400 font-bold uppercase text-[8px] mb-1">매매 감시 룰:</div>
                  {strat.conditions.map((c, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-zinc-600">{c.indicator}</span>
                      <span>
                        {c.operator === "less_than" ? "≤" : c.operator === "greater_than" ? "≥" : "="} {c.value}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-100 mt-1 pt-1 flex justify-between font-bold text-zinc-800">
                    <span>배분 자금 한도:</span>
                    <span>{strat.allocation}%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
