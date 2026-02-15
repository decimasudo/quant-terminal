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
