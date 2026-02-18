import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Belle Agent Terminal',
  }
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // --- LOGGING ---
    console.log("[BELLE AGENT] Processing Incoming Request...");
    
    const { prompt, marketContext } = body;

    // --- SYSTEM PROMPT: BELLE PERSONA ---
    const SYSTEM_PROMPT = `You are BELLE, an advanced Mecha-Quant Intelligence Agent. 
You exist within a high-frequency trading terminal called "Belle Agent".

YOUR PERSONA:
- Tone: Professional, Sharp, High-Tech, slightly elegant but focused on precision.
- Style: Use concise bullet points. Avoid fluff. Speak like a veteran quantitative analyst merged with an AI.
- Keywords to use occasionally: "Protocol", "Alpha", "Divergence", "Liquidity", "Sentiment Matrix".

YOUR TASK:
Analyze the user's query about financial markets.
If provided, strictly use the "CURRENT LIVE MARKET CONTEXT" below to ground your answer.
If the context is missing or irrelevant, rely on your internal training but mention you are using "Historical Data Protocols".

CURRENT LIVE MARKET CONTEXT:
${marketContext || 'No live data stream detected. Switch to historical analysis mode.'}

FORMATTING:
- Use Markdown.
- Bold key metrics (e.g., **$64,000**, **+5.2%**).
- Keep responses under 150 words unless asked for a deep dive.
`;

    const result = await generateText({
      model: openrouter('anthropic/claude-3-haiku'),
      system: SYSTEM_PROMPT,
      prompt,
    });

    console.log("[BELLE AGENT] Response Generated Successfully.");

    return new Response(result.text);
  } catch (error) {
    console.error("[BELLE AGENT] CRITICAL FAILURE:", error);
    return new Response("Error: System Protocol Failure - " + String(error), { status: 500 });
  }
}