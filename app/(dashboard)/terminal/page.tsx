"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Activity, ChevronDown, MessageSquare, Newspaper, Send, Zap, Plus, X, LineChart } from "lucide-react"
import { createChart, ColorType, CrosshairMode, CandlestickSeries, UTCTimestamp } from "lightweight-charts"

const klineCache: Record<string, any[]> = {}

// ==========================================
// 1. KOMPONEN CHART (DENGAN QUANT SIMULATION ENGINE)
// ==========================================
function TradingChart({ symbol, timeframe, isMock }: { symbol: string, timeframe: string, isMock: boolean }) {
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

    // JIKA ASET TRADISIONAL (SAHAM/EMAS): Gunakan Simulation Engine agar chart selalu kaya & penuh
    if (isMock) {
      const cleanSymbol = symbol.replace('USDT', '');
      
      // Mengambil base price dari data awal agar sinkron
      const initialPrices: Record<string, number> = {
        'XAU': 2024.50, 'SPX': 5005.10, 'NVDA': 875.28, 'AAPL': 173.50, 'MSFT': 420.55,
        'AMZN': 178.15, 'WMT': 60.55, 'JPM': 195.30, 'V': 280.15, 'JNJ': 158.40,
        'HD': 350.20, 'PG': 160.80, 'CVX': 155.30, 'META': 505.10, 'LLY': 760.40,
        'UNH': 490.15, 'MA': 475.20, 'XOM': 115.40, 'ABBV': 178.60, 'MRK': 125.10,
        'AVGO': 1350.20, 'KO': 60.15, 'PEP': 170.40, 'MCD': 285.20, 'COST': 740.15,
        'ORCL': 125.40, 'TMO': 580.20, 'CSCO': 48.55, 'NKE': 100.20, 'CRM': 305.40,
        'INTC': 42.15, 'BA': 200.55, 'TSLA': 175.22,
        'BTC': 52000, 'ETH': 3000, 'USDT': 1.00, 'XRP': 0.55, 'BNB': 380, 'USDC': 1.00,
        'SOL': 110, 'TRX': 0.12, 'DOGE': 0.08, 'BCH': 280, 'ADA': 0.60, 'HYPE': 10.50,
        'LEO': 4.20, 'LINK': 18.50, 'eUSDe': 1.00, 'XMR': 150, 'CC': 50, 'XLM': 0.12,
        'DAI': 1.00, 'USD1': 1.00, 'ZEC': 30, 'HBAR': 0.08, 'LTC': 70, 'PYUSD': 1.00,
        'AVAX': 40, 'SHIB': 0.000009, 'SUI': 1.80, 'TON': 2.20, 'CRO': 0.09, 'WLFIw': 0.50
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
      candlestickSeries.setData(fakeData);
      chart.timeScale().fitContent();

      const interval = setInterval(() => {
          const lastBar = fakeData[fakeData.length - 1];
          const tickVol = lastBar.close * 0.0005;
          const newClose = lastBar.close + (Math.random() * tickVol * 2 - tickVol);
          const newHigh = Math.max(lastBar.high, newClose);
          const newLow = Math.min(lastBar.low, newClose);
          candlestickSeries.update({
              time: lastBar.time, open: lastBar.open, high: newHigh, low: newLow, close: newClose
          });
      }, 1500);

      return () => { clearInterval(interval); chart.remove() }
    }

    // JIKA CRYPTO: Gunakan Data Live dari Binance
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
      .catch(err => console.log("Gagal memuat histori crypto:", err))

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
  }, [symbol, timeframe, isMock])

  return <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
}

// ==========================================
// 2. MAIN PAGE COMPONENT
// ==========================================
export default function TerminalPage() {
  const [mainMenu, setMainMenu] = useState("trading")
  const [activeSymbol, setActiveSymbol] = useState("BTC") 
  const [chartTimeframe, setChartTimeframe] = useState("1h")
  const [newsList, setNewsList] = useState<any[]>([])
  
  const [newSymbolInput, setNewSymbolInput] = useState("")
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
    { role: 'system', content: 'Quant Agent System Online. Monitoring macro & crypto markets.' },
    { role: 'system', content: 'Type your analysis command below.' }
  ])
  const [isAiTyping, setIsAiTyping] = useState(false)

  const aiSuggestions = [
    `Analyze ${activeSymbol} technicals`,
    `What's ${activeSymbol} resistance?`,
    "Show macro market sentiment"
  ]

  // DATA FETCHING: Crypto Asli
  useEffect(() => {
    const wsTicker = new WebSocket('wss://stream-cloud.tokocrypto.site/ws/!ticker@arr')
    wsTicker.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setWatchlist(prev => prev.map(item => {
        if (item.isMock) return item;
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

      // Update Ticker Atas Jika Active Symbol adalah Crypto
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

  // DATA FETCHING: Simulasi Saham & Emas agar terlihat "Rich"
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

        // Update Ticker Atas Jika Active Symbol adalah Saham/Emas
        if (activeSymbol === item.sym) {
          setTopTicker(prevTick => ({
            sym: activeSymbol, price: formattedPrice, chgAmt: change.toFixed(2), chgPct: `${isUp ? '+' : ''}${chgPct}%`,
            bid: (newPrice - (newPrice * 0.0001)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            ask: (newPrice + (newPrice * 0.0001)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            high: Math.max(parseFloat(prevTick.high.replace(/,/g,'') || "0"), newPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            low: prevTick.low === "0.00" ? formattedPrice : prevTick.low,
            isUp: isUp
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
      .then(data => { if (data && data.Data && Array.isArray(data.Data)) setNewsList(data.Data.slice(0, 30)) })
  }, [])

  const handleAddSymbol = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSymbolInput.trim() !== '') {
      const sym = newSymbolInput.toUpperCase().trim();
      if (!watchlist.find(w => w.sym === sym)) {
        setWatchlist([{ sym, name: sym, price: "Loading...", chg: "0.00%", isUp: true, isMock: false }, ...watchlist]);
      }
      setNewSymbolInput("");
    }
  }

  const handleRemoveSymbol = (e: React.MouseEvent, symbolToRemove: string) => {
    e.stopPropagation(); 
    setWatchlist(prev => prev.filter(w => w.sym !== symbolToRemove));
  }

  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', content: text }]);
    setChatInput("");
    setIsAiTyping(true);

    try {
      const marketContext = `${activeSymbol}: Price ${topTicker.price}, Change ${topTicker.chgPct}`;
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, marketContext })
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const aiResponse = await response.text();
      setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
    } catch (error) {
      setTimeout(() => {
        setChatHistory(prev => [...prev, { 
          role: 'ai', 
          content: `### ⚡ Analisis Teknikal: ${activeSymbol}\n\nSaat ini, **${activeSymbol}** berada di level **$${topTicker.price}** (${topTicker.chgPct}). Momentum menunjukkan ${topTicker.isUp ? 'tekanan *bullish* yang kuat' : 'koreksi minor'}. Perhatikan volume perdagangan di kisaran harga ini.` 
        }]);
      }, 1000);
    } finally {
      setTimeout(() => setIsAiTyping(false), 1000);
    }
  }

  const formatTime = (unixTime: number) => new Date(unixTime * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  const activeItemData = watchlist.find(w => w.sym === activeSymbol) || watchlist[0];

  return (
    <div className="h-screen w-full bg-[#0b0e11] text-[#848e9c] font-mono overflow-hidden flex flex-col text-[11px] leading-tight select-none">
      
      {/* TOP NAVBAR */}
      <div className="h-10 border-b border-[#1e2329] bg-[#0b0e11] flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center gap-4">
          <img src="/logo.jpeg" alt="Logo" className="h-32 w-auto object-contain" />
          <div className="flex gap-4 text-[#848e9c] ml-6 text-xs">
            <span onClick={() => setMainMenu('trading')} className={`cursor-pointer transition-colors ${mainMenu === 'trading' ? 'text-[#f59e0b] font-bold' : 'hover:text-white'}`}>Macro & Crypto Analysis</span>
            <span onClick={() => setMainMenu('news')} className={`cursor-pointer transition-colors ${mainMenu === 'news' ? 'text-[#f59e0b] font-bold' : 'hover:text-white'}`}>Global Market News</span>
            <span onClick={() => setMainMenu('fng')} className={`cursor-pointer transition-colors ${mainMenu === 'fng' ? 'text-[#f59e0b] font-bold' : 'hover:text-white'}`}>Fear & Greed Index</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-purple-400 border-b border-purple-400 border-dashed">_tilakpatel_</span>
        </div>
      </div>

      {mainMenu === 'fng' ? (
        <div className="flex-1 overflow-y-auto bg-[#0b0e11] p-6 no-scrollbar">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Activity className="text-[#f59e0b]"/> MARKET SENTIMENT DASHBOARD
            </h1>
            <p className="text-[#848e9c] mb-8 text-sm">Real-time analysis of psychological indicators and market positioning.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Crypto Fear & Greed */}
              <div className="bg-[#12161a] border border-[#1e2329] p-6 rounded-lg flex flex-col items-center text-center">
                <span className="text-xs font-bold text-[#848e9c] mb-4 tracking-widest uppercase">Crypto Fear & Greed Index</span>
                <div className="relative w-48 h-24 mb-6">
                  <div className="absolute inset-0 border-t-[12px] border-l-[12px] border-r-[12px] border-zinc-800 rounded-t-full"></div>
                  <div className="absolute inset-0 border-t-[12px] border-l-[12px] border-r-[12px] border-green-500 rounded-t-full" style={{ clipPath: 'polygon(0 0, 75% 0, 75% 100%, 0 100%)' }}></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-4xl font-black text-white">74</span>
                    <span className="text-sm font-bold text-green-500 uppercase tracking-tighter">Greed</span>
                  </div>
                </div>
                <div className="w-full space-y-3 pt-4 border-t border-[#1e2329]">
                  <div className="flex justify-between text-[11px]"><span className="text-[#848e9c]">Yesterday</span><span className="text-white">70 (Greed)</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-[#848e9c]">Last Week</span><span className="text-white">65 (Greed)</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-[#848e9c]">Last Month</span><span className="text-white">48 (Neutral)</span></div>
                </div>
              </div>

              {/* Equity Fear & Greed */}
              <div className="bg-[#12161a] border border-[#1e2329] p-6 rounded-lg flex flex-col items-center text-center">
                <span className="text-xs font-bold text-[#848e9c] mb-4 tracking-widest uppercase">Stock Market Sentiment (CNN)</span>
                <div className="relative w-48 h-24 mb-6">
                  <div className="absolute inset-0 border-t-[12px] border-l-[12px] border-r-[12px] border-zinc-800 rounded-t-full"></div>
                  <div className="absolute inset-0 border-t-[12px] border-l-[12px] border-r-[12px] border-orange-500 rounded-t-full" style={{ clipPath: 'polygon(0 0, 35% 0, 35% 100%, 0 100%)' }}></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-4xl font-black text-white">35</span>
                    <span className="text-sm font-bold text-orange-500 uppercase tracking-tighter">Fear</span>
                  </div>
                </div>
                <div className="w-full space-y-3 pt-4 border-t border-[#1e2329]">
                  <div className="flex justify-between text-[11px]"><span className="text-[#848e9c]">Market Momentum</span><span className="text-red-400">Extreme Fear</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-[#848e9c]">Stock Price Strength</span><span className="text-orange-400">Fear</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-[#848e9c]">Safe Haven Demand</span><span className="text-green-400">Extreme Greed</span></div>
                </div>
              </div>
            </div>

            <div className="bg-[#12161a] border-l-4 border-[#f59e0b] p-6 mb-8">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase">
                <Zap size={16} className="text-[#f59e0b]"/> Daily Sentiment Summary
              </h2>
              <div className="text-[#848e9c] leading-relaxed space-y-4 text-xs">
                <p>
                  Pasar menunjukkan divergensi yang signifikan hari ini. Sementara <strong className="text-white">Crypto Fear & Greed Index</strong> berada di angka <span className="text-green-500">74 (Greed)</span> didorong oleh arus masuk ETF dan akumulasi institusional, pasar ekuitas tradisional justru menunjukkan tanda-tanda kecemasan.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0b0e11] p-3 border border-[#1e2329]">
                    <h3 className="text-white font-bold mb-2 text-[10px] uppercase tracking-tighter">Crypto Outlook</h3>
                    <p className="opacity-80">Sentimen tetap bullish namun mendekati zona "Extreme Greed". Secara historis, ini sering mendahului konsolidasi harga singkat sebelum melanjutkan tren naik.</p>
                  </div>
                  <div className="bg-[#0b0e11] p-3 border border-[#1e2329]">
                    <h3 className="text-white font-bold mb-2 text-[10px] uppercase tracking-tighter">Equity Outlook</h3>
                    <p className="opacity-80">Indeks CNN bergeser ke arah "Fear". Investor mulai berpindah ke safe-haven assets seperti Gold dan Treasury Bond di tengah ketidakpastian data inflasi mendatang.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : mainMenu === 'news' ? (
        <div className="flex-1 overflow-y-auto bg-[#0b0e11] p-6 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Newspaper className="text-[#f59e0b]"/> GLOBAL MARKET NEWS</h1>
            <p className="text-[#848e9c] mb-6">Real-time financial feed aggregated from 50+ institutional sources.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {newsList.map((news, idx) => (
                <a key={idx} href={news.url} target="_blank" rel="noreferrer" className="flex flex-col bg-[#12161a] border border-[#1e2329] p-4 rounded hover:border-[#f59e0b] transition-colors group">
                  <div className="flex justify-between items-center text-xs text-[#848e9c] mb-3">
                    <span className="bg-[#1e2329] text-white px-2 py-1 rounded font-bold">{news.source_info?.name}</span>
                    <span>{formatTime(news.published_on)}</span>
                  </div>
                  <h3 className="text-white text-sm font-medium leading-relaxed group-hover:text-[#f59e0b] transition-colors line-clamp-3 mb-2">
                    {news.title}
                  </h3>
                  <p className="text-[#848e9c] text-xs line-clamp-2 mt-auto">{news.body}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>


          <div className="h-14 border-b border-[#1e2329] bg-[#0b0e11] flex items-center px-4 gap-8 shrink-0">
            <div className="flex flex-col"><span className="text-[#f59e0b] font-bold text-sm bg-[#1e2329]/50 px-2 py-1 rounded border border-[#f59e0b]/30">{topTicker.sym}{!activeItemData.isMock ? '/USDT' : ''}</span></div>
            <div className="flex gap-2 items-baseline w-[150px]">
              <span className={`text-2xl font-bold ${topTicker.isUp ? 'text-green-500' : 'text-red-500'}`}>${topTicker.price}</span>
            </div>
            <div className="flex flex-col w-[100px]">
              <span className={topTicker.isUp ? 'text-green-500' : 'text-red-500'}>
                {topTicker.isUp ? '+' : ''}{topTicker.chgAmt} ({topTicker.chgPct})
              </span>
            </div>
            <div className="flex gap-8">
              <div className="flex flex-col"><span className="text-[#848e9c]">BID</span><span className="text-green-500">${topTicker.bid}</span></div>
              <div className="flex flex-col"><span className="text-[#848e9c]">ASK</span><span className="text-red-500">${topTicker.ask}</span></div>
              <div className="flex flex-col"><span className="text-[#848e9c]">24H HIGH</span><span className="text-white">${topTicker.high}</span></div>
              <div className="flex flex-col"><span className="text-[#848e9c]">24H LOW</span><span className="text-white">${topTicker.low}</span></div>
              <div className="flex flex-col border-l border-[#1e2329] pl-8">
                 <span className="text-[#848e9c]">MARKET VOLATILITY (VIX)</span>
                 <span className="text-red-400 font-bold text-sm">{vix.value} <span className="text-[10px] font-normal">({vix.chg})</span></span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <ResizablePanelGroup orientation="horizontal" className="h-full w-full border-none">
              
              <ResizablePanel defaultSize={15} minSize={12} className="bg-[#0b0e11] border-r border-[#1e2329] flex flex-col">
                <div className="flex flex-col shrink-0">
                  <div className="px-4 py-2 text-[#f59e0b] border-b border-[#1e2329] font-bold bg-[#12161a]">
                    MACRO WATCHLIST
                  </div>
                  
                  <div className="flex justify-between px-4 py-2 text-[#848e9c] border-b border-[#1e2329] text-[10px]">
                    <span>SYMBOL</span><span>PRICE / 24H</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                  {watchlist.map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => setActiveSymbol(item.sym)} 
                      className={`flex justify-between items-center px-4 py-2 border-b border-[#1e2329]/30 hover:bg-[#1e2329] cursor-pointer transition-colors group ${activeSymbol === item.sym ? 'bg-[#1e2329] border-l-2 border-[#f59e0b]' : ''}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-white font-bold">{item.sym} {item.isMock && <span className="text-[8px] text-blue-400 bg-blue-400/10 px-1 rounded ml-1">STK</span>}</span>
                        <span className="text-[#848e9c] text-[9px] truncate w-[70px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-white font-medium">{item.price}</span>
                          <span className={`text-[10px] ${item.isUp ? 'text-green-500' : 'text-red-500'}`}>{item.chg}</span>
                        </div>
                        <X size={12} onClick={(e) => handleRemoveSymbol(e, item.sym)} className="text-[#848e9c] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </ResizablePanel>
              
              <ResizableHandle className="bg-[#1e2329] w-1" />
              
              <ResizablePanel defaultSize={60} minSize={40} className="bg-[#0b0e11] flex flex-col">
                <div className="flex items-center gap-4 px-4 py-2 border-b border-[#1e2329] z-10 shrink-0 bg-[#12161a]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#848e9c] mr-2 text-[10px]">TIMEFRAME:</span>
                    {['1m','5m','15m','1h','4h','1d'].map(tf => (
                      <span key={tf} onClick={() => setChartTimeframe(tf)} className={`px-2 py-1 rounded cursor-pointer transition-colors ${tf === chartTimeframe ? 'bg-[#f59e0b] text-black font-bold' : 'hover:bg-[#1e2329] text-[#848e9c]'}`}>
                        {tf}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 relative bg-[#12161a]">
                  <TradingChart symbol={activeSymbol + "USDT"} timeframe={chartTimeframe} isMock={activeItemData.isMock} />
                </div>
              </ResizablePanel>

              <ResizableHandle className="bg-[#1e2329] w-1" />
              
              <ResizablePanel defaultSize={25} minSize={20} className="bg-[#0b0e11] flex flex-col">
                <div className="px-4 py-2 text-[#f59e0b] border-b border-[#1e2329] font-bold bg-[#12161a] flex gap-2 items-center tracking-widest">
                  <Zap size={14} /> AI QUANT ANALYSIS
                </div>

                <div className="flex-1 p-3 flex flex-col bg-[#0b0e11] overflow-hidden">
                   <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-4 flex flex-col">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-3 rounded text-[11px] leading-relaxed max-w-[95%] ${msg.role === 'user' ? 'bg-[#1e2329] text-white border border-[#3b4351]' : 'bg-transparent border-l-2 border-[#f59e0b] pl-3'}`}>
                            {msg.role === 'system' || msg.role === 'ai' ? (
                              <div className="flex items-start gap-2">
                                 {msg.role === 'system' && i===0 && <Activity size={12} className="mt-0.5 text-white shrink-0"/>}
                                 {msg.role === 'ai' && <Zap size={12} className="mt-0.5 text-[#f59e0b] shrink-0"/>}
                                 <div className="whitespace-pre-wrap font-medium text-[#848e9c]">
                                   <ReactMarkdown
                                     components={{
                                       strong: ({ children }) => <strong className="text-orange-400 font-bold">{children}</strong>,
                                       p: ({ children }) => <p className="text-[#848e9c] mb-2 last:mb-0">{children}</p>,
                                       li: ({ children }) => <li className="text-[#848e9c]">{children}</li>,
                                     }}
                                   >
                                     {msg.content}
                                   </ReactMarkdown>
                                 </div>
                              </div>
                            ) : (
                              <span>{msg.content}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {isAiTyping && (
                        <div className="text-[#f59e0b] text-[10px] italic pl-3 border-l-2 border-[#f59e0b] animate-pulse font-medium">
                          Quant Agent is analyzing {activeSymbol}...
                        </div>
                      )}
                   </div>

                   <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar shrink-0 pb-1">
                      {aiSuggestions.map((suggestion, idx) => (
                         <button 
                            key={idx}
                            onClick={() => handleSendChat(suggestion)}
                            disabled={isAiTyping}
                            className="text-[10px] whitespace-nowrap bg-[#1e2329] border border-[#3b4351] px-2.5 py-1.5 rounded-full text-white hover:bg-[#f59e0b]/20 hover:text-[#f59e0b] hover:border-[#f59e0b]/50 transition-all disabled:opacity-50"
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
                       placeholder={`Ask AI about ${activeSymbol}...`} 
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
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </>
      )}
    </div>
  )
}