import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'DOTUSDT';
  // Binance menggunakan format '1h', '1m', '1d' yang persis sama dengan Tokocrypto
  const interval = searchParams.get('interval') || '1h';

  try {
    // Memakai endpoint Data Vision Binance (Anti-blokir ISP & Data 100% identik dengan Tokocrypto)
    const response = await fetch(
      `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`
    );

    if (!response.ok) {
      throw new Error(`Gagal fetch: HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error("Error Fetch Historis:", error);
    return NextResponse.json(
      { error: 'Gagal menarik data histori', details: error.message }, 
      { status: 500 }
    );
  }
}