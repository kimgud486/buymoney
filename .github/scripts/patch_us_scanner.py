from pathlib import Path

path = Path("src/components/RealtimeStockMarketScanner.tsx")
text = path.read_text(encoding="utf-8")

state_marker = '  const [stocks, setStocks] = useState<ScannerStock[]>(INITIAL_UNIVERSE);\n'
state_replacement = '''  // Include US candidates from the existing global scanner pipeline.
  const mapGlobalScannedStock = (item: GlobalScannedStock, index: number): ScannerStock => ({
    id: `global-${item.market}-${item.symbol}`,
    rank: index + 1,
    symbol: item.symbol,
    name: item.name,
    market: item.market,
    capType: getCapType({ symbol: item.symbol, tradingValue: item.tradingValue }),
    price: Number(item.price) || 0,
    changePct: Number(item.changePct) || 0,
    tradingValue: Number(item.tradingValue) || 0,
    volumeStatus: item.rvol >= 3 ? "급증" : item.rvol >= 1.5 ? "증가" : "보통",
    rvol: Number(item.rvol) || 0,
    executionPower: Math.max(0, Math.round(100 + (Number(item.changePct) || 0) * 2 + (Number(item.rvol) || 0) * 5)),
    aiScore: Number(item.scores?.totalScore) || 0,
    aiScoreChange: Math.max(0, Math.round((Number(item.changePct) || 0) + (Number(item.rvol) || 0))),
    hasBos: ["Breakout", "Breakout+Retest", "52W High", "Volume Breakout", "Gap & Go", "ORB", "Base Breakout", "Momentum Continuation", "Relative Strength Leader"].includes(item.setup),
    hasChoch: item.setup === "VCP",
    hasVwapBreak: item.setup === "EMA Pullback" || Number(item.scores?.emaAlignment || 0) >= 8,
    hasNews: Array.isArray(item.catalysts) && item.catalysts.length > 0
  });

  const getUsScannerUniverse = (): ScannerStock[] =>
    GlobalStockDiscoveryScannerService.runPipeline({
      market: "US",
      minScore: 0,
      gradeFilter: "ALL",
      setupFilter: "ALL",
      searchQuery: ""
    }).map(mapGlobalScannedStock);

  const INITIAL_US_UNIVERSE = getUsScannerUniverse();
  const ALL_INITIAL_UNIVERSE = [
    ...INITIAL_UNIVERSE,
    ...INITIAL_US_UNIVERSE.filter(
      (us) => !INITIAL_UNIVERSE.some((base) => base.symbol.toUpperCase() === us.symbol.toUpperCase())
    )
  ];

  const [stocks, setStocks] = useState<ScannerStock[]>(ALL_INITIAL_UNIVERSE);
'''

if "const getUsScannerUniverse" not in text:
    if state_marker not in text:
        raise SystemExit("stocks state marker not found")
    text = text.replace(state_marker, state_replacement, 1)

symbol_marker = '      const symbolList = INITIAL_UNIVERSE.map(s => s.symbol).join(",");\n'
symbol_replacement = '''      const usScannerUniverse = getUsScannerUniverse();
      setStocks((prev) => {
        const merged = [...prev];
        usScannerUniverse.forEach((candidate) => {
          const idx = merged.findIndex(
            (item) => item.symbol.toUpperCase() === candidate.symbol.toUpperCase()
          );
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...candidate, flash: merged[idx].flash };
          } else {
            merged.push(candidate);
          }
        });
        return merged;
      });

      const symbolList = [...INITIAL_UNIVERSE, ...usScannerUniverse]
        .map((item) => item.symbol)
        .filter((symbol, index, all) => all.indexOf(symbol) === index)
        .join(",");
'''

if symbol_marker in text:
    text = text.replace(symbol_marker, symbol_replacement, 1)
elif "const usScannerUniverse = getUsScannerUniverse();" not in text:
    raise SystemExit("live symbol marker not found")

path.write_text(text, encoding="utf-8")
print("US scanner wiring patched")
