"use client"

export function MarketMoversView({ data }: { data: any[] }) {
  // Pisahkan data menjadi Gainers dan Losers
  const gainers = [...data].filter(d => d.isPositive).sort((a, b) => parseFloat(b.change) - parseFloat(a.change));
  const losers = [...data].filter(d => !d.isPositive).sort((a, b) => parseFloat(a.change) - parseFloat(b.change));

  return (
    <div className="w-full h-full flex gap-4 overflow-hidden pr-2">
      {/* Top Gainers Panel */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-zinc-800 p-3">
        <h4 className="text-xs font-bold text-green-500 mb-3 border-b border-zinc-800 pb-2">TOP GAINERS</h4>
        <div className="flex-1 overflow-auto space-y-2">
          {gainers.length > 0 ? gainers.map(item => (
            <div key={item.ticker} className="flex justify-between items-center p-2 hover:bg-zinc-900">
              <div>
                <div className="font-bold text-blue-400 font-mono">{item.ticker}</div>
                <div className="text-[10px] text-zinc-500">{item.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-200">{item.price.toFixed(2)}</div>
                <div className="text-xs text-green-500 font-bold">{item.change}</div>
              </div>
            </div>
          )) : <div className="text-xs text-zinc-600">No gainers today.</div>}
        </div>
      </div>

      {/* Top Losers Panel */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-zinc-800 p-3">
        <h4 className="text-xs font-bold text-red-500 mb-3 border-b border-zinc-800 pb-2">TOP LOSERS</h4>
        <div className="flex-1 overflow-auto space-y-2">
          {losers.length > 0 ? losers.map(item => (
            <div key={item.ticker} className="flex justify-between items-center p-2 hover:bg-zinc-900">
              <div>
                <div className="font-bold text-blue-400 font-mono">{item.ticker}</div>
                <div className="text-[10px] text-zinc-500">{item.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-200">{item.price.toFixed(2)}</div>
                <div className="text-xs text-red-500 font-bold">{item.change}</div>
              </div>
            </div>
          )) : <div className="text-xs text-zinc-600">No losers today.</div>}
        </div>
      </div>
    </div>
  )
}
