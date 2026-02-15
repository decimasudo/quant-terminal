import { NextResponse } from 'next/server';
import { getLiveMarketData } from '@/lib/alpha-vantage';

export async function GET() {
  try {
    console.log("[MARKET API] Fetching live market data...");
    const data = await getLiveMarketData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[MARKET API ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
