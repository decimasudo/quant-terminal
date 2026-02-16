"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Activity, ChevronDown, MessageSquare, Newspaper, Send, Zap } from "lucide-react"
import { createChart, ColorType, CrosshairMode, CandlestickSeries, UTCTimestamp } from "lightweight-charts"

const klineCache: Record<string, any[]> = {}

// ==========================================
// 1. KOMPONEN CHART
// ==========================================
function TradingChart({ symbol, timeframe }: { symbol: string, timeframe: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#12161a' }, textColor: '#848e9c' },
      grid: { vertLines: { color: '#1e2329' }, horzLines: { color: '#1e2329' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: '#1e2329', rightOffset: 5 },
      rightPriceScale: { borderColor: '#1e2329' },
      autoSize: true, 
    })

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444', 
      borderVisible: false, 
      wickUpColor: '#22c55e', wickDownColor: '#ef4444'
    })

    const cacheKey = `${symbol}-${timeframe}`

    if (klineCache[cacheKey]) {
      candlestickSeries.setData(klineCache[cacheKey])
      chart.timeScale().fitContent() 
    }

    fetch(`/api/klines?symbol=${symbol}&interval=${timeframe}`)
      .then(res => res.json())
      .then(data => {
        if(data && Array.isArray(data)) {
            const formattedData = data.map((d: any) => ({
              time: Math.floor(d[0] / 1000) as UTCTimestamp,
              open: parseFloat(d[1]),
              high: parseFloat(d[2]),
              low: parseFloat(d[3]),
              close: parseFloat(d[4]),
            }))
            
            klineCache[cacheKey] = formattedData
            candlestickSeries.setData(formattedData)
            chart.timeScale().fitContent() 
        }
      })
      .catch(err => console.log("Gagal memuat histori:", err))

    const wsUrl = `wss://stream-cloud.tokocrypto.site/ws/${symbol.toLowerCase()}@kline_${timeframe}`
    const ws = new WebSocket(wsUrl)
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      const kline = message.k
      if (kline) {
        candlestickSeries.update({
          time: Math.floor(kline.t / 1000) as UTCTimestamp,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
        })
      }
    }
    
    return () => {
      ws.close()
      chart.remove()
    }
  }, [symbol, timeframe])

  return <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default function TerminalPage() {
  const [activeTab, setActiveTab] = useState("aichat")
  const [chartTimeframe, setChartTimeframe] = useState("1h")
  const [isPositionsCollapsed, setIsPositionsCollapsed] = useState(false)
  const [newsList, setNewsList] = useState<any[]>([])
  
  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState([
    { role: 'system', content: 'Quant Agent System Online. Monitoring markets in real-time.' },
    { role: 'system', content: 'Choose a recommendation below or type your analysis command.' }
  ])
  const [isAiTyping, setIsAiTyping] = useState(false)

  const aiSuggestions = [
    "Analyze current DOT trend",
    "What's BTC support level?",
    "Find Top Gainer coins"
  ]

  const [watchlist, setWatchlist] = useState([
    { sym: "BTC", name: "Bitcoin", price: "$0.00", chg: "0.00%", isUp: true },
    { sym: "ETH", name: "Ethereum", price: "$0.00", chg: "0.00%", isUp: true },
    { sym: "BNB", name: "Binance", price: "$0.00", chg: "0.00%", isUp: true },
    { sym: "SOL", name: "Solana", price: "$0.00", chg: "0.00%", isUp: true },
    { sym: "XRP", name: "Ripple", price: "$0.00", chg: "0.00%", isUp: true },
    { sym: "ADA", name: "Cardano", price: "$0.00", chg: "0.00%", isUp: true },
    { sym: "DOGE", name: "Dogecoin", price: "$0.00", chg: "0.00%", isUp: true },
    { sym: "AVAX", name: "Avalanche", price: "$0.00", chg: "0.00%", isUp: true },
    { sym: "DOT", name: "Polkadot", price: "$0.00", chg: "0.00%", isUp: true },
    { sym: "POL", name: "Polygon", price: "$0.00", chg: "0.00%", isUp: true },
  ])

  const [dotTicker, setDotTicker] = useState({
    price: "0.00", chgAmt: "0.00", chgPct: "0.00%", bid: "0.00", ask: "0.00", high: "0.00", low: "0.00", vol: "0", isUp: true
  })

  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] })

  useEffect(() => {
    const wsTicker = new WebSocket('wss://stream-cloud.tokocrypto.site/ws/!ticker@arr')
    wsTicker.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setWatchlist(prev => prev.map(item => {
        let symbolQuery = item.sym + "USDT";
        if (item.sym === 'SHIB') symbolQuery = "1000SHIBUSDT"; 
        const update = data.find((d: any) => d.s === symbolQuery)
        if (update) {
          const isUp = parseFloat(update.P) >= 0
          const priceStr = parseFloat(update.c) < 1 
            ? parseFloat(update.c).toFixed(4) 
            : parseFloat(update.c).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return { ...item, price: `$${priceStr}`, chg: `${isUp ? '+' : ''}${parseFloat(update.P).toFixed(2)}%`, isUp }
        }
        return item
      }))

      const dotUpdate = data.find((d: any) => d.s === "DOTUSDT")
      if (dotUpdate) {
        setDotTicker({
          price: parseFloat(dotUpdate.c).toFixed(3), chgAmt: parseFloat(dotUpdate.p).toFixed(3),
          chgPct: `${parseFloat(dotUpdate.P).toFixed(2)}%`, bid: parseFloat(dotUpdate.b).toFixed(3),
          ask: parseFloat(dotUpdate.a).toFixed(3), high: parseFloat(dotUpdate.h).toFixed(3),
          low: parseFloat(dotUpdate.l).toFixed(3), vol: parseFloat(dotUpdate.v).toLocaleString('en-US', { maximumFractionDigits: 0 }),
          isUp: parseFloat(dotUpdate.P) >= 0
        })
      }
    }
    return () => wsTicker.close()
  }, [])

  useEffect(() => {
    const wsDepth = new WebSocket('wss://stream-cloud.tokocrypto.site/ws/dotusdt@depth20@100ms')
    wsDepth.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // FIX ORDER BOOK: Depth API menggunakan properties .asks dan .bids
      const rawAsks = data.asks || data.a || [];
      const rawBids = data.bids || data.b || [];

      let askTotal = 0;
      const processedAsks = rawAsks.slice(0, 20).map((ask: any) => { 
        askTotal += parseFloat(ask[1]); 
        return [...ask, askTotal] 
      }).reverse();

      let bidTotal = 0;
      const processedBids = rawBids.slice(0, 20).map((bid: any) => { 
        bidTotal += parseFloat(bid[1]); 
        return [...bid, bidTotal] 
      });

      setOrderBook({ asks: processedAsks, bids: processedBids })
    }
    return () => wsDepth.close()
  }, [])

  useEffect(() => {
    fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN')
      .then(res => res.json())
      .then(data => { 
        console.log('News API response:', data);
        if (data && data.Data && Array.isArray(data.Data)) {
          setNewsList(data.Data.slice(0, 20));
        } else {
          console.error('Unexpected news API response structure:', data);
          setNewsList([]); // Fallback to empty array
        }
      })
      .catch(error => {
        console.error('Failed to fetch news:', error);
        setNewsList([]);
      });
  }, [])

  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;
    
    // 1. Masukkan chat user
    setChatHistory(prev => [...prev, { role: 'user', content: text }]);
    setChatInput("");
    setIsAiTyping(true);

    try {
      // 2. Fetch ke API AI
      const marketContext = `DOT/USDT: Price ${dotTicker.price}, Change ${dotTicker.chgPct}, Volume ${dotTicker.vol}`;
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, marketContext })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const aiResponse = await response.text();
      
      setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        content: `Error: Unable to get AI response. ${error instanceof Error ? error.message : 'Unknown error'}` 
      }]);
    } finally {
      setIsAiTyping(false);
    }
  }

  const positions = [
    { sym: "BTC/USDT", side: "LONG", size: "0.4404", entry: "$65589.80", current: "$66587.20", pnl: "+$439.30", pnlPct: "+1.52%" },
    { sym: "DOT/USDT", side: "LONG", size: "16397.75", entry: "$1.3300", current: "$1.3261", pnl: "-$63.951", pnlPct: "-0.29%" },
  ]

  const spread = orderBook.asks.length > 0 && orderBook.bids.length > 0 
    ? (parseFloat(orderBook.asks[orderBook.asks.length-1][0]) - parseFloat(orderBook.bids[0][0])).toFixed(4) : "0.0000"

  const formatTime = (unixTime: number) => {
    const date = new Date(unixTime * 1000)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div className="h-screen w-full bg-[#0b0e11] text-[#848e9c] font-mono overflow-hidden flex flex-col text-[11px] leading-tight select-none">
      
      {/* TOP NAVBAR */}
      <div className="h-8 border-b border-[#1e2329] bg-[#0b0e11] flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold flex items-center gap-2">
            <Activity size={14} className="text-[#f59e0b]" /> FinceptTerminal
          </span>
          <div className="flex gap-4 text-[#848e9c] ml-4">
            {/* TABS YANG TIDAK DIPAKAI SUDAH DIHAPUS */}
            <span className="text-[#f59e0b] border-b-2 border-[#f59e0b] pb-[6px] font-bold cursor-default">Crypto Trading</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 items-center">
            <span className="text-[#f59e0b]">v3.3.0</span>
            <span className="text-green-500 font-bold">FINCEPT PROFESSIONAL</span>
            <span className="text-purple-400">_tilakpatel_</span>
          </div>
        </div>
      </div>

      {/* SUB NAVBAR */}
      <div className="h-10 border-b border-[#1e2329] bg-[#12161a] flex items-center justify-between px-4 shrink-0">
        <div className="flex h-full items-center gap-6">
          <span className="flex items-center gap-2 text-[#f59e0b] font-bold tracking-wider">
            <Activity size={14} /> CRYPTO TERMINAL
          </span>
          <div className="flex items-center gap-2 bg-[#1e2329] px-2 py-1 rounded">
            <span className="text-white">BINANCE</span> <ChevronDown size={12} />
          </div>
          <div className="flex gap-2">
            <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded border border-green-500/50">■ PAPER</span>
            <span className="text-[#848e9c] px-2 py-1 hover:text-white cursor-pointer">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-500 flex items-center gap-1">● CONNECTED</span>
        </div>
      </div>

      {/* TICKER INFO BAR */}
      <div className="h-14 border-b border-[#1e2329] bg-[#0b0e11] flex items-center px-4 gap-8 shrink-0">
        <div className="flex flex-col"><span className="text-[#f59e0b] font-bold text-sm bg-[#1e2329]/50 px-2 py-1 rounded border border-[#f59e0b]/30">DOT/USDT</span></div>
        <div className="flex gap-2 items-baseline w-[150px]">
          <span className={`text-2xl font-bold ${dotTicker.isUp ? 'text-green-500' : 'text-red-500'}`}>${dotTicker.price}</span>
        </div>
        <div className="flex flex-col w-[100px]">
          <span className={dotTicker.isUp ? 'text-green-500' : 'text-red-500'}>
            {dotTicker.isUp ? '+' : ''}{dotTicker.chgAmt} ({dotTicker.chgPct})
          </span>
        </div>
        <div className="flex gap-8">
          <div className="flex flex-col"><span className="text-[#848e9c]">BID</span><span className="text-green-500">${dotTicker.bid}</span></div>
          <div className="flex flex-col"><span className="text-[#848e9c]">ASK</span><span className="text-red-500">${dotTicker.ask}</span></div>
          <div className="flex flex-col"><span className="text-[#848e9c]">24H HIGH</span><span className="text-white">${dotTicker.high}</span></div>
          <div className="flex flex-col"><span className="text-[#848e9c]">24H LOW</span><span className="text-white">${dotTicker.low}</span></div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full border-none">
          
          <ResizablePanel defaultSize={15} minSize={12} className="bg-[#0b0e11] border-r border-[#1e2329]">
            <div className="flex flex-col h-full">
              <div className="flex border-b border-[#1e2329] bg-[#12161a]">
                <div className="px-4 py-2 text-[#f59e0b] border-b-2 border-[#f59e0b] font-bold bg-[#1e2329]/30">☆ WATCH</div>
              </div>
              <div className="flex justify-between px-4 py-2 text-[#848e9c] border-b border-[#1e2329] text-[10px]">
                <span>SYMBOL</span><span>PRICE / 24H</span>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                {watchlist.map((item, i) => (
                  <div key={i} onClick={() => alert(`Fungsi ubah chart ke ${item.sym} akan segera hadir!`)} className={`flex justify-between items-center px-4 py-2 border-b border-[#1e2329]/30 hover:bg-[#1e2329] cursor-pointer transition-colors ${item.sym === 'DOT' ? 'bg-[#1e2329] border-l-2 border-[#f59e0b]' : ''}`}>
                    <div className="flex flex-col">
                      <span className="text-white font-bold">{item.sym}</span>
                      <span className="text-[#848e9c] text-[9px]">{item.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-white font-medium">{item.price}</span>
                      <span className={`text-[10px] ${item.isUp ? 'text-green-500' : 'text-red-500'}`}>{item.chg}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle className="bg-[#1e2329] w-1" />
          
          <ResizablePanel defaultSize={60}>
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize={isPositionsCollapsed ? 95 : 65} className="bg-[#0b0e11] transition-all duration-300">
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-4 px-2 py-1 border-b border-[#1e2329] z-10 shrink-0 bg-[#12161a]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#848e9c] mr-2 text-[10px]">TIMEFRAME:</span>
                      {['1m','5m','15m','1h','4h','1d'].map(tf => (
                        <span key={tf} onClick={() => setChartTimeframe(tf)} className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${tf === chartTimeframe ? 'bg-[#f59e0b] text-black font-bold' : 'hover:bg-[#1e2329] text-[#848e9c]'}`}>
                          {tf}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 relative bg-[#12161a]">
                    <TradingChart symbol="DOTUSDT" timeframe={chartTimeframe} />
                  </div>
                </div>
              </ResizablePanel>
              
              <ResizableHandle className="bg-[#1e2329] h-1" />
              
              <ResizablePanel defaultSize={isPositionsCollapsed ? 5 : 35} minSize={5} className="bg-[#0b0e11] flex flex-col transition-all duration-300">
                <div className="flex items-center justify-between border-b border-[#1e2329] bg-[#12161a] px-2 shrink-0">
                  <div className="flex overflow-x-auto">
                    <div className="px-3 py-1.5 text-[#f59e0b] border-b-2 border-[#f59e0b] font-bold flex gap-2 items-center bg-[#1e2329]/30">
                      POSITIONS <span className="bg-[#f59e0b] text-black px-1 rounded text-[9px]">{positions.length}</span>
                    </div>
                    <div className="px-3 py-1.5 hover:text-white cursor-pointer flex gap-2 items-center">ORDERS</div>
                  </div>
                  <div onClick={() => setIsPositionsCollapsed(!isPositionsCollapsed)} className="text-[10px] text-[#848e9c] hover:text-white cursor-pointer px-2 flex items-center gap-1 font-bold">
                    {isPositionsCollapsed ? '^ EXPAND' : 'v COLLAPSE'}
                  </div>
                </div>
                
                {!isPositionsCollapsed && (
                  <div className="flex-1 overflow-auto no-scrollbar pb-10">
                    <table className="w-full text-right border-collapse">
                      <thead className="text-[#848e9c] sticky top-0 bg-[#0b0e11] text-[10px]">
                        <tr>
                          <th className="text-left py-2 px-4 border-b border-[#1e2329] font-normal uppercase">Symbol</th>
                          <th className="text-left py-2 px-4 border-b border-[#1e2329] font-normal uppercase">Side</th>
                          <th className="py-2 px-4 border-b border-[#1e2329] font-normal uppercase">Size</th>
                          <th className="py-2 px-4 border-b border-[#1e2329] font-normal uppercase">PNL</th>
                          <th className="py-2 px-4 border-b border-[#1e2329] font-normal uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((p, i) => (
                          <tr key={i} className="hover:bg-[#1e2329]/50 border-b border-[#1e2329]/50 transition-colors">
                            <td className="text-left py-2 px-4 text-white font-bold">{p.sym}</td>
                            <td className={`text-left py-2 px-4 font-bold ${p.side === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>{p.side}</td>
                            <td className="py-2 px-4 text-white">{p.size}</td>
                            <td className="py-2 px-4">
                              <div className={`flex flex-col ${p.pnl.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                <span className="font-bold">{p.pnl}</span>
                                <span className="text-[9px]">({p.pnlPct})</span>
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              <button onClick={() => alert(`Mengeksekusi penutupan posisi untuk ${p.sym}`)} className="bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition-all text-[10px] font-bold">CLOSE</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ResizablePanel>

            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="bg-[#1e2329] w-1" />
          
          <ResizablePanel defaultSize={25} className="bg-[#0b0e11] border-l border-[#1e2329] flex flex-col">
            
            <div className="p-4 border-b border-[#1e2329] h-[230px] shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-white font-bold tracking-wider">ORDER ENTRY</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-white">Total</span>
                <span className="text-[#f59e0b] text-lg font-bold">$0.00</span>
              </div>
              <button onClick={() => alert("Membuka menu opsi lanjutan...")} className="w-full bg-[#1e2329]/50 text-[#848e9c] py-1.5 rounded mt-2 hover:bg-[#1e2329] hover:text-white border border-[#1e2329] text-[10px] transition-colors">
                v Show Advanced Options
              </button>
              <button onClick={() => alert("Order Paper Trade DOT berhasil dikirim!")} className="w-full bg-green-500/10 text-green-500 py-2.5 rounded mt-3 border border-green-500/30 font-bold hover:bg-green-500 hover:text-white transition-colors">
                ~ BUY DOT
              </button>
              <div className="flex justify-between items-center text-[10px] mt-4">
                <span className="text-[#848e9c]">Available Balance</span>
                <span className="text-blue-400 font-bold">$87.24K</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0e11]">
              <div className="flex border-b border-[#1e2329] bg-[#12161a] px-2 shrink-0">
                <div onClick={() => setActiveTab('orderbook')} className={`px-4 py-2 cursor-pointer ${activeTab === 'orderbook' ? 'text-[#f59e0b] border-b-2 border-[#f59e0b] font-bold bg-[#1e2329]/30' : 'text-[#848e9c] hover:text-white'}`}>ORDER BOOK</div>
                <div onClick={() => setActiveTab('news')} className={`px-4 py-2 cursor-pointer flex gap-2 items-center ${activeTab === 'news' ? 'text-[#f59e0b] border-b-2 border-[#f59e0b] font-bold bg-[#1e2329]/30' : 'text-[#848e9c] hover:text-white'}`}>
                  <Newspaper size={12} className={activeTab === 'news' ? 'text-[#f59e0b]' : ''} /> NEWS
                </div>
                <div onClick={() => setActiveTab('aichat')} className={`px-4 py-2 cursor-pointer flex gap-2 items-center ${activeTab === 'aichat' ? 'text-[#f59e0b] border-b-2 border-[#f59e0b] font-bold bg-[#1e2329]/30' : 'text-[#848e9c] hover:text-white'}`}>
                  AI CHAT
                </div>
              </div>

              {activeTab === 'orderbook' && (
                <div className="flex-1 flex flex-col text-[10px] font-mono">
                  <div className="flex justify-between px-3 py-1.5 text-[#848e9c] border-b border-[#1e2329] bg-[#0b0e11] shrink-0 sticky top-0">
                    <span className="w-1/3 text-left">PRICE</span>
                    <span className="w-1/3 text-right">SIZE</span>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                    <div className="flex flex-col justify-end min-h-[50%]">
                      {orderBook.asks.map((ask: any, i) => (
                        <div key={'a'+i} className="flex justify-between px-3 py-[2px] hover:bg-[#1e2329]/50 relative group cursor-pointer">
                          <span className="w-1/3 text-left text-red-500 font-medium">{parseFloat(ask[0]).toFixed(3)}</span>
                          <span className="w-1/3 text-right text-white">{parseFloat(ask[1]).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="py-1.5 px-3 flex items-center justify-between border-y border-[#1e2329] bg-[#12161a] my-0.5">
                      <span className="text-[#f59e0b] font-bold text-base">${dotTicker.price}</span>
                      <span className="text-[#848e9c]">Spread: {spread}</span>
                    </div>
                    <div className="min-h-[50%]">
                      {orderBook.bids.map((bid: any, i) => (
                        <div key={'b'+i} className="flex justify-between px-3 py-[2px] hover:bg-[#1e2329]/50 relative group cursor-pointer">
                          <span className="w-1/3 text-left text-green-500 font-medium">{parseFloat(bid[0]).toFixed(3)}</span>
                          <span className="w-1/3 text-right text-white">{parseFloat(bid[1]).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'news' && (
                <div className="flex-1 overflow-y-auto no-scrollbar pb-10 flex flex-col">
                  {newsList.map((news, idx) => (
                    <a key={idx} href={news.url} target="_blank" rel="noreferrer" className="flex flex-col border-b border-[#1e2329]/50 p-3 hover:bg-[#1e2329]/50 transition-colors cursor-pointer group">
                      <div className="flex justify-between text-[10px] text-[#848e9c] mb-1.5">
                        <span className="text-blue-400 group-hover:underline">{news.source_info?.name}</span>
                        <span>{formatTime(news.published_on)}</span>
                      </div>
                      <div className="text-white text-xs font-medium leading-relaxed line-clamp-3 group-hover:text-blue-300 transition-colors">
                        {news.title}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {activeTab === 'aichat' && (
                <div className="flex-1 p-3 flex flex-col bg-[#0b0e11] overflow-hidden">
                   <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-4 flex flex-col">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-2 rounded text-[11px] leading-relaxed max-w-[90%] ${msg.role === 'user' ? 'bg-[#1e2329] text-white border border-[#3b4351]' : 'bg-transparent text-[#848e9c] border-l-2 border-[#1e2329] pl-3'}`}>
                            {msg.role === 'system' || msg.role === 'ai' ? (
                              <div className="flex items-start gap-2">
                                 {msg.role === 'system' && i===0 && <Activity size={12} className="mt-0.5 text-purple-400 shrink-0"/>}
                                 {msg.role === 'ai' && <Zap size={12} className="mt-0.5 text-[#f59e0b] shrink-0"/>}
                                 <div className="whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                                   <ReactMarkdown>{msg.content}</ReactMarkdown>
                                 </div>
                              </div>
                            ) : (
                              <span>{msg.content}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {isAiTyping && (
                        <div className="text-[#848e9c] text-[10px] italic pl-3 border-l-2 border-[#1e2329] animate-pulse">
                          Quant Agent is analyzing...
                        </div>
                      )}
                   </div>

                   <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar shrink-0 pb-1">
                      {aiSuggestions.map((suggestion, idx) => (
                         <button 
                            key={idx}
                            onClick={() => handleSendChat(suggestion)}
                            disabled={isAiTyping}
                            className="text-[10px] whitespace-nowrap bg-[#1e2329]/50 border border-[#3b4351] px-2.5 py-1.5 rounded-full text-[#848e9c] hover:bg-[#f59e0b]/20 hover:text-[#f59e0b] hover:border-[#f59e0b]/50 transition-all disabled:opacity-50"
                         >
                            {suggestion}
                         </button>
                      ))}
                   </div>

                   <div className="bg-[#1e2329]/80 border border-[#3b4351] p-2 rounded flex items-center shrink-0 focus-within:border-[#f59e0b] transition-colors relative">
                     <input 
                       type="text" 
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatInput)}
                       placeholder="Type prompt and press Enter..." 
                       disabled={isAiTyping}
                       className="bg-transparent outline-none w-full text-white placeholder-[#5e6673] disabled:opacity-50 pr-8"
                     />
                     <button 
                        onClick={() => handleSendChat(chatInput)}
                        disabled={!chatInput.trim() || isAiTyping}
                        className="absolute right-2 text-[#848e9c] hover:text-[#f59e0b] disabled:opacity-30"
                     >
                        <Send size={14} />
                     </button>
                   </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}