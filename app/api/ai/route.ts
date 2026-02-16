import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Quant Terminal',
  }
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // --- LOGGING 1: INCOMING DATA CHECK ---
    console.log("\n================================================");
    console.log("[LOG-1] INCOMING REQUEST FROM TERMINAL FRONTEND");
    console.log("User Query:", body.prompt);
    console.log("Injected Market Context:\n", body.marketContext);
    console.log("================================================\n");

    const { prompt, marketContext } = body;

    // Simple test response
    if (prompt.toLowerCase().includes('test')) {
      return new Response('This is a test response. The AI analysis is working!');
    }

    const SYSTEM_PROMPT = `You are a Quantitative Financial AI Agent (FinRobot) embedded within a Bloomberg Terminal interface.
Use the Financial Chain-of-Thought methodology to answer queries.
Answer in the cold, objective, and data-driven tone of a Wall Street analyst. Format your response using clean Markdown (use bullet points and bold text for key metrics).

CURRENT LIVE MARKET CONTEXT:
${marketContext || 'No live data provided.'}

Use the data above as your primary reference if the user asks about current market conditions. If the requested asset is not in the context, rely on your internal knowledge base.`;

    // --- LOGGING 2: DISPATCH TO OPENROUTER ---
    console.log("[LOG-2] DISPATCHING REQUEST TO OPENROUTER...");
    console.log("Target Model: anthropic/claude-3-haiku:beta");

    const result = await generateText({
      model: openrouter('anthropic/claude-3-haiku'),
      system: SYSTEM_PROMPT,
      prompt,
    });

    // --- LOGGING 3: SUCCESS ---
    console.log("[LOG-3] OPENROUTER CONNECTION SUCCESSFUL. RESPONSE GENERATED...\n");

    return new Response(result.text);
  } catch (error) {
    // --- LOGGING 4: FATAL ERROR TRACE ---
    console.error("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("[FATAL ERROR] FAILED TO PROCESS AI REQUEST");
    console.error(error);
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
    
    return new Response("Error: Failed to process AI request - " + String(error), { status: 500 });
  }
}
