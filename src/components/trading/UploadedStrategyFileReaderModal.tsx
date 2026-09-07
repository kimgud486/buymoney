import React, { useState } from "react";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Table,
  Zap,
  Play,
  X,
  Code,
  Copy,
  Check,
  RefreshCw,
  Info
} from "lucide-react";

interface UploadedStrategyFileReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCandles?: (candles: Array<{ open: number; high: number; low: number; close: number; volume: number; time?: string }>) => void;
  formatPrice: (p: number) => string;
}

export const UploadedStrategyFileReaderModal: React.FC<UploadedStrategyFileReaderModalProps> = ({
  isOpen,
  onClose,
  onApplyCandles,
  formatPrice,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [parsedCandles, setParsedCandles] = useState<any[]>([]);
  const [parsedJson, setParsedJson] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    setFileSizeStr((file.size / 1024).toFixed(1) + " KB");
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    setFileType(extension);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileContent(text || "");

      // If CSV
      if (extension === "csv" || text.includes(",") || text.includes(";")) {
        try {
          const lines = text.split("\n").filter((l) => l.trim().length > 0);
          const candles: any[] = [];
          for (let i = 0; i < lines.length; i++) {
            const row = lines[i].split(/[,;]/).map((s) => s.trim());
            if (row.length >= 5) {
              const o = parseFloat(row[1]) || parseFloat(row[0]);
              const h = parseFloat(row[2]) || parseFloat(row[1]);
              const l = parseFloat(row[3]) || parseFloat(row[2]);
              const c = parseFloat(row[4]) || parseFloat(row[3]);
              const v = parseFloat(row[5]) || 10000;
              if (!isNaN(c) && c > 0) {
                candles.push({
                  time: row[0] || `T${i}`,
                  open: isNaN(o) ? c : o,
                  high: isNaN(h) ? c : h,
                  low: isNaN(l) ? c : l,
                  close: c,
                  volume: v,
                });
              }
            }
          }
          if (candles.length > 0) {
            setParsedCandles(candles);
            setStatusMsg(`CSV 캔들 데이터 ${candles.length}개 로드 완료`);
          }
        } catch (err) {
          console.error("CSV parse error:", err);
        }
      }

      // If JSON
      if (extension === "json" || text.trim().startsWith("{") || text.trim().startsWith("[")) {
        try {
          const obj = JSON.parse(text);
          setParsedJson(obj);
          setStatusMsg(`JSON 전략 스펙 / 페이로드 파싱 완료`);
        } catch (err) {
          console.error("JSON parse error:", err);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleApplyToChart = () => {
    if (parsedCandles.length > 0 && onApplyCandles) {
      onApplyCandles(parsedCandles);
      setStatusMsg(`✅ ${parsedCandles.length}개 캔들이 실시간 차트 및 AI 예측 엔진에 반영되었습니다.`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide flex items-center gap-2">
                전략 파일 / 오픈소스 데이터 읽기 & 파서
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold">
                  v8 OpenSource Reader
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                AISTOCK24 오픈소스 v8 파일 (OHLCV CSV, JSON 페이로드, 전략 파라미터)을 읽고 시뮬레이션에 즉시 반영합니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 font-mono text-xs flex-1">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              dragOver
                ? "border-purple-500 bg-purple-500/10"
                : "border-zinc-700/80 bg-zinc-950/40 hover:border-purple-500/50 hover:bg-zinc-800/40"
            }`}
          >
            <input
              type="file"
              accept=".csv,.json,.py,.txt,.md"
              onChange={handleFileInputChange}
              className="hidden"
              id="strategy-file-input"
            />
            <label htmlFor="strategy-file-input" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-8 h-8 text-purple-400 mb-2 animate-bounce" />
              <span className="font-sans font-bold text-sm text-zinc-200">
                전략 파일 / CSV 캔들 데이터 끌어놓기 또는 클릭하여 선택
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 font-sans">
                지원 형식: sample_ohlcv.csv, LIVE_PAYLOAD.md, JSON 스펙, Python 스크립트 등
              </span>
            </label>
          </div>

          {statusMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-sans font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {statusMsg}
              </span>

              {parsedCandles.length > 0 && (
                <button
                  onClick={handleApplyToChart}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black rounded-md flex items-center gap-1 transition-all text-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>차트 & AI 예측에 적용</span>
                </button>
              )}
            </div>
          )}

          {/* Uploaded Metadata */}
          {fileName && (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-bold text-zinc-200">{fileName}</div>
                  <div className="text-[10px] text-zinc-500">
                    용량: {fileSizeStr} | 유형: {fileType?.toUpperCase()}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCopyContent}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "복사완료" : "코드 복사"}</span>
              </button>
            </div>
          )}

          {/* Preview Parsed Candles Table */}
          {parsedCandles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-sans font-bold text-xs text-purple-300 flex items-center gap-1">
                  <Table className="w-3.5 h-3.5" />
                  파싱된 OHLCV 캔들 샘플 (상위 5개 / 총 {parsedCandles.length}개)
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-1.5">시각</th>
                      <th className="p-1.5">시가(Open)</th>
                      <th className="p-1.5">고가(High)</th>
                      <th className="p-1.5">저가(Low)</th>
                      <th className="p-1.5">종가(Close)</th>
                      <th className="p-1.5">거래량</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/50">
                    {parsedCandles.slice(0, 5).map((c, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40">
                        <td className="p-1.5 text-zinc-400">{c.time}</td>
                        <td className="p-1.5 text-zinc-200">{formatPrice(c.open)}</td>
                        <td className="p-1.5 text-emerald-400">{formatPrice(c.high)}</td>
                        <td className="p-1.5 text-rose-400">{formatPrice(c.low)}</td>
                        <td className="p-1.5 font-bold text-cyan-300">{formatPrice(c.close)}</td>
                        <td className="p-1.5 text-zinc-400">{(c.volume ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Raw Code / Content Viewer */}
          {fileContent && (
            <div>
              <span className="font-sans font-bold text-xs text-zinc-400 flex items-center gap-1 mb-1.5">
                <Code className="w-3.5 h-3.5" />
                원문 코드 / 데이터 뷰어 (Raw Text Viewer)
              </span>
              <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {fileContent.slice(0, 3000)}
                {fileContent.length > 3000 ? "\n\n... [이하 생략] ..." : ""}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 font-sans">
            <Info className="w-4 h-4 text-purple-400" />
            <span>v8 오픈소스 스펙 파일 적용 시 AI 파이프라인이 매 봉 재예측 및 Adaptive Exit를 연동합니다.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
