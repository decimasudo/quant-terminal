"use client"

export function VolatilityView() {
  return (
    <div className="w-full h-full p-4 flex flex-col space-y-4 overflow-auto">
      <div className="bg-[#0a0a0a] border border-zinc-800 p-4">
        <h4 className="text-xs font-bold text-orange-500 mb-2">VIX (VOLATILITY INDEX) OVERVIEW</h4>
        <div className="flex items-end space-x-4 mb-4">
          <span className="text-3xl font-mono text-zinc-200">14.25</span>
          <span className="text-sm text-red-500 font-mono mb-1">-0.42 (-2.86%)</span>
        </div>
        <div className="w-full bg-zinc-900 h-2 rounded overflow-hidden">
          <div className="bg-orange-500 w-1/3 h-full"></div>
        </div>
        <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
          <span>LOW RISK (10)</span>
          <span>HIGH RISK (30+)</span>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-zinc-800 p-4">
        <h4 className="text-xs font-bold text-zinc-400 mb-3">AI RISK ASSESSMENT (FINROBOT)</h4>
        <ul className="text-xs text-zinc-300 space-y-2 list-disc pl-4">
          <li>Market currently exhibits <span className="text-green-400">low turbulence</span>.</li>
          <li>Tech sector beta is tracking 1.2x relative to S&P 500 baseline.</li>
          <li>Geopolitical events in the Middle East present isolated supply chain risks.</li>
        </ul>
      </div>
    </div>
  )
}
