import React from "react";
import { Activity } from "lucide-react";

interface MiniVolumeBarProps {
  volume?: number | string;
  volumePower?: number; // e.g. 115.4 (% 체결강도)
  market?: string;
}

export const MiniVolumeBar: React.FC<MiniVolumeBarProps> = ({
  volume,
  volumePower = 100,
  market = "KOREA"
}) => {
  // Format Volume display
  const numVol = typeof volume === "number" ? volume : parseFloat(String(volume || "0").replace(/[^0-9.]/g, ""));
  
  const displayVolStr = typeof volume === "string" && volume.includes("주")
    ? volume
    : numVol > 1000000
    ? `${(numVol / 1000000).toFixed(1)}M`
    : numVol > 1000
    ? `${(numVol / 1000).toFixed(1)}K`
    : (numVol ?? 0).toLocaleString();

  // Volume power intensity (e.g., >100% buy power, <100% sell power)
  const isBuyDominant = volumePower >= 100;
  const powerGaugePct = Math.min(Math.max((volumePower / 200) * 100, 15), 100);

  return (
    <div className="flex flex-col items-end text-right font-mono space-y-0.5">
      <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-800">
        <Activity className="h-3 w-3 text-cyan-600" />
        <span>{displayVolStr || "124.5K"}</span>
      </div>

      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="text-zinc-400 font-sans">체결강도</span>
        <span className={`font-bold ${isBuyDominant ? "text-emerald-600" : "text-rose-600"}`}>
          {volumePower.toFixed(1)}%
        </span>
      </div>

      {/* Mini Volume Power Gauge Bar */}
      <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden mt-0.5">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            isBuyDominant ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-rose-500 to-amber-500"
          }`}
          style={{ width: `${powerGaugePct}%` }}
        />
      </div>
    </div>
  );
};
