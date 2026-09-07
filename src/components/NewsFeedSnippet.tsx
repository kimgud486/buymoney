import React from "react";
import { Newspaper, ExternalLink, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { ThemeNewsItem } from "./SmartThemeSearchModal";

interface NewsFeedSnippetProps {
  news: ThemeNewsItem[];
  query?: string;
}

export const NewsFeedSnippet: React.FC<NewsFeedSnippetProps> = ({ news, query }) => {
  if (!news || news.length === 0) return null;

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-cyan-400" />
          <span>'{query || "검색어"}' 관련 실시간 주요 뉴스 (NewsFeedSnippet 5)</span>
        </h4>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
          AI Sentiment 5
        </span>
      </div>

      <div className="space-y-2">
        {news.slice(0, 5).map((item, idx) => (
          <div
            key={item.id || idx}
            className="p-3 bg-zinc-950/80 hover:bg-zinc-950 border border-zinc-800/90 hover:border-cyan-500/40 rounded-xl transition space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <h5 className="text-xs sm:text-sm font-bold text-zinc-100 leading-snug line-clamp-1">
                {item.title}
              </h5>
              <span
                className={`shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded border ${
                  item.sentiment === "positive"
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                    : item.sentiment === "negative"
                    ? "bg-rose-950 text-rose-300 border-rose-500/40"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700"
                }`}
              >
                {item.sentiment === "positive" ? "🚀 호재" : item.sentiment === "negative" ? "⚠️ 악재" : "💬 중립"}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
              {item.snippet}
            </p>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 font-mono">
              <div className="flex items-center space-x-2">
                <span className="text-zinc-300 font-bold">{item.source}</span>
                <span>•</span>
                <span>{item.time}</span>
              </div>
              <span className="text-cyan-400 font-sans font-bold">수혜/영향: {item.impactStock}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
