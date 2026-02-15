"use client"

import { useEffect, useRef, useState } from "react"
import { useCompletion } from "@ai-sdk/react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarketTable } from "@/components/bloomberg/market-table"
import { NewsView } from "@/components/bloomberg/news-view"
import { MarketMoversView } from "@/components/bloomberg/market-movers-view"
import { VolatilityView } from "@/components/bloomberg/volatility-view"

export default function TerminalPage() {
  const [marketData, setMarketData] = useState<any[]>([]);
  const [isFetchingMarket, setIsFetchingMarket] = useState(true);

  useEffect(() => {
    fetch('/api/market-data')
      .then(res => res.json())
      .then(data => {
        setMarketData(data);
        setIsFetchingMarket(false);
      })
      .catch(err => {
        console.error("Failed to fetch live data:", err);
        setIsFetchingMarket(false);
      });
  }, []);

  const currentMarketContext = marketData.length > 0 
    ? marketData.map(d => `${d.ticker} (${d.name}): Price $${d.price} | Daily Change ${d.change}`).join("\n")
    : "Fetching live data...";

  const { completion, input, handleInputChange, handleSubmit, isLoading, error } = useCompletion({
    api: '/api/ai',
    body: {
      marketContext: currentMarketContext
    }
  });
  
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [completion]);

  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-zinc-300 font-mono overflow-hidden flex flex-col">
      <div className="h-8 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 text-xs">
        <span className="font-bold text-orange-500 mr-4">QUANT_TERMINAL v1.0</span>
        <span className="text-zinc-500 mr-4">SYS: ONLINE</span>
        <span className={isFetchingMarket ? "text-yellow-500 animate-pulse" : "text-green-500"}>
          {isFetchingMarket ? "MKT: SYNCING..." : "MKT: LIVE"}
        </span>
      </div>

      <div className="flex-1 h-full">
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full rounded-none">
          
          <ResizablePanel defaultSize={15} minSize={10} className="bg-zinc-950">
            <div className="p-4 h-full border-r border-zinc-800 flex flex-col">
              <h3 className="text-xs text-zinc-500 mb-4 uppercase tracking-wider border-b border-zinc-800 pb-2">Watchlist</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-blue-400">AAPL</span><span className="text-green-500">+1.24%</span></div>
                <div className="flex justify-between"><span className="text-blue-400">NVDA</span><span className="text-red-500">-0.58%</span></div>
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle className="bg-zinc-800 w-1" />
          
          <ResizablePanel defaultSize={60}>
            <ResizablePanelGroup orientation="vertical">
              
              {/* TABS UTAMA (Market, News, Movers, Volatility) */}
              <ResizablePanel defaultSize={70} className="bg-[#0f0f0f]">
                <div className="flex h-full flex-col p-4">
                  <Tabs defaultValue="market" className="w-full h-full flex flex-col">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-4">
                      <TabsList className="bg-black border border-zinc-800 p-0 h-auto">
                        <TabsTrigger value="market" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 text-xs font-mono rounded-none px-4 py-1.5">MARKET</TabsTrigger>
                        <TabsTrigger value="news" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 text-xs font-mono rounded-none px-4 py-1.5">NEWS</TabsTrigger>
                        <TabsTrigger value="movers" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 text-xs font-mono rounded-none px-4 py-1.5">MOVERS</TabsTrigger>
                        <TabsTrigger value="volatility" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-500 text-xs font-mono rounded-none px-4 py-1.5">VOLATILITY</TabsTrigger>
                      </TabsList>
                      <span className="text-xs text-zinc-600">
                        {isFetchingMarket ? "Fetching from Alpha Vantage..." : "Data Synced"}
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <TabsContent value="market" className="h-full m-0 data-[state=inactive]:hidden">
                        <MarketTable data={marketData} />
                      </TabsContent>
                      <TabsContent value="news" className="h-full m-0 data-[state=inactive]:hidden">
                        <NewsView />
                      </TabsContent>
                      <TabsContent value="movers" className="h-full m-0 data-[state=inactive]:hidden">
                        <MarketMoversView data={marketData} />
                      </TabsContent>
                      <TabsContent value="volatility" className="h-full m-0 data-[state=inactive]:hidden">
                        <VolatilityView />
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </ResizablePanel>
              
              <ResizableHandle className="bg-zinc-800 h-1" />
              
              {/* AI Command Line */}
              <ResizablePanel defaultSize={30} className="bg-black">
                <div className="flex h-full flex-col p-4 border-t border-zinc-800">
                  <div className="flex-1 overflow-auto text-sm text-zinc-400 mb-2 space-y-1">
                    <div>{`> System initialized.`}</div>
                    <div>{`> AI Agent connected. Awaiting query...`}</div>
                    {isLoading && <div className="text-orange-500 animate-pulse">{`> Running AI Analysis on live market data...`}</div>}
                  </div>
                  <form onSubmit={handleSubmit} className="flex items-center text-orange-500 font-bold bg-zinc-900 p-2 rounded">
                    <span className="mr-2">{`>`}</span>
                    <input 
                      type="text" 
                      value={input}
                      onChange={handleInputChange}
                      className="w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-600 font-mono text-sm"
                      placeholder="e.g., Analyze the volatility view, what are the current risks?"
                      disabled={isLoading || isFetchingMarket}
                    />
                  </form>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="bg-zinc-800 w-1" />
          
          <ResizablePanel defaultSize={25} className="bg-zinc-950">
            <div className="p-4 h-full border-l border-zinc-800 flex flex-col">
              <h3 className="text-xs text-orange-500 mb-4 uppercase tracking-wider border-b border-zinc-800 pb-2 flex justify-between">
                <span>Agent Analysis</span>
                {isLoading && <span className="animate-spin block h-3 w-3 border-2 border-orange-500 border-t-transparent rounded-full"></span>}
              </h3>
              <div ref={chatScrollRef} className="flex-1 overflow-auto text-sm text-zinc-300 space-y-4 pr-2 pb-4 whitespace-pre-wrap">
                {completion ? (
                  <div className="text-zinc-300">
                    {completion}
                  </div>
                ) : (
                  <div className="text-zinc-600 text-xs mt-2">No active sessions. Please input command.</div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
