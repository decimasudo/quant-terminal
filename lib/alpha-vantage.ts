import { marketData as fallbackMockData } from "./mock-data";

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

export async function getLiveMarketData() {
  const tickers = ["AAPL", "NVDA", "MSFT"]; // Kita batasi 3 saham dulu agar hemat limit API
  const results = [];

  for (const ticker of tickers) {
    try {
      const response = await fetch(
        `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${API_KEY}`,
        { next: { revalidate: 60 } } // Cache 60 detik agar tidak spam API
      );
      const data = await response.json();

      // Cek apakah kena Rate Limit dari Alpha Vantage
      if (data["Information"] || data["Note"]) {
        console.warn(`[API LIMIT] Alpha Vantage limit reached for ${ticker}.`);
        throw new Error("Rate limit exceeded");
      }

      const quote = data["Global Quote"];
      if (quote) {
        const price = parseFloat(quote["05. price"]);
        const changePercentStr = quote["10. change percent"];
        const changeNum = parseFloat(changePercentStr);
        
        results.push({
          ticker: quote["01. symbol"],
          name: ticker === "AAPL" ? "Apple Inc." : ticker === "NVDA" ? "NVIDIA Corp." : "Microsoft",
          price: price,
          change: changeNum > 0 ? `+${changePercentStr}` : changePercentStr,
          isPositive: changeNum > 0,
          sparkline: [price * 0.98, price * 0.99, price * 0.95, price * 1.02, price * 1.01, price] // Pseudo-sparkline hemat API
        });
      }
    } catch (error) {
      console.error(`Gagal mengambil data asli ${ticker}, menggunakan fallback.`);
      // Jika gagal/limit habis, ambil dari mock data
      const mock = fallbackMockData.find(m => m.ticker === ticker);
      if (mock) results.push(mock);
    }
  }
  
  // Tambahkan sisa mock data agar tabel tetap terlihat penuh
  const existingTickers = results.map(r => r.ticker);
  const remainingMocks = fallbackMockData.filter(m => !existingTickers.includes(m.ticker));
  
  return [...results, ...remainingMocks];
}

export async function getStockTimeSeries(symbol: string, interval: string = '5min') {
  try {
    const response = await fetch(
      `${BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${API_KEY}`,
      { next: { revalidate: 300 } } // Cache 5 minutes
    );
    const data = await response.json();

    if (data["Information"] || data["Note"]) {
      console.warn(`[API LIMIT] Alpha Vantage limit reached for ${symbol}.`);
      throw new Error("Rate limit exceeded");
    }

    const timeSeries = data[`Time Series (${interval})`];
    if (!timeSeries) {
      throw new Error("No data available");
    }

    // Convert to candlestick format
    const formattedData = Object.entries(timeSeries)
      .slice(0, 100) // Last 100 data points
      .map(([timestamp, values]: [string, any]) => ({
        time: Math.floor(new Date(timestamp).getTime() / 1000) as any,
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        close: parseFloat(values["4. close"]),
      }))
      .reverse(); // Reverse to chronological order

    return formattedData;
  } catch (error) {
    console.error(`Failed to fetch stock data for ${symbol}:`, error);
    // Return mock data for demo
    return [
      { time: Math.floor(Date.now() / 1000) - 3600, open: 200, high: 205, low: 195, close: 202 },
      { time: Math.floor(Date.now() / 1000) - 1800, open: 202, high: 208, low: 200, close: 206 },
      { time: Math.floor(Date.now() / 1000), open: 206, high: 210, low: 204, close: 208 },
    ];
  }
}
