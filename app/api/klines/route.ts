import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'DOTUSDT';
  const interval = searchParams.get('interval') || '1h';

  // Validate symbol format (should be BASEQUOTE format, not QUOTEQUOTE)
  if (!symbol || symbol.length < 6 || symbol.slice(-4) === symbol.slice(-8, -4)) {
    return NextResponse.json(
      { error: 'Invalid symbol format. Symbol should be in BASEQUOTE format (e.g., BTCUSDT, not USDTUSDT)' },
      { status: 400 }
    );
  }

  // Validate interval
  const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
  if (!validIntervals.includes(interval)) {
    return NextResponse.json(
      { error: `Invalid interval. Valid intervals: ${validIntervals.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    // Memakai endpoint Data Vision Binance (Anti-blokir ISP & Data 100% identik dengan Tokocrypto)
    const response = await fetch(
      `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BelleAgent/1.0)',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Binance API Error: ${response.status} - ${errorText}`);
      throw new Error(`Binance API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Error Fetch Historis:", error);

    // Handle different types of errors
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - Binance API took too long to respond' },
        { status: 408 }
      );
    }

    if (error.message.includes('Invalid symbol')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch market data', details: error.message },
      { status: 500 }
    );
  }
}