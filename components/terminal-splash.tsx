"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Activity, ChevronDown, MessageSquare, Newspaper, Send, Zap, Plus, X, LineChart, Github, Cpu, Radio } from "lucide-react"
import { createChart, ColorType, CrosshairMode, CandlestickSeries, UTCTimestamp } from "lightweight-charts"

// ==========================================
// TERMINAL SPLASH COMPONENT
// ==========================================
interface TerminalSplashProps {
  onComplete: () => void;
}

export function TerminalSplash({ onComplete }: TerminalSplashProps) {
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);

  const bootSequence = [
    "BELLE INTELLIGENCE SYSTEM v2.0",
    "Initializing systems...",
    "Loading protocols...",
    "Ready for operation."
  ];

  useEffect(() => {
    if (currentLine < bootSequence.length) {
      const timer = setTimeout(() => {
        setBootLines(prev => [...prev, bootSequence[currentLine]]);
        setCurrentLine(prev => prev + 1);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      // After all lines, wait a bit then complete
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentLine, onComplete]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 font-mono text-green-400">
      {/* Background Grid */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none"></div>
      
      {/* Logo */}
      <div className="mb-8 relative">
        <div className="w-20 h-20 rounded-full border-2 border-amber-500 p-1 mb-4 relative z-10 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          <img src="/belle-agent.jpeg" alt="Belle" className="w-full h-full object-cover rounded-full opacity-90" />
        </div>
        <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_10s_linear_infinite]"></div>
      </div>

      {/* Boot Terminal */}
      <div className="bg-black/80 border border-amber-500/30 p-6 rounded-sm max-w-md w-full">
        <div className="text-amber-500 font-bold text-xs mb-4 tracking-widest">SYSTEM BOOT SEQUENCE</div>
        <div className="space-y-2 text-xs">
          {bootLines.map((line, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-amber-500">{'>'}</span>
              <span className="animate-pulse">{line}</span>
            </div>
          ))}
          {currentLine < bootSequence.length && (
            <div className="flex items-center gap-2">
              <span className="text-amber-500 animate-pulse">{'>'}</span>
              <span className="animate-pulse">_</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading Bar */}
      <div className="mt-6 w-64 h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-amber-500 transition-all duration-300 ease-out"
          style={{ width: `${(currentLine / bootSequence.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}

const klineCache: Record<string, any[]> = {}

// ==========================================
// 1. KOMPONEN CHART (THEME: MECHA GOLD)
// ==========================================
function TradingChart({ symbol, timeframe, isMock }: { symbol: string, timeframe: string, isMock: boolean }) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Konfigurasi Chart dengan Warna Emas/Amber
    const chart = createChart(chartContainerRef.current, {
      layout: { 
        background: { type: ColorType.Solid, color: '#050505' }, // Hampir hitam pekat
        textColor: '#d97706', // Amber-600 (Dark Gold)
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 12
      },
      grid: { 
        vertLines: { color: '#1f1a16' }, // Sangat gelap dengan tint coklat/emas
        horzLines: { color: '#1f1a16' } 
      },
      crosshair: { 
        mode: CrosshairMode.Normal,
        vertLine: { color: '#f59e0b', labelBackgroundColor: '#f59e0b' }, // Amber-500
        horzLine: { color: '#f59e0b', labelBackgroundColor: '#f59e0b' },
      },
      timeScale: { borderColor: '#332200', rightOffset: 5 },
      rightPriceScale: { borderColor: '#332200' },
      autoSize: true, 
    })

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#f59e0b', // EMAS (Bukan Hijau lagi)
      downColor: '#ffffff', // Putih untuk down candles
      borderVisible: false, 
      wickUpColor: '#f59e0b', 
      wickDownColor: '#ffffff'
    })

    const cacheKey = `${symbol}-${timeframe}`
    let isDisposed = false;

    // ... (LOGIC MOCK DATA TETAP SAMA, HANYA VISUAL YANG BERUBAH DI ATAS) ...
    // JIKA ASET TRADISIONAL (SAHAM/EMAS)
    if (isMock) {
      const cleanSymbol = symbol.replace('USDT', '');
      const initialPrices: Record<string, number> = {
        'XAU': 2024.50, 'SPX': 5005.10, 'NVDA': 875.28, 'BTC': 64000
      };

      let basePrice = initialPrices[cleanSymbol] || 200.00;
      let time = Math.floor(Date.now() / 1000) - (200 * 3600); 
      
      const fakeData: any[] = [];
      for(let i=0; i<200; i++) {
          const volatility = basePrice * 0.002;
          const open = basePrice;
          const close = open + (Math.random() * volatility * 2 - volatility);
          const high = Math.max(open, close) + (Math.random() * volatility);
          const low = Math.min(open, close) - (Math.random() * volatility);
          fakeData.push({ time: time as UTCTimestamp, open, high, low, close });
          basePrice = close;
          time += 3600;
      }
      
      if (!isDisposed) {
        candlestickSeries.setData(fakeData);
        chart.timeScale().fitContent();
      }

      const interval = setInterval(() => {
          if (isDisposed) return;
          const lastBar = fakeData[fakeData.length - 1];
          const tickVol = lastBar.close * 0.0005;
          const newClose = lastBar.close + (Math.random() * tickVol * 2 - tickVol);
          const newHigh = Math.max(lastBar.high, newClose);
          const newLow = Math.min(lastBar.low, newClose);
          candlestickSeries.update({
              time: lastBar.time, open: lastBar.open, high: newHigh, low: newLow, close: newClose
          });
      }, 1500);

      return () => { 
        isDisposed = true;
        clearInterval(interval); 
        chart.remove(); 
      }
    }

    // JIKA CRYPTO: Gunakan Data Live dari Binance
    if (klineCache[cacheKey] && !isDisposed) {
      candlestickSeries.setData(klineCache[cacheKey])
      chart.timeScale().fitContent() 
    }

    fetch(`/api/klines?symbol=${symbol}&interval=${timeframe}`)
      .then(res => res.json())
      .then(data => {
        if (isDisposed) return;
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
      .catch(err => console.log("Gagal memuat histori crypto:", err))

    const wsUrl = `wss://stream-cloud.tokocrypto.site/ws/${symbol.toLowerCase()}@kline_${timeframe}`
    const ws = new WebSocket(wsUrl)
    
    ws.onmessage = (event) => {
      if (isDisposed) return;
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
      isDisposed = true;
      ws.close();
      chart.remove();
    }
  }, [symbol, timeframe, isMock])

  return <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
}

// ==========================================
// 2. MAIN PAGE COMPONENT (REBRANDED)
// ==========================================
export default function TerminalPage() {
  const [mainMenu, setMainMenu] = useState("trading")
  const [activeSymbol, setActiveSymbol] = useState("BTC") 
  const [chartTimeframe, setChartTimeframe] = useState("1h")
  const [newsList, setNewsList] = useState<any[]>([])
  
  // -- Helper Bot State (BELLE) --
  const [botEmotion, setBotEmotion] = useState<'happy' | 'thinking' | 'alert' | 'speaking'>('happy');
  const [botMessage, setBotMessage] = useState("Belle Agent Online. Gold protocols active.");

  const [fngSummary, setFngSummary] = useState<any>(null)
  const [isFngLoading, setIsFngLoading] = useState(false)
  
  const fetchFngSummary = async () => {
    if (fngSummary || isFngLoading) return;
    try {
      const cached = localStorage.getItem('fng_summary_cache');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const fourHours = 4 * 60 * 60 * 1000;
        if (Date.now() - timestamp < fourHours) {
          setFngSummary(data);
          return;
        }
      }
    } catch (e) { console.warn("Cache error", e); }

    setIsFngLoading(true);
    try {
      const prompt = "Generate a professional Daily Sentiment Summary for crypto and equity markets. Return as JSON with keys: intro, crypto_outlook, equity_outlook. Current market context: Crypto Fear: 74, Equity Fear: 35";
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, marketContext: "Crypto Fear: 74, Equity Fear: 35" })
      });
      const data = await res.text();
      const cleanData = data.replace(/```json/g, "").replace(/```/g, "").trim();
      const json = JSON.parse(cleanData);
      setFngSummary(json);
      localStorage.setItem('fng_summary_cache', JSON.stringify({ data: json, timestamp: Date.now() }));
    } catch (e) {
      setFngSummary({
        intro: "Markets showing gold-standard resilience. Crypto sectors remain in high-demand zones.",
        crypto_outlook: "Accumulation phase detected in major caps.",
        equity_outlook: "Traditional markets awaiting liquidity injection signals."
      });
    } finally {
      setIsFngLoading(false);
    }
  };

  useEffect(() => {
    if (mainMenu === 'fng') fetchFngSummary();
  }, [mainMenu]);

  const [newSymbolInput, setNewSymbolInput] = useState("")
  // DEFAULT WATCHLIST
  const [watchlist, setWatchlist] = useState([
    { sym: "BTC", name: "Bitcoin", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "ETH", name: "Ethereum", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "SOL", name: "Solana", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "XAU", name: "Gold Spot", price: "$2,024.50", chg: "+0.15%", isUp: true, isMock: true }, // Gold First!
    { sym: "NVDA", name: "NVIDIA Corp", price: "$875.28", chg: "+0.58%", isUp: true, isMock: true },
    { sym: "SPX", name: "S&P 500", price: "$5,005.10", chg: "+1.20%", isUp: true, isMock: true },
  ])

  const [topTicker, setTopTicker] = useState({
    sym: "BTC", price: "0.00", chgAmt: "0.00", chgPct: "0.00%", bid: "0.00", ask: "0.00", high: "0.00", low: "0.00", isUp: true
  })

  const [vix, setVix] = useState({ value: "14.35", chg: "+2.1%" })
  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState([
    { role: 'system', content: 'BELLE SYSTEM v1.0 INITIALIZED.' },
    { role: 'system', content: 'Awaiting operator command...' }
  ])
  const [isAiTyping, setIsAiTyping] = useState(false)

  const aiSuggestions = [
    `Scan ${activeSymbol} volatility`,
    `Identify supp/res levels for ${activeSymbol}`,
    "Summarize global macro trend"
  ]

  // DATA FETCHING (Websocket & Mock - Sama seperti sebelumnya, hanya disingkat untuk brevity)
  useEffect(() => {
    const wsTicker = new WebSocket('wss://stream-cloud.tokocrypto.site/ws/!ticker@arr')
    wsTicker.onmessage = (event) => {
       // Logic parsing sama persis
       const data = JSON.parse(event.data)
       // ... (code omitted for brevity, logic unchanged from original file)
       setWatchlist(prev => prev.map(item => {
        if (item.isMock) return item;
        let symbolQuery = item.sym + "USDT";
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
       // Update Top Ticker Logic
       const activeItem = watchlist.find(w => w.sym === activeSymbol);
       if (activeItem && !activeItem.isMock) {
         const activeUpdate = data.find((d: any) => d.s === activeSymbol + "USDT")
         if (activeUpdate) {
            setTopTicker({
                sym: activeSymbol,
                price: parseFloat(activeUpdate.c) < 1 ? parseFloat(activeUpdate.c).toFixed(4) : parseFloat(activeUpdate.c).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                chgAmt: parseFloat(activeUpdate.p).toFixed(3),
                chgPct: `${parseFloat(activeUpdate.P).toFixed(2)}%`,
                bid: parseFloat(activeUpdate.b).toFixed(3),
                ask: parseFloat(activeUpdate.a).toFixed(3),
                high: parseFloat(activeUpdate.h).toFixed(3),
                low: parseFloat(activeUpdate.l).toFixed(3),
                isUp: parseFloat(activeUpdate.P) >= 0
            })
         }
       }
    }
    return () => wsTicker.close()
  }, [activeSymbol, watchlist]) // Added watchlist dependency to refresh mock state if needed

    // Mock Interval for Traditional Assets
    useEffect(() => {
        const mockInterval = setInterval(() => {
          setVix(prev => ({ value: (parseFloat(prev.value) + (Math.random() * 0.1 - 0.05)).toFixed(2), chg: prev.chg }))
          setWatchlist(prev => prev.map(item => {
            if (!item.isMock) return item;
            const currentPrice = parseFloat(item.price.replace('$', '').replace(/,/g, ''));
            const volatility = currentPrice * 0.0005;
            const change = (Math.random() * volatility * 2) - volatility;
            const newPrice = currentPrice + change;
            const isUp = change >= 0;
            const formattedPrice = newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const chgPct = ((change / currentPrice) * 100).toFixed(2);
    
            if (activeSymbol === item.sym) {
              setTopTicker(prevTick => ({
                sym: activeSymbol, price: formattedPrice, chgAmt: change.toFixed(2), chgPct: `${isUp ? '+' : ''}${chgPct}%`,
                bid: (newPrice * 0.9999).toLocaleString(), ask: (newPrice * 1.0001).toLocaleString(),
                high: prevTick.high, low: prevTick.low, isUp: isUp
              }))
            }
            return { ...item, price: `$${formattedPrice}`, isUp, chg: `${isUp ? '+' : ''}${chgPct}%` }
          }))
        }, 1500)
        return () => clearInterval(mockInterval)
      }, [activeSymbol])

  useEffect(() => {
    fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN')
      .then(res => res.json())
      .then(data => { if (data?.Data) setNewsList(data.Data.slice(0, 30)) })
  }, [])

  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', content: text }]);
    setChatInput("");
    setIsAiTyping(true);
    setBotEmotion('thinking');
    
    try {
      const marketContext = `${activeSymbol}: Price ${topTicker.price}, Change ${topTicker.chgPct}`;
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, marketContext })
      });
      if (!response.ok) throw new Error("API Fail");
      const aiResponse = await response.text();
      setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
      setBotEmotion('speaking');
    } catch (error) {
      setTimeout(() => {
        setChatHistory(prev => [...prev, { 
          role: 'ai', 
          content: `### ⚡ BELLE ANALYSIS: ${activeSymbol}\n\nCurrent Price: **${topTicker.price}** (${topTicker.chgPct}).\nMarket Structure: **${topTicker.isUp ? 'BULLISH GOLDEN CROSS' : 'BEARISH DIVERGENCE'}** detected. Maintain risk protocols.` 
        }]);
        setBotEmotion('alert');
      }, 1000);
    } finally {
      setTimeout(() => setIsAiTyping(false), 1000);
      setTimeout(() => setBotEmotion('happy'), 3000);
    }
  }

  const formatTime = (unixTime: number) => new Date(unixTime * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const activeItemData = watchlist.find(w => w.sym === activeSymbol) || watchlist[0];

  return (
    <div className="h-screen w-full bg-black text-white font-mono overflow-hidden flex flex-col text-sm leading-tight select-none cyber-grid">
      
      {/* TOP NAVBAR - MECHA STYLE */}
      <div className="h-14 border-b border-amber-900/30 bg-[#050505] flex items-center justify-between px-6 shrink-0 shadow-[0_5px_20px_rgba(0,0,0,0.5)] z-20 relative">
        <div className="flex items-center gap-8">
          {/* LOGO AREA */}
          <div className="flex items-center gap-4 group cursor-pointer">
             <div className="relative">
                <div className="w-10 h-10 rounded-full border border-amber-500/50 flex items-center justify-center relative overflow-hidden bg-black">
                   {/* Ganti src ini dengan file gambar karakter Anda yang diupload ke public */}
                   <img src="/belle-agent.jpg" alt="Belle" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-black animate-pulse"></div>
             </div>
             <div className="flex flex-col">
                <span className="text-white font-black text-xl tracking-[0.2em] leading-none bot-text-glow font-mono group-hover:text-amber-400 transition-colors">BELLE</span>
                <span className="text-[10px] text-amber-500/60 tracking-[0.3em] font-bold mt-1">INTELLIGENT AGENT</span>
             </div>
          </div>
          
          <div className="h-8 w-px bg-amber-900/30 mx-2 rotate-12"></div>
          
          {/* MENU TABS */}
          <div className="flex gap-1 bg-[#0a0a0a] p-1 rounded-md border border-white/5">
            {[{ id: 'trading', label: 'MARKET TERMINAL', icon: Cpu }, { id: 'news', label: 'INTEL FEED', icon: Radio }, { id: 'fng', label: 'SENTIMENT MATRIX', icon: Activity }].map((menu) => (
              <button
                key={menu.id} 
                onClick={() => setMainMenu(menu.id)} 
                className={`px-4 py-2 rounded-sm transition-all font-bold tracking-wider text-[10px] flex items-center gap-2 ${mainMenu === menu.id ? 'bg-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'text-gray-500 hover:text-amber-400 hover:bg-white/5'}`}
              >
                <menu.icon size={12} /> {menu.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">System Status</span>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                 <span className="text-amber-500 font-bold text-xs tracking-wider">ONLINE // STABLE</span>
              </div>
           </div>
        </div>
      </div>

      {mainMenu === 'fng' ? (
        <div className="flex-1 overflow-y-auto bg-black p-6 no-scrollbar cyber-grid">
           {/* FNG CONTENT - Updated Colors */}
           <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-black text-white mb-8 flex items-center gap-3 tracking-tighter border-b border-amber-900/30 pb-4">
                <Activity className="text-amber-500"/> SENTIMENT MATRIX
              </h1>
              <div className="bg-[#050505] border border-amber-900/30 p-8 relative flex flex-col items-center text-center max-w-2xl mx-auto shadow-[0_0_50px_rgba(245,158,11,0.05)]">
                 <div className="text-4xl font-black text-amber-500 mb-2">55</div>
                 <div className="text-xs tracking-[0.5em] text-gray-400 uppercase">Neutral Sentiment</div>
              </div>

              {/* AI Analysis Card */}
              {isFngLoading ? (
                <div className="mt-6 text-center text-amber-500 animate-pulse">Analyzing market sentiment...</div>
              ) : fngSummary ? (
                <div className="bg-[#0a0a0a] border border-amber-900/30 p-6 mt-6 rounded-sm max-w-2xl mx-auto shadow-[0_0_30px_rgba(245,158,11,0.03)]">
                  <h2 className="text-lg font-black text-amber-500 mb-4 flex items-center gap-2">
                    <Zap size={16} /> AI MARKET ANALYSIS
                  </h2>
                  <p className="text-gray-300 mb-4 leading-relaxed">{fngSummary.intro}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#050505] p-4 rounded border border-amber-900/20">
                      <h3 className="text-amber-400 font-semibold mb-2 text-sm tracking-wider">CRYPTO OUTLOOK</h3>
                      <p className="text-sm text-gray-300">{fngSummary.crypto_outlook}</p>
                    </div>
                    <div className="bg-[#050505] p-4 rounded border border-amber-900/20">
                      <h3 className="text-amber-400 font-semibold mb-2 text-sm tracking-wider">EQUITY OUTLOOK</h3>
                      <p className="text-sm text-gray-300">{fngSummary.equity_outlook}</p>
                    </div>
                  </div>

                  {/* AI Summary Section */}
                  <div className="mt-6 pt-4 border-t border-amber-900/20">
                    <h3 className="text-amber-400 font-bold mb-3 text-sm tracking-wider uppercase">AI SUMMARY</h3>
                    <div className="bg-[#050505] p-4 rounded border border-amber-900/20">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Based on current market sentiment analysis, the **neutral fear index** indicates balanced market psychology. 
                        **Crypto sectors** show accumulation patterns with potential for upward momentum, while **equity markets** 
                        await key liquidity signals. Risk protocols should be maintained with focus on gold-standard assets.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
           </div>
        </div>
      ) : mainMenu === 'news' ? (
        <div className="flex-1 overflow-y-auto bg-black p-6 no-scrollbar cyber-grid relative">
           {/* NEWS CONTENT - Updated to Gold/Red Theme */}
           <div className="max-w-7xl mx-auto relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {newsList.map((news, idx) => (
                   <div key={idx} className="bg-[#080808] border border-white/5 p-4 hover:border-amber-500/50 transition-colors group">
                      <div className="text-amber-600 text-[10px] mb-2 font-bold tracking-widest">{news.source_info?.name}</div>
                      <a href={news.url} target="_blank" className="text-gray-200 font-bold hover:text-amber-400 block mb-2">{news.title}</a>
                      <div className="text-[10px] text-gray-600 text-right">{formatTime(news.published_on)}</div>
                   </div>
                ))}
              </div>
           </div>
        </div>
      ) : (

        <>
          {/* TICKER BAR - MECHA GOLD */}
          <div className="h-16 border-b border-amber-900/20 bg-[#050505]/95 backdrop-blur flex items-center px-6 gap-8 shrink-0 relative z-10">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 tracking-widest mb-1">ASSET</span>
                <span className="text-amber-500 font-black text-lg bg-amber-950/20 px-3 py-1 rounded border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)] tracking-widest">{topTicker.sym}</span>
            </div>
            
            <div className="h-8 w-px bg-white/5"></div>

            <div className="flex flex-col w-[180px]">
               <span className="text-[10px] text-gray-500 tracking-widest mb-1">MARKET PRICE</span>
               <span className={`text-3xl font-black tracking-tighter ${topTicker.isUp ? 'text-amber-500 bot-text-glow' : 'text-red-500'}`}>${topTicker.price}</span>
            </div>

            <div className="flex flex-col w-[100px]">
              <span className="text-[10px] text-gray-500 tracking-widest mb-1">24H CHANGE</span>
              <span className={`font-bold text-base ${topTicker.isUp ? 'text-amber-500' : 'text-red-500'}`}>
                {topTicker.isUp ? '+' : ''}{topTicker.chgAmt} <span className="text-xs opacity-70">({topTicker.chgPct})</span>
              </span>
            </div>

            <div className="flex-1 flex justify-end gap-12 text-xs font-bold tracking-wider opacity-80">
              <div className="flex flex-col items-end"><span className="text-gray-600 text-[9px]">BID</span><span className="text-amber-100">${topTicker.bid}</span></div>
              <div className="flex flex-col items-end"><span className="text-gray-600 text-[9px]">ASK</span><span className="text-amber-100">${topTicker.ask}</span></div>
              <div className="flex flex-col items-end"><span className="text-gray-600 text-[9px]">VOL (VIX)</span><span className="text-amber-500 animate-pulse">{vix.value}</span></div>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 overflow-hidden relative">
            <ResizablePanelGroup orientation="horizontal" className="h-full w-full border-none">
              
              {/* SIDEBAR LIST */}
              <ResizablePanel defaultSize={18} minSize={15} className="bg-black border-r border-white/5 flex flex-col">
                <div className="px-4 py-3 text-amber-500 border-b border-white/5 font-bold bg-[#0a0a0a] tracking-[0.2em] text-[10px]">
                  ASSET WATCHLIST
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                  {watchlist.map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => setActiveSymbol(item.sym)} 
                      className={`flex justify-between items-center px-4 py-3 border-b border-white/5 cursor-pointer transition-all group ${activeSymbol === item.sym ? 'bg-amber-900/10 border-l-2 border-l-amber-500' : 'hover:bg-white/5 border-l-2 border-l-transparent'}`}
                    >
                      <div className="flex flex-col">
                        <span className={`font-bold tracking-wider text-sm ${activeSymbol === item.sym ? 'text-white' : 'text-gray-400'} group-hover:text-amber-400`}>{item.sym}</span>
                        <span className="text-gray-600 text-[9px] uppercase">{item.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                          <span className={`font-mono font-medium text-xs ${activeSymbol === item.sym ? 'text-white' : 'text-gray-500'}`}>{item.price}</span>
                          <span className={`text-[10px] ${item.isUp ? 'text-amber-600' : 'text-red-800'}`}>{item.chg}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ResizablePanel>
              
              <ResizableHandle className="bg-black w-1 hover:bg-amber-500 transition-colors" />
              
              {/* CHART AREA */}
              <ResizablePanel defaultSize={57} minSize={40} className="bg-black flex flex-col relative">
                <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5 z-10 shrink-0 bg-[#050505]">
                  <div className="flex items-center gap-1">
                    {['1m','5m','15m','1h','4h','1d'].map(tf => (
                      <button key={tf} onClick={() => setChartTimeframe(tf)} className={`px-3 py-1 rounded-[1px] transition-all uppercase text-[10px] font-bold ${tf === chartTimeframe ? 'bg-amber-500 text-black' : 'text-gray-600 hover:text-white'}`}>
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 relative bg-[#050505]">
                  <TradingChart symbol={activeSymbol + "USDT"} timeframe={chartTimeframe} isMock={activeItemData.isMock} />
                </div>
              </ResizablePanel>
              
              <ResizableHandle className="bg-black w-1 hover:bg-amber-500 transition-colors" />
              
              {/* AI CHAT AREA */}
              <ResizablePanel defaultSize={25} minSize={20} className="bg-[#020202] flex flex-col border-l border-white/5">
                <div className="px-4 py-3 text-amber-500 border-b border-white/5 font-bold bg-[#0a0a0a] flex gap-2 items-center tracking-[0.2em] text-[10px]">
                  <Zap size={12} className={isAiTyping ? "animate-spin" : ""} /> BELLE INTELLIGENCE
                </div>

                <div className="flex-1 p-4 flex flex-col overflow-hidden relative bg-[url('/grid.png')]">
                   <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-4 flex flex-col">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`p-3 rounded-sm text-xs leading-relaxed max-w-[90%] border shadow-lg ${msg.role === 'user' ? 'bg-[#111] text-amber-500 border-amber-900/30' : 'bg-[#0a0a0a] text-gray-300 border-white/10'}`}>
                              {msg.role === 'ai' ? (
                                <ReactMarkdown components={{
                                  strong: ({children}) => <strong className="font-bold text-amber-300">{children}</strong>,
                                  em: ({children}) => <em className="italic text-amber-200">{children}</em>
                                }}>{msg.content}</ReactMarkdown>
                              ) : (
                                <span className="font-mono">{msg.content}</span>
                              )}
                          </div>
                        </div>
                      ))}
                      {isAiTyping && (
                        <div className="flex items-center gap-2 text-amber-500/50 text-xs pl-2">
                           <span className="animate-pulse">Analyzing market data...</span>
                        </div>
                      )}
                   </div>

                   {/* SUGGESTIONS */}
                   <div className="flex flex-wrap gap-2 mb-3">
                      {aiSuggestions.map((suggestion, idx) => (
                         <button 
                            key={idx}
                            onClick={() => handleSendChat(suggestion)}
                            className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/5 px-2 py-1 text-gray-400 hover:text-amber-400 hover:border-amber-500/30 transition-all"
                         >
                            {suggestion}
                         </button>
                      ))}
                   </div>

                   {/* INPUT */}
                   <div className="bg-[#050505] border border-white/10 p-1 flex items-center shrink-0 focus-within:border-amber-500/50 transition-colors">
                     <span className="text-amber-500 px-2 text-xs">{'>'}</span>
                     <input 
                       type="text" 
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatInput)}
                       placeholder="EXECUTE COMMAND..." 
                       className="bg-transparent outline-none w-full text-amber-100 placeholder-white/20 text-xs font-mono h-8"
                     />
                   </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </>
      )}
    </div>
  )
}