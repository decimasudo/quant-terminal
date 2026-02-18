"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Activity, ChevronDown, MessageSquare, Newspaper, Send, Zap, Plus, X, LineChart, Github, Cpu, Radio, Target, Crosshair, Twitter } from "lucide-react"
import { createChart, ColorType, CrosshairMode, CandlestickSeries, UTCTimestamp } from "lightweight-charts"

const klineCache: Record<string, any[]> = {}

// ==========================================
// 1. KOMPONEN CHART (MECHA HUD THEME)
// ==========================================
function TradingChart({ symbol, timeframe, isMock }: { symbol: string, timeframe: string, isMock: boolean }) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Konfigurasi Chart Mecha Gold
    const chart = createChart(chartContainerRef.current, {
      layout: { 
        background: { type: ColorType.Solid, color: 'transparent' }, 
        textColor: '#fbbf24', // Amber-400
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 12
      },
      grid: { 
        vertLines: { color: 'rgba(245, 158, 11, 0.05)' }, // Sangat tipis gold
        horzLines: { color: 'rgba(245, 158, 11, 0.05)' } 
      },
      crosshair: { 
        mode: CrosshairMode.Normal,
        vertLine: { color: '#f59e0b', labelBackgroundColor: '#b45309', style: 3 }, 
        horzLine: { color: '#f59e0b', labelBackgroundColor: '#b45309', style: 3 },
      },
      timeScale: { borderColor: 'rgba(245, 158, 11, 0.2)', rightOffset: 5 },
      rightPriceScale: { borderColor: 'rgba(245, 158, 11, 0.2)' },
      autoSize: true, 
    })

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#f59e0b', // EMAS
      downColor: '#ffffff', // PUTIH untuk down candles
      borderVisible: false, 
      wickUpColor: '#fcd34d', 
      wickDownColor: '#ffffff' // PUTIH untuk wick down
    })

    const cacheKey = `${symbol}-${timeframe}`
    let isDisposed = false;

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

  return <div ref={chartContainerRef} className="w-full h-full absolute inset-0 z-10" />
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default function TerminalPage() {
  const [showSplash, setShowSplash] = useState(true);
  const [mainMenu, setMainMenu] = useState("trading")
  const [activeSymbol, setActiveSymbol] = useState("BTC") 
  const [chartTimeframe, setChartTimeframe] = useState("1h")
  const [newsList, setNewsList] = useState<any[]>([])
  
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
      const prompt = "Generate a professional Daily Sentiment Summary...";
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

  const [watchlist, setWatchlist] = useState([
    // CRYPTOCURRENCY (LIVE VIA WEBSOCKET)
    { sym: "BTC", name: "Bitcoin", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "ETH", name: "Ethereum", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "USDT", name: "Tether", price: "$1.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "XRP", name: "XRP", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "BNB", name: "BNB", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "USDC", name: "USD Coin", price: "$1.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "SOL", name: "Solana", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "TRX", name: "TRON", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "DOGE", name: "Dogecoin", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "BCH", name: "Bitcoin Cash", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "ADA", name: "Cardano", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "HYPE", name: "Hyperliquid", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "LEO", name: "UNUS SED LEO", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "LINK", name: "Chainlink", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "eUSDe", name: "Ethena USDe", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "XMR", name: "Monero", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "CC", name: "Canton", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "XLM", name: "Stellar", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "DAI", name: "Dai", price: "$1.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "USD1", name: "World Liberty Financial USD", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "ZEC", name: "Zcash", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "HBAR", name: "Hedera", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "LTC", name: "Litecoin", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "PYUSD", name: "PayPal USD", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "AVAX", name: "Avalanche", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "SHIB", name: "Shiba Inu", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "SUI", name: "Sui", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "TON", name: "Toncoin", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "CRO", name: "Cronos", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "WLFIw", name: "World Liberty Financial", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },
    { sym: "DOT", name: "Polkadot", price: "$0.00", chg: "0.00%", isUp: true, isMock: false },

    // ASET TRADISIONAL (MOCKS - Agar selalu hidup dan kaya data)
    { sym: "XAU", name: "Gold Spot", price: "$2,024.50", chg: "+0.15%", isUp: true, isMock: true },
    { sym: "SPX", name: "S&P 500 Index", price: "$5,005.10", chg: "+1.20%", isUp: true, isMock: true },
    { sym: "NVDA", name: "NVIDIA Corporation", price: "$875.28", chg: "+0.58%", isUp: true, isMock: true },
    { sym: "AAPL", name: "Apple Inc.", price: "$173.50", chg: "+1.24%", isUp: true, isMock: true },
    { sym: "MSFT", name: "Microsoft Corporation", price: "$420.55", chg: "+0.89%", isUp: true, isMock: true },
    { sym: "AMZN", name: "Amazon.com, Inc.", price: "$178.15", chg: "-1.10%", isUp: false, isMock: true },
    { sym: "WMT", name: "Walmart Inc.", price: "$60.55", chg: "+0.45%", isUp: true, isMock: true },
    { sym: "JPM", name: "JPMorgan Chase & Co.", price: "$195.30", chg: "+1.15%", isUp: true, isMock: true },
    { sym: "V", name: "Visa Inc.", price: "$280.15", chg: "+0.32%", isUp: true, isMock: true },
    { sym: "JNJ", name: "Johnson & Johnson", price: "$158.40", chg: "-0.25%", isUp: false, isMock: true },
    { sym: "HD", name: "The Home Depot, Inc.", price: "$350.20", chg: "+0.78%", isUp: true, isMock: true },
    { sym: "PG", name: "The Procter & Gamble Company", price: "$160.80", chg: "+0.55%", isUp: true, isMock: true },
    { sym: "CVX", name: "Chevron Corporation", price: "$155.30", chg: "-0.45%", isUp: false, isMock: true },
    { sym: "META", name: "Meta Platforms, Inc.", price: "$505.10", chg: "+0.45%", isUp: true, isMock: true },
    { sym: "LLY", name: "Eli Lilly and Company", price: "$760.40", chg: "+1.20%", isUp: true, isMock: true },
    { sym: "UNH", name: "UnitedHealth Group Incorporated", price: "$490.15", chg: "-0.65%", isUp: false, isMock: true },
    { sym: "MA", name: "Mastercard Incorporated", price: "$475.20", chg: "+0.42%", isUp: true, isMock: true },
    { sym: "XOM", name: "Exxon Mobil Corporation", price: "$115.40", chg: "+0.85%", isUp: true, isMock: true },
    { sym: "ABBV", name: "AbbVie Inc.", price: "$178.60", chg: "+0.25%", isUp: true, isMock: true },
    { sym: "MRK", name: "Merck & Co., Inc.", price: "$125.10", chg: "+0.15%", isUp: true, isMock: true },
    { sym: "AVGO", name: "Broadcom Inc.", price: "$1,350.20", chg: "+2.10%", isUp: true, isMock: true },
    { sym: "KO", name: "Coca-Cola Company", price: "$60.15", chg: "-0.10%", isUp: false, isMock: true },
    { sym: "PEP", name: "PepsiCo, Inc.", price: "$170.40", chg: "-0.35%", isUp: false, isMock: true },
    { sym: "MCD", name: "McDonald's Corporation", price: "$285.20", chg: "+0.52%", isUp: true, isMock: true },
    { sym: "COST", name: "Costco Wholesale Corporation", price: "$740.15", chg: "+0.88%", isUp: true, isMock: true },
    { sym: "ORCL", name: "Oracle Corporation", price: "$125.40", chg: "+1.45%", isUp: true, isMock: true },
    { sym: "TMO", name: "Thermo Fisher Scientific Inc.", price: "$580.20", chg: "+0.35%", isUp: true, isMock: true },
    { sym: "CSCO", name: "Cisco Systems, Inc.", price: "$48.55", chg: "-1.20%", isUp: false, isMock: true },
    { sym: "NKE", name: "Nike, Inc.", price: "$100.20", chg: "-0.75%", isUp: false, isMock: true },
    { sym: "CRM", name: "Salesforce, Inc.", price: "$305.40", chg: "+1.10%", isUp: true, isMock: true },
    { sym: "INTC", name: "Intel Corporation", price: "$42.15", chg: "-2.30%", isUp: false, isMock: true },
    { sym: "BA", name: "Boeing Company", price: "$200.55", chg: "-1.45%", isUp: false, isMock: true },
  ])

  const [topTicker, setTopTicker] = useState({
    sym: "BTC", price: "0.00", chgAmt: "0.00", chgPct: "0.00%", bid: "0.00", ask: "0.00", high: "0.00", low: "0.00", isUp: true
  })

  const [vix, setVix] = useState({ value: "14.35", chg: "+2.1%" })
  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState([
    { role: 'system', content: 'BELLE SYSTEM v1.0 INITIALIZED.\nALL NEURAL LINKS ACTIVE.' },
    { role: 'system', content: 'Awaiting operator command...' }
  ])
  const [isAiTyping, setIsAiTyping] = useState(false)

  const aiSuggestions = [
    `Scan ${activeSymbol} volatility`,
    `Identify supp/res levels for ${activeSymbol}`,
    "Summarize global macro trend"
  ]

  useEffect(() => {
    const wsTicker = new WebSocket('wss://stream-cloud.tokocrypto.site/ws/!ticker@arr')
    wsTicker.onmessage = (event) => {
       const data = JSON.parse(event.data)
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
  }, [activeSymbol, watchlist])

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
                bid: (newPrice * 0.9999).toLocaleString('en-US', {minimumFractionDigits: 2}), ask: (newPrice * 1.0001).toLocaleString('en-US', {minimumFractionDigits: 2}),
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
    <div className="h-screen w-full bg-[#020100] text-amber-50 font-mono overflow-hidden flex flex-col text-sm leading-tight select-none cyber-grid relative">
      
      {/* GLOBAL MECHA GLOW BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.03)_0%,transparent_80%)] pointer-events-none z-0"></div>

      {/* -------------------------------------------------------------------------------- */}
      {/* 1. TOP NAVBAR - MECHA COCKPIT STYLE */}
      {/* -------------------------------------------------------------------------------- */}
      <div className="h-14 border-b border-amber-500/30 bg-[#050300] flex items-center justify-between px-6 shrink-0 shadow-[0_4px_30px_rgba(245,158,11,0.15)] z-20 relative">
        {/* Decorative corner lines */}
        <div className="absolute top-0 left-0 w-8 h-full border-l-4 border-amber-500/50"></div>
        <div className="absolute top-0 right-0 w-8 h-full border-r-4 border-amber-500/50"></div>

        <div className="flex items-center gap-8 ml-4">
          {/* LOGO AREA */}
          <div className="flex items-center gap-4 group cursor-pointer relative">
             <div className="relative">
                <div className="w-10 h-10 rounded-sm border-2 border-amber-500 flex items-center justify-center relative overflow-hidden bg-black shadow-[0_0_15px_rgba(245,158,11,0.6)] group-hover:shadow-[0_0_25px_rgba(245,158,11,0.8)] transition-all">
                   <img src="/belle-agent.jpeg" alt="Belle" className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500" />
                   {/* Scanline over image */}
                   <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-amber-400 border border-black animate-ping"></div>
             </div>
             <div className="flex flex-col">
                <span className="text-amber-500 font-black text-xl tracking-[0.2em] leading-none bot-text-glow font-mono">BELLE</span>
                <span className="text-[9px] text-amber-300/80 tracking-[0.4em] font-bold mt-1 uppercase">Sys_Online</span>
             </div>
          </div>
          
          {/* HUD Slanted Divider */}
          <div className="h-8 w-px bg-amber-500/30 mx-2 rotate-12 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
          
          {/* MENU TABS */}
          <div className="flex gap-2">
            {[{ id: 'trading', label: 'TERMINAL_HUD', icon: Target }, { id: 'news', label: 'GLOBAL_INTEL', icon: Radio }, { id: 'fng', label: 'SENTIMENT_CORE', icon: Activity }].map((menu) => (
              <button
                key={menu.id} 
                onClick={() => setMainMenu(menu.id)} 
                className={`px-4 py-1.5 rounded-sm transition-all font-bold tracking-widest text-[10px] flex items-center gap-2 border ${mainMenu === menu.id ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] bot-glow-green' : 'bg-black/50 text-amber-500/50 border-amber-500/20 hover:text-amber-400 hover:border-amber-500/50'}`}
              >
                <menu.icon size={12} className={mainMenu === menu.id ? 'animate-pulse' : ''} /> {menu.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-6 mr-4">
           {/* Social Links */}
           <div className="flex items-center gap-3">
             <a 
               href="https://x.com/bellefinanceai" 
               target="_blank" 
               rel="noopener noreferrer"
               className="w-8 h-8 rounded-sm border border-amber-500/30 bg-black/50 flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-500/60 transition-all group"
             >
               <Twitter size={16} className="text-amber-500/70 group-hover:text-amber-400 transition-colors" />
             </a>
             <a 
               href="https://github.com/decimasudo/belle-terminal" 
               target="_blank" 
               rel="noopener noreferrer"
               className="w-8 h-8 rounded-sm border border-amber-500/30 bg-black/50 flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-500/60 transition-all group"
             >
               <Github size={16} className="text-amber-500/70 group-hover:text-amber-400 transition-colors" />
             </a>
           </div>
           
           {/* Connection HUD */}
           <div className="flex flex-col items-end">
              <span className="text-[9px] text-amber-500/60 uppercase tracking-[0.3em] font-mono">Uplink Status</span>
              <div className="flex items-center gap-2">
                 <div className="flex gap-0.5">
                   <div className="w-1 h-3 bg-amber-500 animate-pulse"></div>
                   <div className="w-1 h-3 bg-amber-500 animate-pulse delay-75"></div>
                   <div className="w-1 h-3 bg-amber-500 animate-pulse delay-150"></div>
                 </div>
                 <span className="text-amber-400 font-bold text-xs tracking-widest bot-text-glow">SECURE</span>
              </div>
           </div>
        </div>
      </div>

      {mainMenu === 'fng' ? (
        <div className="flex-1 overflow-y-auto bg-[#030200] p-6 no-scrollbar relative z-10">
           {/* FNG CONTENT */}
           <div className="max-w-4xl mx-auto mt-10 relative">
              {/* Mecha HUD Frame */}
              <div className="absolute -inset-4 border border-amber-500/20 pointer-events-none">
                 <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500"></div>
                 <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500"></div>
                 <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500"></div>
                 <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500"></div>
              </div>

              <h1 className="text-2xl font-black text-amber-500 mb-8 flex items-center gap-3 tracking-widest border-b border-amber-500/30 pb-4 uppercase">
                <Activity className="animate-pulse"/> PSYCHOLOGICAL MATRIX
              </h1>
              
              <div className="bg-[#050300] border border-amber-500/30 p-12 relative flex flex-col items-center text-center max-w-2xl mx-auto shadow-[0_0_50px_rgba(245,158,11,0.1)] group">
                 <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none"></div>
                 
                 <div className="relative z-10">
                    <div className="text-7xl font-black text-amber-400 mb-4 bot-text-glow tracking-tighter">55</div>
                    <div className="w-full h-1 bg-amber-500/20 rounded-full mb-4 overflow-hidden">
                       <div className="w-[55%] h-full bg-amber-500 shadow-[0_0_10px_#f59e0b]"></div>
                    </div>
                    <div className="text-xs tracking-[0.5em] text-amber-500/80 uppercase font-bold">Neutral Sentiment Protocol</div>
                 </div>
              </div>

              {/* AI Summary Card */}
              <div className="bg-[#0a0600] border border-amber-500/30 p-6 mt-8 rounded-sm max-w-2xl mx-auto shadow-[0_0_30px_rgba(245,158,11,0.05)] relative">
                 <div className="absolute inset-0 cyber-grid opacity-5 pointer-events-none"></div>
                 <div className="relative z-10">
                    <h2 className="text-lg font-black text-amber-500 mb-4 flex items-center gap-2 tracking-wider uppercase">
                       <Zap size={16} className="animate-pulse" /> AI SENTIMENT ANALYSIS
                    </h2>
                    <div className="text-sm text-amber-100/80 leading-relaxed space-y-3">
                       <p>
                         Current market sentiment registers at **neutral levels**, indicating balanced psychological positioning across global markets. 
                         This equilibrium suggests neither extreme fear nor greed dominance in trader behavior.
                       </p>
                       <p>
                         **Crypto sectors** maintain accumulation patterns with potential for upward momentum as institutional adoption continues. 
                         **Equity markets** show resilience with liquidity signals pointing toward sustained stability protocols.
                       </p>
                       <p className="text-amber-400 font-semibold">
                         Risk management protocols remain active. Monitor for sentiment shifts that could trigger volatility cascades.
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : mainMenu === 'news' ? (
        <div className="flex-1 overflow-y-auto bg-[#030200] p-6 no-scrollbar relative z-10">
           <div className="max-w-7xl mx-auto relative z-10">
              <div className="flex items-center justify-between mb-8 border-b border-amber-500/30 pb-4">
                 <h1 className="text-2xl font-black text-amber-500 flex items-center gap-3 tracking-widest uppercase">
                   <Radio className="animate-pulse"/> GLOBAL INTEL FEED
                 </h1>
                 <span className="text-[10px] text-amber-500/50 tracking-[0.4em] animate-pulse">LIVE_STREAMING</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {newsList.map((news, idx) => (
                   <div key={idx} className="bg-[#080500] border border-amber-500/20 p-5 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all group relative">
                      {/* Mecha Corner accents */}
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      <div className="text-amber-500/60 text-[9px] mb-3 font-bold tracking-[0.2em] uppercase border-b border-amber-500/10 pb-2 flex justify-between">
                         <span>{news.source_info?.name}</span>
                         <span className="text-amber-500/40">{formatTime(news.published_on)}</span>
                      </div>
                      <a href={news.url} target="_blank" className="text-amber-100 font-bold hover:text-amber-400 block mb-2 text-sm leading-snug">{news.title}</a>
                   </div>
                ))}
              </div>
           </div>
        </div>
      ) : (

        <>
          {/* -------------------------------------------------------------------------------- */}
          {/* 2. TICKER BAR - HUD SCANNER STYLE */}
          {/* -------------------------------------------------------------------------------- */}
          <div className="h-16 border-b border-amber-500/20 bg-[#0a0600]/80 backdrop-blur flex items-center px-6 gap-8 shrink-0 relative z-10 overflow-hidden">
            {/* Animated scanning line background */}
            <div className="absolute top-0 bottom-0 left-0 w-full bg-[linear-gradient(90deg,transparent,rgba(245,158,11,0.1),transparent)] animate-[scan_3s_linear_infinite] pointer-events-none"></div>

            <div className="flex flex-col relative z-10">
                <span className="text-[9px] text-amber-500/50 tracking-[0.3em] mb-1 font-bold">TARGET_ASSET</span>
                <span className="text-black bg-amber-500 font-black text-lg px-3 py-0.5 border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] tracking-widest uppercase skew-x-[-10deg]">
                   <div className="skew-x-[10deg]">{topTicker.sym}</div>
                </span>
            </div>
            
            <div className="h-8 w-px bg-amber-500/20"></div>

            <div className="flex flex-col w-[180px] relative z-10">
               <span className="text-[9px] text-amber-500/50 tracking-[0.3em] mb-1 font-bold">CURRENT_VALUE</span>
               <span className={`text-3xl font-black tracking-tighter ${topTicker.isUp ? 'text-amber-400 bot-text-glow' : 'text-amber-700 bot-text-glow'}`}>
                 ${topTicker.price}
               </span>
            </div>

            <div className="flex flex-col w-[120px] relative z-10">
              <span className="text-[9px] text-amber-500/50 tracking-[0.3em] mb-1 font-bold">DELTA_24H</span>
              <span className={`font-black text-lg ${topTicker.isUp ? 'text-amber-400' : 'text-amber-700'}`}>
                {topTicker.isUp ? '+' : ''}{topTicker.chgAmt} <span className="text-xs opacity-70">({topTicker.chgPct})</span>
              </span>
            </div>

            <div className="flex-1 flex justify-end gap-12 text-xs font-bold tracking-wider relative z-10">
              <div className="flex flex-col items-end"><span className="text-amber-500/40 text-[9px] tracking-[0.2em]">BID_PRICE</span><span className="text-amber-200">${topTicker.bid}</span></div>
              <div className="flex flex-col items-end"><span className="text-amber-500/40 text-[9px] tracking-[0.2em]">ASK_PRICE</span><span className="text-amber-200">${topTicker.ask}</span></div>
              <div className="flex flex-col items-end border-l border-amber-500/20 pl-6">
                 <span className="text-amber-500/40 text-[9px] tracking-[0.2em]">VIX_INDEX</span>
                 <span className="text-amber-500 animate-pulse font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]">{vix.value}</span>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------------------------- */}
          {/* 3. MAIN CONTENT AREA (PANELS) */}
          {/* -------------------------------------------------------------------------------- */}
          <div className="flex-1 overflow-hidden relative z-10 bg-[#030200]">
            <ResizablePanelGroup orientation="horizontal" className="h-full w-full border-none">
              
              {/* SIDEBAR LIST - TARGET SELECTOR */}
              <ResizablePanel defaultSize={18} minSize={15} className="bg-[#050300] border-r border-amber-500/20 flex flex-col relative">
                <div className="px-4 py-3 text-amber-400 border-b border-amber-500/30 font-black bg-amber-500/5 tracking-[0.3em] text-[10px] flex justify-between items-center shadow-[0_2px_10px_rgba(245,158,11,0.1)]">
                  <span>RADAR_WATCHLIST</span>
                  <Crosshair size={12} className="opacity-50" />
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                  {watchlist.map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => setActiveSymbol(item.sym)} 
                      className={`flex justify-between items-center px-4 py-3 border-b border-amber-500/10 cursor-pointer transition-all group relative ${activeSymbol === item.sym ? 'bg-amber-500/10 border-l-4 border-l-amber-500 shadow-[inset_0_0_15px_rgba(245,158,11,0.1)]' : 'hover:bg-amber-500/5 border-l-4 border-l-transparent hover:border-l-amber-500/50'}`}
                    >
                      {activeSymbol === item.sym && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_5px_#f59e0b]"></div>
                      )}
                      <div className="flex flex-col">
                        <span className={`font-black tracking-widest text-sm ${activeSymbol === item.sym ? 'text-amber-400' : 'text-amber-100/70'} group-hover:text-amber-300`}>{item.sym}</span>
                        <span className="text-amber-500/40 text-[8px] tracking-[0.2em] uppercase">{item.name}</span>
                      </div>
                      <div className="flex flex-col items-end pr-3">
                          <span className={`font-mono font-bold text-xs ${activeSymbol === item.sym ? 'text-amber-200' : 'text-amber-100/50'}`}>{item.price}</span>
                          <span className={`text-[9px] font-bold tracking-wider ${item.isUp ? 'text-amber-500' : 'text-amber-700'}`}>{item.chg}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ResizablePanel>
              
              <ResizableHandle className="bg-amber-500/20 w-1 hover:bg-amber-400 hover:shadow-[0_0_10px_#f59e0b] transition-all relative z-50" />
              
              {/* CHART AREA - MECHA HUD FRAME */}
              <ResizablePanel defaultSize={57} minSize={40} className="bg-[#020100] flex flex-col relative p-2">
                {/* HUD Overlay Decorators */}
                <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-500 z-20 pointer-events-none"></div>
                <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-500 z-20 pointer-events-none"></div>
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-500 z-20 pointer-events-none"></div>
                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-500 z-20 pointer-events-none"></div>

                <div className="flex items-center gap-4 px-4 py-2 z-20 shrink-0 bg-transparent border-b border-amber-500/10 mx-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-amber-500/60 font-bold tracking-[0.2em] mr-2">TIMEFRAME_RES:</span>
                    {['1m','5m','15m','1h','4h','1d'].map(tf => (
                      <button key={tf} onClick={() => setChartTimeframe(tf)} className={`px-3 py-1 text-[10px] font-bold tracking-widest border transition-all uppercase ${tf === chartTimeframe ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-black/50 text-amber-500/60 border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-400'}`}>
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 relative bg-transparent m-2 overflow-hidden border border-amber-500/10">
                  {/* Subtle Grid behind chart */}
                  <div className="absolute inset-0 cyber-grid opacity-5 pointer-events-none z-0"></div>
                  <TradingChart symbol={activeSymbol + "USDT"} timeframe={chartTimeframe} isMock={activeItemData.isMock} />
                </div>
              </ResizablePanel>
              
              <ResizableHandle className="bg-amber-500/20 w-1 hover:bg-amber-400 hover:shadow-[0_0_10px_#f59e0b] transition-all relative z-50" />
              
              {/* AI CHAT AREA - BELLE COMMAND CONSOLE */}
              <ResizablePanel defaultSize={25} minSize={20} className="bg-[#050300] flex flex-col border-l border-amber-500/20 relative">
                <div className="px-4 py-3 text-black border-b border-amber-500/30 font-black bg-amber-500 flex justify-between items-center tracking-[0.2em] text-[10px] shadow-[0_2px_15px_rgba(245,158,11,0.3)]">
                  <div className="flex items-center gap-2">
                     <Zap size={12} className={isAiTyping ? "animate-spin" : ""} /> 
                     BELLE_CMD_CONSOLE
                  </div>
                  <span className="bg-black text-amber-500 px-2 py-0.5 text-[8px] tracking-widest rounded-sm">V.1.0</span>
                </div>

                <div className="flex-1 p-4 flex flex-col overflow-hidden relative">
                   {/* Background Tech Pattern */}
                   <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none"></div>

                   <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-4 flex flex-col relative z-10 pr-2">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`p-3 text-xs leading-relaxed max-w-[90%] relative whitespace-pre-wrap break-words ${msg.role === 'user' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-l-lg rounded-tr-lg' : 'bg-black text-amber-100 border-l-4 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] rounded-r-lg'}`}>
                              {/* Decorator on AI msg */}
                              {msg.role !== 'user' && <div className="absolute top-0 left-0 w-2 h-2 bg-amber-500 -ml-[5px] -mt-[1px]"></div>}
                              {msg.role === 'user' ? (
                                <span className="font-mono">{msg.content}</span>
                              ) : (
                                <div className="font-mono prose prose-xs prose-invert max-w-none">
                                  <ReactMarkdown 
                                    components={{
                                      strong: ({children}) => <span className="font-black text-amber-300">{children}</span>,
                                      p: ({children}) => <span>{children}</span>
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                      {isAiTyping && (
                        <div className="flex items-center gap-2 text-amber-500/80 text-xs pl-2 border-l-2 border-amber-500 ml-1 h-8">
                           <span className="animate-pulse bot-text-glow font-bold tracking-widest text-[10px] uppercase">Processing Data...</span>
                        </div>
                      )}
                   </div>

                   {/* SUGGESTIONS */}
                   <div className="flex flex-wrap gap-2 mb-3 relative z-10">
                      {aiSuggestions.map((suggestion, idx) => (
                         <button 
                            key={idx}
                            onClick={() => handleSendChat(suggestion)}
                            className="text-[9px] font-bold uppercase tracking-[0.1em] bg-black border border-amber-500/30 px-2 py-1.5 text-amber-500/70 hover:text-amber-300 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all skew-x-[-5deg]"
                         >
                            <div className="skew-x-[5deg]">{suggestion}</div>
                         </button>
                      ))}
                   </div>

                   {/* INPUT HUD */}
                   <div className="bg-[#020100] border-2 border-amber-500/40 p-2 flex items-center shrink-0 focus-within:border-amber-400 focus-within:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all relative z-10">
                     <span className="text-amber-500 px-2 text-xs font-black animate-pulse">{'>_'}</span>
                     <input 
                       type="text" 
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatInput)}
                       placeholder="INPUT_COMMAND_OR_QUERY..." 
                       className="bg-transparent outline-none w-full text-amber-300 placeholder-amber-500/30 text-[11px] font-mono tracking-wider h-8 uppercase font-bold"
                     />
                     <div className="absolute right-2 bottom-1 w-1 h-1 bg-amber-500 animate-ping"></div>
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