import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-zinc-100">
      <div className="text-center max-w-3xl px-4">
        <h1 className="text-5xl font-bold mb-6 tracking-tight font-mono">
          QUANT <span className="text-orange-500">TERMINAL</span>
        </h1>
        <p className="text-lg text-zinc-400 mb-8 font-mono">
          Advanced algorithmic trading strategies, risk assessment, and equity research powered by AI Agents.
        </p>
        <Link 
          href="/terminal" 
          className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold font-mono rounded-none border border-orange-500 transition-colors inline-block"
        >
          `{'>'}` LAUNCH TERMINAL
        </Link>
      </div>
    </div>
  );
}
