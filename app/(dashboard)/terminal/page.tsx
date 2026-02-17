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
      layout: { background: { type: ColorType.Solid, color: '#000000' }, textColor: '#4ade80' },
      grid: { vertLines: { color: '#163a1a' }, horzLines: { color: '#163a1a' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: '#163a1a', rightOffset: 5 },
      rightPriceScale: { borderColor: '#163a1a' },
      autoSize: true, 
    })

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444', 
      borderVisible: false, 
      wickUpColor: '#22c55e', wickDownColor: '#ef4444'
    })

    const cacheKey = `${symbol}-${timeframe}`
    let isDisposed = false; // Track disposal state

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
// 2. MAIN PAGE COMPONENT
// ==========================================
export default function TerminalPage() {
  const [mainMenu, setMainMenu] = useState("trading")
  const [activeSymbol, setActiveSymbol] = useState("BTC") 
  const [chartTimeframe, setChartTimeframe] = useState("1h")
  const [newsList, setNewsList] = useState<any[]>([])
  
  // -- Helper Bot State --
  const [botEmotion, setBotEmotion] = useState<'happy' | 'thinking' | 'alert' | 'speaking'>('happy');
  const [botMessage, setBotMessage] = useState("Systems Nominal. Ready to trade.");

  const [fngSummary, setFngSummary] = useState<any>(null)
  const [isFngLoading, setIsFngLoading] = useState(false)
  
  const fetchFngSummary = async () => {
    if (fngSummary || isFngLoading) return;

    // 1. Check LocalStorage Cache
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
    } catch (e) {
      console.warn("Cache read error:", e);
    }

    setIsFngLoading(true);
    try {
      const prompt = "Generate a professional Daily Sentiment Summary for a financial terminal in ENGLISH only. Use objective, data-driven, and brief language. Focus on current market divergence where crypto is in greed (index 74) while equities are in fear (index 35) and VIX is rising. Format your response EXACTLY as a JSON object with these fields: 'intro' (one short paragraph), 'crypto_outlook' (one sentence summarizing crypto sentiment), and 'equity_outlook' (one sentence summarizing global equity sentiment). Do not use any markdown code blocks, just return the raw JSON string.";
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, marketContext: "Crypto Fear: 74 (Greed), Equity Fear: 35 (Fear), VIX: 14.35" })
      });
      const data = await res.text();
      const cleanData = data.replace(/```json/g, "").replace(/```/g, "").trim();
      const json = JSON.parse(cleanData);
      
      setFngSummary(json);
      
      // 2. Save to LocalStorage Cache
      localStorage.setItem('fng_summary_cache', JSON.stringify({
        data: json,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error("F&G Fetch Error:", e);
      setFngSummary({
        intro: "Markets are showing significant divergence today. Crypto sentiment remains bullish driven by ETF inflows, while traditional equity markets signal growing anxiety amid macroeconomic uncertainty.",
        crypto_outlook: "Sentiment remains greed-heavy, often preceding a short consolidation before trend continuation.",
        equity_outlook: "Traditional indicators shift towards fear as investors pivot to safe-haven assets like Gold."
      });
    } finally {
      setIsFngLoading(false);
    }
  };

  useEffect(() => {
    if (mainMenu === 'fng') {
      fetchFngSummary();
    }
  }, [mainMenu]);

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
    setBotEmotion('thinking');
    setBotMessage(`Analyzing ${activeSymbol}...`);

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
      setBotEmotion('speaking');
      setBotMessage("Analysis Complete.");
      setTimeout(() => setBotEmotion('happy'), 3000);
    } catch (error) {
      setTimeout(() => {
        setChatHistory(prev => [...prev, { 
          role: 'ai', 
          content: `### ⚡ Analisis Teknikal: ${activeSymbol}\n\nSaat ini, **${activeSymbol}** berada di level **$${topTicker.price}** (${topTicker.chgPct}). Momentum menunjukkan ${topTicker.isUp ? 'tekanan *bullish* yang kuat' : 'koreksi minor'}. Perhatikan volume perdagangan di kisaran harga ini.` 
        }]);
        setBotEmotion('alert');
        setBotMessage("Using Local Fallback Analysis.");
      }, 1000);
    } finally {
      setTimeout(() => setIsAiTyping(false), 1000);
    }
  }

  const formatTime = (unixTime: number) => new Date(unixTime * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  const activeItemData = watchlist.find(w => w.sym === activeSymbol) || watchlist[0];
  const activeColor = topTicker.isUp ? 'text-[#4ade80]' : 'text-[#ef4444]'; // text-green-400 / text-red-500
  const activeGlow = topTicker.isUp ? 'bot-text-glow' : 'glow-red';

  return (
    <div className="h-screen w-full bg-black text-white font-mono overflow-hidden flex flex-col text-[11px] leading-tight select-none cyber-grid">
      
      {/* TOP NAVBAR - GAMER STYLE */}
      <div className="h-12 border-b border-[#333] bg-[#050505] flex items-center justify-between px-4 shrink-0 shadow-lg z-20 relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className="w-8 h-8 rounded border border-zinc-800 flex items-center justify-center relative overflow-hidden">
                   <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black animate-ping"></div>
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black"></div>
             </div>
             <div className="flex flex-col">
                <span className="text-white font-black text-lg tracking-widest leading-none bot-text-glow font-mono uppercase">C.F.A<span className="text-green-500">_OPS</span></span>
                <span className="text-[9px] text-green-500/80 tracking-[0.2em] font-bold">QUANT ASSISTANT V2.0</span>
             </div>
          </div>
          
          <div className="h-6 w-px bg-[#333] mx-2"></div>
          
          <div className="flex gap-1 bg-[#111] p-1 rounded-lg border border-[#333]">
            {[{ id: 'trading', label: 'Macro & Crypto Analysis' }, { id: 'news', label: 'Global Market News' }, { id: 'fng', label: 'Fear & Greed Index' }].map((menu) => (
              <button
                key={menu.id} 
                onClick={() => setMainMenu(menu.id)} 
                className={`px-4 py-1.5 rounded transition-all font-bold tracking-wider text-[10px] ${mainMenu === menu.id ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'text-gray-500 hover:text-white hover:bg-[#222]'}`}
              >
                {menu.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Connection Status */}
           <div className="flex items-center gap-2 px-3 py-1 bg-[#111] border border-[#333] rounded text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-green-500 font-bold">SYSTEM ONLINE</span>
           </div>
           
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-[#111] rounded border border-[#333] flex items-center justify-center text-purple-500 font-bold">TP</div>
             <span className="text-gray-400 font-bold">_tilakpatel_</span>
           </div>
        </div>
      </div>

      {mainMenu === 'fng' ? (
        <div className="flex-1 overflow-y-auto bg-black p-6 no-scrollbar cyber-grid">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-black text-white mb-2 flex items-center gap-2 tracking-tighter">
              <Activity className="text-green-500 bot-text-glow"/> MARKET SENTIMENT MATRIX
            </h1>
            <p className="text-gray-500 mb-8 text-sm font-mono uppercase tracking-wider">Real-time analysis of psychological indicators and market positioning.</p>
            
            <div className="mb-8">
              {/* Aggregated Fear & Greed */}
              <div className="bg-[#050505] border border-[#333] p-8 relative flex flex-col items-center text-center max-w-2xl mx-auto shadow-[0_0_30px_rgba(0,255,0,0.05)] overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-green-500"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500"></div>
                
                <span className="text-xs font-bold text-green-500 mb-6 tracking-[0.3em] uppercase z-10">Aggregated Market Sentiment Index</span>
                <div className="relative w-64 h-32 mb-10 z-10">
                  <div className="absolute inset-0 border-t-[16px] border-l-[16px] border-r-[16px] border-[#111] rounded-t-full"></div>
                  {/* Gauge indicator: 55% coverage */}
                  <div className="absolute inset-0 border-t-[16px] border-l-[16px] border-r-[16px] border-green-500 rounded-t-full bot-glow-green" style={{ clipPath: 'polygon(0 0, 55% 0, 55% 100%, 0 100%)' }}></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-6xl font-black text-white bot-text-glow">55</span>
                    <span className="text-sm font-bold text-green-500 uppercase tracking-widest mt-1">Neutral</span>
                  </div>
                </div>
                
                <div className="w-full grid grid-cols-3 gap-4 pt-8 border-t border-[#333] z-10">
                  <div className="flex flex-col gap-1 italic border-r border-[#333]">
                    <span className="text-gray-500 text-[10px] uppercase tracking-wider">Crypto Base</span>
                    <span className="text-green-400 font-bold font-mono">74 (Greed)</span>
                  </div>
                  <div className="flex flex-col gap-1 italic border-r border-[#333]">
                    <span className="text-gray-500 text-[10px] uppercase tracking-wider">Equity Base</span>
                    <span className="text-red-400 font-bold font-mono">35 (Fear)</span>
                  </div>
                  <div className="flex flex-col gap-1 italic">
                    <span className="text-gray-500 text-[10px] uppercase tracking-wider">VIX Status</span>
                    <span className="text-red-500 font-bold font-mono animate-pulse">High Vol</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#050505] border-l-4 border-green-500 p-6 mb-8 max-w-2xl mx-auto border border-[#333] relative">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Zap size={16} className="text-red-500"/> Daily Sentiment Summary
              </h2>
              <div className="text-gray-400 leading-relaxed space-y-4 text-xs font-mono">
                {isFngLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-[#111] rounded w-full"></div>
                    <div className="h-4 bg-[#111] rounded w-3/4"></div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="h-20 bg-[#111] rounded"></div>
                      <div className="h-20 bg-[#111] rounded"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="leading-relaxed">
                      {fngSummary?.intro || "Fetching market psychology analysis..."}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="bg-[#111] p-3 border border-green-900/30">
                        <h3 className="text-white font-bold mb-2 text-[10px] uppercase tracking-tighter flex items-center gap-2">
                          <Activity size={10} className="text-green-500"/> Crypto Outlook
                        </h3>
                        <p className="opacity-80 leading-tight text-green-100/70">{fngSummary?.crypto_outlook || "Sentiment analysis pending..."}</p>
                      </div>
                      <div className="bg-[#111] p-3 border border-red-900/30">
                        <h3 className="text-white font-bold mb-2 text-[10px] uppercase tracking-tighter flex items-center gap-2">
                          <LineChart size={10} className="text-red-500"/> Equity Outlook
                        </h3>
                        <p className="opacity-80 leading-tight text-red-100/70">{fngSummary?.equity_outlook || "Sentiment analysis pending..."}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : mainMenu === 'news' ? (
        <div className="flex-1 overflow-y-auto bg-black p-6 no-scrollbar cyber-grid relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.05)_0%,transparent_70%)] pointer-events-none"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <h1 className="text-2xl font-black text-white mb-2 flex items-center gap-2 tracking-tighter">
              <Newspaper className="text-red-500 glow-red animate-pulse"/> GLOBAL INTEL FEED
            </h1>
            <p className="text-red-500/70 mb-6 font-mono text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              LIVE INCOMING TRANSMISSIONS
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {newsList.map((news, idx) => (
                <div key={idx} className="relative group">
                  {/* Neon Red Chat Bubble Overlay */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-red-900 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
                  
                  {/* Chat Bubble Shape */}
                  <div className="relative bg-[#0a0505] border border-red-900/40 p-5 rounded-2xl rounded-bl-sm shadow-[0_0_15px_rgba(220,38,38,0.05)] hover:shadow-[0_0_25px_rgba(220,38,38,0.2)] transition-all flex flex-col h-full transform group-hover:-translate-y-1">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-red-900/20">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-900/20 border border-red-500/30 flex items-center justify-center">
                          <span className="text-red-500 font-bold text-[10px]">{news.source_info?.name?.substring(0,2).toUpperCase() || "XX"}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-green-400 font-bold text-[10px] uppercase tracking-wider">{news.source_info?.name || "UNKNOWN"}</span>
                          <span className="text-gray-600 text-[9px] font-mono">{formatTime(news.published_on)}</span>
                        </div>
                      </div>
                      <div className="px-2 py-0.5 bg-red-950/30 border border-red-900/30 rounded text-[9px] text-red-500 font-mono animate-pulse">
                        LIVE
                      </div>
                    </div>

                    {/* Content */}
                    <a href={news.url} target="_blank" rel="noreferrer" className="flex-1 block">
                      <h3 className="text-white font-bold text-sm leading-snug mb-2 group-hover:text-red-400 transition-colors line-clamp-2">
                        {news.title}
                      </h3>
                      <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 font-mono">
                        {news.body}
                      </p>
                    </a>

                    {/* Footer decoration */}
                    <div className="mt-4 flex justify-between items-center pt-2 border-t border-red-900/10">
                       <span className="text-[9px] text-red-900/60 font-mono tracking-widest">ENCRYPTED://{Math.floor(Math.random()*9999)}</span>
                       <div className="flex gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full animate-ping delay-75"></span>
                          <span className="w-1 h-1 bg-red-500 rounded-full animate-ping delay-150"></span>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (

        <>


          <div className="h-14 border-b border-[#333] bg-[#050505] flex items-center px-4 gap-8 shrink-0 shadow-lg relative z-10">
            <div className="flex flex-col"><span className="text-green-500 font-bold text-sm bg-green-900/10 px-2 py-1 rounded border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)] tracking-widest">{topTicker.sym}{!activeItemData.isMock ? '/USDT' : ''}</span></div>
            <div className="flex gap-2 items-baseline w-[150px]">
              <span className={`text-2xl font-black tracking-tighter ${topTicker.isUp ? 'text-green-500 bot-text-glow' : 'text-red-500 glow-red'}`}>${topTicker.price}</span>
            </div>
            <div className="flex flex-col w-[100px]">
              <span className={`font-bold ${topTicker.isUp ? 'text-green-500' : 'text-red-500'}`}>
                {topTicker.isUp ? '+' : ''}{topTicker.chgAmt} ({topTicker.chgPct})
              </span>
            </div>
            <div className="flex gap-8 text-[10px] font-bold tracking-wider">
              <div className="flex flex-col"><span className="text-gray-500">BID</span><span className="text-green-400">${topTicker.bid}</span></div>
              <div className="flex flex-col"><span className="text-gray-500">ASK</span><span className="text-red-400">${topTicker.ask}</span></div>
              <div className="flex flex-col"><span className="text-gray-500">24H HIGH</span><span className="text-gray-300">${topTicker.high}</span></div>
              <div className="flex flex-col"><span className="text-gray-500">24H LOW</span><span className="text-gray-300">${topTicker.low}</span></div>
              <div className="flex flex-col border-l border-[#333] pl-8">
                 <span className="text-gray-500">MARKET VOLATILITY (VIX)</span>
                 <span className="text-red-500 font-bold text-sm animate-pulse">{vix.value} <span className="text-[10px] font-normal text-red-500/70">({vix.chg})</span></span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <ResizablePanelGroup orientation="horizontal" className="h-full w-full border-none">
              
              <ResizablePanel defaultSize={15} minSize={12} className="bg-black border-r border-[#333] flex flex-col">
                <div className="flex flex-col shrink-0">
                  <div className="px-4 py-2 text-green-500 border-b border-[#333] font-bold bg-[#111] tracking-widest text-[10px]">
                    MACRO WATCHLIST
                  </div>
                  
                  <div className="flex justify-between px-4 py-2 text-gray-500 border-b border-[#333] text-[9px] font-mono tracking-wider">
                    <span>SYMBOL</span><span>PRICE / 24H</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                  {watchlist.map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => setActiveSymbol(item.sym)} 
                      className={`flex justify-between items-center px-4 py-2.5 border-b border-[#333]/30 hover:bg-[#111] cursor-pointer transition-colors group ${activeSymbol === item.sym ? 'bg-[#111] border-l-2 border-green-500' : ''}`}
                    >
                      <div className="flex flex-col">
                        <span className={`font-bold tracking-wider ${activeSymbol === item.sym ? 'text-white' : 'text-gray-400'} group-hover:text-white`}>{item.sym} {item.isMock && <span className="text-[8px] text-blue-400 bg-blue-400/10 px-1 rounded ml-1">STK</span>}</span>
                        <span className="text-gray-600 text-[9px] truncate w-[70px] uppercase">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className={`font-mono font-medium ${activeSymbol === item.sym ? 'text-white' : 'text-gray-400'} group-hover:text-white`}>{item.price}</span>
                          <span className={`text-[9px] ${item.isUp ? 'text-green-500' : 'text-red-500'}`}>{item.chg}</span>
                        </div>
                        <X size={12} onClick={(e) => handleRemoveSymbol(e, item.sym)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </ResizablePanel>
              
              <ResizableHandle className="bg-[#333] w-1 hover:bg-green-500 transition-colors" />
              
              <ResizablePanel defaultSize={60} minSize={40} className="bg-black flex flex-col relative">
                {/* GRID OVERLAY */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent z-20"></div>

                <div className="flex items-center gap-4 px-4 py-2 border-b border-[#333] z-10 shrink-0 bg-[#050505]">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 mr-2 text-[10px] tracking-wider font-bold">TIMEFRAME:</span>
                    {['1m','5m','15m','1h','4h','1d'].map(tf => (
                      <span key={tf} onClick={() => setChartTimeframe(tf)} className={`px-2 py-1 rounded-sm cursor-pointer transition-all uppercase text-[10px] font-bold ${tf === chartTimeframe ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'hover:bg-[#111] text-gray-500 hover:text-green-500'}`}>
                        {tf}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 relative bg-black">
                  <TradingChart symbol={activeSymbol + "USDT"} timeframe={chartTimeframe} isMock={activeItemData.isMock} />
                </div>
              </ResizablePanel>
              
              <ResizableHandle className="bg-[#333] w-1 hover:bg-green-500 transition-colors" />
              
              <ResizablePanel defaultSize={25} minSize={20} className="bg-black flex flex-col border-l border-[#333]">
                {/* BOT FACE Visual Component */}
                <div className="h-48 bg-[#050505] border-b border-[#333] flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                   <div className="absolute inset-0 cyber-grid opacity-20"></div>
                   
                   {/* SCANLINES */}
                   <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>

                   {/* BOT CONTAINER */}
                   <div className={`relative transition-all duration-500 ${botEmotion === 'alert' ? 'scale-110' : 'scale-100'}`}>
                      {/* HEAD SHELL - CRAB SHAPE */}
                      <div className="relative w-32 h-24">
                         
                         {/* EYES */}
                         <div className="absolute top-8 left-4 w-6 h-6 bg-black border-2 border-red-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.5)] z-20">
                            <div className={`w-2 h-2 bg-red-500 rounded-full ${botEmotion === 'speaking' ? 'animate-ping' : ''}`}></div>
                         </div>
                         <div className="absolute top-8 right-4 w-6 h-6 bg-black border-2 border-red-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.5)] z-20">
                            <div className={`w-2 h-2 bg-red-500 rounded-full ${botEmotion === 'speaking' ? 'animate-ping' : ''}`}></div>
                         </div>

                         {/* VISOR (MOUTH/DISPLAY) */}
                         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-8 bg-black border border-green-500/50 rounded flex items-center justify-center overflow-hidden">
                            {botEmotion === 'thinking' ? (
                               <div className="flex gap-1">
                                  <div className="w-1 h-4 bg-green-500 animate-bounce delay-75"></div>
                                  <div className="w-1 h-4 bg-green-500 animate-bounce delay-150"></div>
                                  <div className="w-1 h-4 bg-green-500 animate-bounce delay-300"></div>
                               </div>
                            ) : botEmotion === 'speaking' ? (
                               <div className="w-full h-full flex items-center justify-center gap-0.5">
                                 {[...Array(8)].map((_,i) => (
                                    <div key={i} className="w-1 bg-green-500 animate-[pulse_0.5s_ease-in-out_infinite]" style={{height: `${Math.random() * 100}%`, animationDelay: `${i*0.1}s`}}></div>
                                 ))}
                               </div>
                            ) : botEmotion === 'alert' ? (
                               <div className="text-red-500 font-bold text-[10px] animate-pulse">WARNING</div>
                            ) : (
                               <div className="w-12 h-0.5 bg-green-500/50"></div> 
                            )}
                         </div>

                         {/* CRAB LEGS (DECORATIVE) */}
                         <div className="absolute -top-4 -left-6 w-8 h-12 border-l-4 border-t-4 border-red-900/50 rounded-tl-xl -rotate-12"></div>
                         <div className="absolute -top-4 -right-6 w-8 h-12 border-r-4 border-t-4 border-red-900/50 rounded-tr-xl rotate-12"></div>
                         
                         {/* MAIN BODY GLOW */}
                         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-900/20 rounded-xl -z-10"></div>
                      </div>
                   </div>

                   {/* STATUS TEXT */}
                   <div className="mt-2 text-center z-20">
                      <div className={`text-[10px] font-bold tracking-[0.2em] ${botEmotion === 'alert' ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                         STATUS: {botEmotion.toUpperCase()}
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1 h-4 font-mono">{botMessage}</div>
                   </div>
                </div>

                <div className="px-4 py-2 text-green-500 border-b border-[#333] font-bold bg-[#111] flex gap-2 items-center tracking-widest text-[10px]">
                  <Zap size={14} className={isAiTyping ? "animate-spin" : ""} /> AI COMMAND LINE
                </div>

                <div className="flex-1 p-3 flex flex-col bg-black overflow-hidden relative">
                   <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 mb-4 flex flex-col">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-3 rounded-sm text-[11px] leading-relaxed max-w-[95%] border ${msg.role === 'user' ? 'bg-[#111] text-green-400 border-green-900/30' : 'bg-black text-gray-300 border-[#333] border-l-2 border-l-red-500'}`}>
                            {msg.role === 'system' || msg.role === 'ai' ? (
                              <div className="flex items-start gap-2">
                                 {msg.role === 'ai' && <Zap size={12} className="mt-0.5 text-red-500 shrink-0"/>}
                                 <div className="whitespace-pre-wrap font-medium font-mono">
                                   <ReactMarkdown
                                     components={{
                                       strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                                       p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                       li: ({ children }) => <li className="text-gray-400 marker:text-red-900">{children}</li>,
                                     }}
                                   >
                                     {msg.content}
                                   </ReactMarkdown>
                                 </div>
                              </div>
                            ) : (
                              <span className="font-mono">{msg.content}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {isAiTyping && (
                        <div className="text-green-500 text-[10px] italic pl-3 border-l-2 border-green-500 animate-pulse font-medium font-mono">
                          {activeSymbol} Analysis in progress...
                        </div>
                      )}
                   </div>

                   <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar shrink-0 pb-1">
                      {aiSuggestions.map((suggestion, idx) => (
                         <button 
                            key={idx}
                            onClick={() => handleSendChat(suggestion)}
                            disabled={isAiTyping}
                            className="text-[9px] uppercase tracking-wider whitespace-nowrap bg-black border border-[#333] px-3 py-1 text-gray-500 hover:bg-green-900/20 hover:text-green-500 hover:border-green-500/50 transition-all disabled:opacity-50"
                         >
                            {suggestion}
                         </button>
                      ))}
                   </div>

                   <div className="bg-[#050505] border border-[#333] p-2 flex items-center shrink-0 focus-within:border-green-500 transition-colors relative group">
                     <span className="text-green-500 mr-2 text-xs">{'>'}</span>
                     <input 
                       type="text" 
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatInput)}
                       placeholder={`ENTER COMMAND...`} 
                       disabled={isAiTyping}
                       className="bg-transparent outline-none w-full text-green-500 placeholder-[#333] disabled:opacity-50 pr-8 font-mono uppercase text-[11px]"
                     />
                     <button 
                        onClick={() => handleSendChat(chatInput)}
                        disabled={!chatInput.trim() || isAiTyping}
                        className="absolute right-2 text-[#333] group-hover:text-green-500 disabled:opacity-30"
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