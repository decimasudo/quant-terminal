"use client"

import { mockNews } from "@/lib/mock-news"

export function NewsView() {
  return (
    <div className="w-full h-full overflow-auto pr-4 flex flex-col space-y-2">
      {mockNews.map((news) => (
        <div key={news.id} className="flex flex-col border-b border-zinc-800 pb-3 hover:bg-zinc-900/30 p-2 transition-colors">
          <div className="flex justify-between items-start mb-1">
            <span className="text-zinc-500 text-xs font-mono">{news.time} | {news.source}</span>
            <div className="flex space-x-2">
              {news.tickers.map(t => (
                <span key={t} className="text-xs font-bold text-blue-400 bg-blue-400/10 px-1 rounded">{t}</span>
              ))}
            </div>
          </div>
          <h4 className="text-sm font-semibold text-zinc-200">{news.headline}</h4>
          <div className="mt-1">
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
              news.sentiment === 'positive' ? 'bg-green-500/20 text-green-500' : 
              news.sentiment === 'negative' ? 'bg-red-500/20 text-red-500' : 
              'bg-zinc-500/20 text-zinc-400'
            }`}>
              {news.sentiment} impact
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
