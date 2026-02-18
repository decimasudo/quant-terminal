import Link from "next/link";
import { Activity, Zap, Terminal, Globe, Shield, ChevronsRight, ArrowRight, Bot, LineChart, Cpu, Github, Twitter, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 font-mono flex flex-col selection:bg-amber-500/30 overflow-x-hidden relative">
      
      {/* ENHANCED BACKGROUND GRID - GOLD THEME WITH ANIMATIONS */}
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.05)_0%,transparent_50%)] pointer-events-none"></div>
      
      {/* FLOATING PARTICLES - GOLD GLOW */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-500/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      {/* ANIMATED SCAN LINES */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent animate-[scan_3s_ease-in-out_infinite]"></div>
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/10 to-transparent animate-[scan_4s_ease-in-out_infinite_reverse]"></div>
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent animate-[scan_5s_ease-in-out_infinite]"></div>
      </div>

      {/* ENHANCED NAVBAR WITH GLOW */}
      <nav className="border-b border-white/5 bg-black/80 backdrop-blur-sm sticky top-0 z-50 relative overflow-hidden">
        {/* Animated border glow */}
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent animate-pulse"></div>
        
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 border border-amber-500/50 flex items-center justify-center rounded-full overflow-hidden relative bg-black shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all duration-500">
               <img src="/belle-agent.jpeg" alt="Belle Logo" className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500" />
               <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full animate-pulse"></div>
               {/* Breathing glow effect */}
               <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-[breathe_2s_ease-in-out_infinite]"></div>
            </div>
            <span className="font-bold tracking-[0.2em] text-lg uppercase flex flex-col leading-none group-hover:text-amber-400 transition-colors">
              <span className="text-amber-500">BELLE</span>
              <span className="text-[9px] text-amber-500 font-normal tracking-[0.5em]">AGENT</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest">
             <Link href="#features" className="text-zinc-500 hover:text-amber-400 transition-all hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] relative">
               CAPABILITIES
               <div className="absolute -bottom-1 left-0 w-0 h-[1px] bg-amber-500 transition-all hover:w-full"></div>
             </Link>
             <Link href="#bot" className="text-zinc-500 hover:text-amber-400 transition-all hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] relative">
               INTELLIGENCE
               <div className="absolute -bottom-1 left-0 w-0 h-[1px] bg-amber-500 transition-all hover:w-full"></div>
             </Link>
             <div className="h-4 w-px bg-white/10"></div>
             <a 
               href="https://github.com/decimasudo/quant-terminal" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-zinc-500 hover:text-amber-400 transition-all hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] p-2 rounded hover:bg-amber-500/10"
             >
               <Github size={18} />
             </a>
             <Link 
               href="/terminal" 
               className="bg-amber-600 hover:bg-amber-500 text-black px-6 py-2 rounded-sm font-black flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 relative overflow-hidden group"
             >
               <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <Zap size={14} className="fill-black relative z-10" /> 
               <span className="relative z-10">LAUNCH_TERMINAL</span>
               <ArrowRight size={14} className="relative z-10 group-hover:translate-x-1 transition-transform" />
             </Link>
          </div>
        </div>
      </nav>

      {/* ENHANCED HERO SECTION WITH DYNAMIC EFFECTS */}
      <section className="relative pt-32 pb-20 px-6 border-b border-white/5 overflow-hidden">
        {/* Floating geometric shapes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 border border-amber-500/20 rotate-45 animate-[float_6s_ease-in-out_infinite]"></div>
          <div className="absolute top-40 right-20 w-16 h-16 border border-amber-500/10 rounded-full animate-[float_8s_ease-in-out_infinite_reverse]"></div>
          <div className="absolute bottom-40 left-1/4 w-12 h-12 bg-amber-500/5 rotate-12 animate-[float_7s_ease-in-out_infinite]"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-1 rounded-full border border-amber-500/30 bg-amber-950/20 text-amber-500 text-[10px] font-bold tracking-[0.3em] mb-8 animate-in fade-in slide-in-from-top-4 duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            NEURAL HANDSHAKE ESTABLISHED
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] relative">
            <span className="block animate-in fade-in slide-in-from-left-4 duration-1000 delay-200">GOLD STANDARD</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-700 bot-text-glow animate-in fade-in slide-in-from-right-4 duration-1000 delay-500 relative">
              INTELLIGENCE
              {/* Animated underline */}
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-[glow_2s_ease-in-out_infinite]"></div>
            </span>
          </h1>
          
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-light animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
            An elite quantitative interface powered by <span className="text-amber-500 font-bold animate-pulse">Belle Agent</span>. 
            Merging high-frequency data with mecha-grade precision analysis.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1000">
            <Link 
              href="/terminal" 
              className="w-full md:w-auto px-8 py-4 bg-amber-500 text-black font-black text-sm tracking-widest hover:bg-amber-400 transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Zap size={18} className="fill-black relative z-10 animate-pulse" /> 
              <span className="relative z-10">INITIALIZE SESSION</span>
            </Link>
            <button className="w-full md:w-auto px-8 py-4 bg-black border border-white/10 text-zinc-400 font-bold text-sm tracking-widest hover:border-amber-500/50 hover:text-amber-500 transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10">SYSTEM PROTOCOLS</span>
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping relative z-10"></div>
            </button>
          </div>
        </div>

        {/* HERO VISUAL MOCKUP - MECHA STYLE */}
        <div className="mt-24 max-w-6xl mx-auto border border-white/10 bg-[#050505] p-2 rounded-sm shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
           
           <div className="grid grid-cols-12 h-64 md:h-96 gap-1 p-1 bg-black relative">
              {/* Overlay Grid */}
              <div className="absolute inset-0 bg-[url('/grid.png')] opacity-20 pointer-events-none"></div>

              {/* SIDEBAR MOCK */}
              <div className="col-span-1 hidden md:block bg-zinc-900/30 border-r border-white/5 flex flex-col items-center py-4 gap-4">
                 <div className="w-8 h-8 rounded bg-amber-900/20 border border-amber-500/20"></div>
                 <div className="w-8 h-8 rounded bg-white/5"></div>
                 <div className="w-8 h-8 rounded bg-white/5"></div>
              </div>
              
              {/* CHART MOCK */}
              <div className="col-span-12 md:col-span-8 border border-white/5 bg-zinc-900/10 relative overflow-hidden flex items-center justify-center">
                 <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-amber-500/10 to-transparent"></div>
                 {/* Chart lines - Gold */}
                 <div className="flex items-end justify-between w-full h-full p-4 gap-1 opacity-80">
                    {[40, 60, 45, 70, 55, 80, 65, 90, 75, 50, 60, 85, 95, 80, 70, 85].map((h, i) => (
                       <div key={i} className="w-full bg-amber-500 hover:bg-amber-400 transition-colors" style={{height: `${h}%`}}></div>
                    ))}
                 </div>
                 {/* Floating Price Tag */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black border border-amber-500 px-4 py-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <span className="text-amber-500 font-bold text-xl font-mono tracking-widest">$64,230.50</span>
                 </div>
              </div>

              {/* BELLE BOT MOCK */}
              <div className="col-span-12 md:col-span-3 border border-white/5 bg-black flex flex-col relative items-center justify-center overflow-hidden">
                 <div className="absolute inset-0 bg-amber-900/5"></div>
                 <div className="w-20 h-20 rounded-full border-2 border-amber-500 p-1 mb-4 relative z-10 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                    <img src="/belle-agent.jpeg" alt="Belle" className="w-full h-full object-cover rounded-full opacity-90" />
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-blink"></span>
                    <span className="text-amber-500 font-bold text-[10px] tracking-[0.2em]">BELLE_ONLINE</span>
                 </div>
                 <div className="mt-4 w-3/4 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-amber-500 animate-pulse"></div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* FEATURE 1: QUANT DATA */}
      <section id="features" className="py-24 px-6 border-b border-white/5 bg-[#020202]">
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
               <div className="w-12 h-12 bg-amber-900/10 border border-amber-500/30 flex items-center justify-center rounded-sm mb-6 rotate-45">
                  <Activity className="text-amber-500 -rotate-45" />
               </div>
               <h2 className="text-3xl font-black mb-4 tracking-tight">HIGH-SPEED <span className="text-amber-500">DATA STREAM</span></h2>
               <p className="text-zinc-400 leading-relaxed mb-6 font-light">
                 Latency-free WebSocket connections directly from major liquidity providers. 
                 Belle processes market ticks in microseconds to identify golden entry points.
               </p>
               <ul className="space-y-3 text-xs font-bold tracking-wide text-zinc-300">
                  <li className="flex items-center gap-3"><div className="w-1 h-1 bg-amber-500"></div> Sub-millisecond Execution</li>
                  <li className="flex items-center gap-3"><div className="w-1 h-1 bg-amber-500"></div> Multi-Asset: Crypto, Forex, Metals</li>
                  <li className="flex items-center gap-3"><div className="w-1 h-1 bg-amber-500"></div> Proprietary Volatility Engine</li>
               </ul>
            </div>
            
            <div className="border border-white/5 bg-white/[0.02] p-8 rounded-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full"></div>
               <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2 mb-4">
                     <span className="text-zinc-600 tracking-widest">ASSET</span>
                     <span className="text-zinc-600 tracking-widest">PRICE</span>
                     <span className="text-zinc-600 tracking-widest">STATUS</span>
                  </div>
                  {[
                     {s:'XAU/USD', p:'2,024.50', c:'ACCUMULATE'},
                     {s:'BTC/USDT', p:'64,230.10', c:'BULLISH'},
                     {s:'NVDA', p:'950.00', c:'HOLD'},
                     {s:'ETH/USDT', p:'3,450.20', c:'BULLISH'},
                  ].map((row, i) => (
                     <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                        <span className="font-bold text-white group-hover:text-amber-500 transition-colors">{row.s}</span>
                        <span className="text-zinc-300">${row.p}</span>
                        <span className="bg-amber-900/20 px-2 py-1 rounded text-[9px] text-amber-500 border border-amber-500/20">{row.c}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </section>

      {/* ENHANCED FEATURE 2: BELLE AGENT (GOLD HIGHLIGHT) */}
      <section id="bot" className="py-24 px-6 border-b border-white/5 bg-black relative overflow-hidden">
         {/* Enhanced Background Effects */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 blur-[100px] pointer-events-none animate-pulse"></div>
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_70%,rgba(245,158,11,0.03)_0%,transparent_50%)] pointer-events-none"></div>
         
         {/* Floating data streams */}
         <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-20 right-20 w-32 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent animate-[data-stream_3s_ease-in-out_infinite]"></div>
           <div className="absolute bottom-32 left-16 w-24 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent animate-[data-stream_4s_ease-in-out_infinite_reverse]"></div>
           <div className="absolute top-1/2 left-1/4 w-40 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent animate-[data-stream_5s_ease-in-out_infinite]"></div>
         </div>
         
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
            <div className="order-2 md:order-1 relative">
                <div className="relative border border-amber-500/30 bg-[#0a0a0a] p-1 rounded-full aspect-square max-w-md mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.1)] group hover:shadow-[0_0_80px_rgba(245,158,11,0.2)] transition-all duration-1000">
                    {/* Enhanced rotating borders */}
                    <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-2 rounded-full border border-amber-500/20 animate-[spin_15s_linear_infinite_reverse]"></div>
                    <div className="absolute inset-4 rounded-full border border-amber-500/10 animate-[spin_20s_linear_infinite]"></div>
                    
                    {/* Pulsing energy rings */}
                    <div className="absolute inset-6 rounded-full border border-amber-500/30 animate-[breathe_3s_ease-in-out_infinite]"></div>
                    <div className="absolute inset-8 rounded-full border border-amber-500/20 animate-[breathe_4s_ease-in-out_infinite_reverse]"></div>
                    
                    {/* BELLE AVATAR LARGE with enhanced effects */}
                    <div className="w-[80%] h-[80%] rounded-full overflow-hidden relative z-10 border-4 border-black group-hover:scale-105 transition-transform duration-700 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                        <img src="/belle-agent.jpeg" alt="Belle Agent" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        {/* Inner glow */}
                        <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-pulse"></div>
                    </div>

                    {/* Enhanced status indicator */}
                    <div className="absolute bottom-10 bg-black/80 backdrop-blur border border-amber-500/50 px-6 py-2 rounded-full z-20 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                        <span className="text-amber-500 font-bold tracking-[0.3em] text-xs animate-pulse flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
                          SYSTEM ACTIVE
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
                        </span>
                    </div>
                    
                    {/* Neural network connections */}
                    <div className="absolute top-4 left-4 w-2 h-2 bg-amber-500 rounded-full animate-blink"></div>
                    <div className="absolute top-8 right-6 w-1.5 h-1.5 bg-amber-400 rounded-full animate-blink" style={{animationDelay: '0.5s'}}></div>
                    <div className="absolute bottom-12 left-8 w-1 h-1 bg-amber-300 rounded-full animate-blink" style={{animationDelay: '1s'}}></div>
                </div>
            </div>

            <div className="order-1 md:order-2">
               <div className="w-12 h-12 bg-amber-900/10 border border-amber-500/30 flex items-center justify-center rounded-sm mb-6 animate-[float_3s_ease-in-out_infinite]">
                  <Bot className="text-amber-500 animate-pulse" />
               </div>
               <h2 className="text-4xl font-black mb-4 text-white tracking-tighter">MEET <span className="text-amber-500 animate-pulse">BELLE</span></h2>
               <p className="text-zinc-400 leading-relaxed mb-8 font-light text-lg animate-in fade-in slide-in-from-left-4 duration-1000">
                 "I am not just a bot. I am a high-precision trading sentinel."
               </p>
               <p className="text-zinc-500 text-sm mb-8 leading-relaxed animate-in fade-in slide-in-from-right-4 duration-1000 delay-200">
                 Belle monitors charts 24/7 using advanced pattern recognition algorithms. 
                 She detects divergences, volume spikes, and liquidity sweeps before they happen.
               </p>
               
               <div className="bg-[#080808] border border-amber-900/30 p-6 rounded-sm text-xs font-mono shadow-2xl relative overflow-hidden group hover:border-amber-500/50 transition-all duration-500">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-900 to-transparent animate-[glow_2s_ease-in-out_infinite]"></div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                     <Sparkles size={12} className="text-amber-500 animate-spin" style={{animationDuration: '3s'}}/>
                     <span className="text-amber-500 font-bold tracking-widest animate-pulse">BELLE_LOGS_V1</span>
                     <div className="ml-auto flex gap-1">
                        <div className="w-1 h-1 bg-amber-500 rounded-full animate-blink"></div>
                        <div className="w-1 h-1 bg-amber-400 rounded-full animate-blink" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-1 bg-amber-300 rounded-full animate-blink" style={{animationDelay: '0.4s'}}></div>
                     </div>
                  </div>
                  <div className="space-y-3 text-zinc-400">
                     <p className="flex gap-2 animate-in fade-in slide-in-from-left-4 duration-500 delay-300"><span className="text-amber-700 animate-pulse">{'>'}</span> Scanning 50+ pairs for liquidity grabs...</p>
                     <p className="flex gap-2 animate-in fade-in slide-in-from-left-4 duration-500 delay-500"><span className="text-amber-700 animate-pulse">{'>'}</span> <span className="text-white">BTC/USDT</span> Golden Cross confirmed on 4H.</p>
                     <p className="flex gap-2 animate-in fade-in slide-in-from-left-4 duration-500 delay-700"><span className="text-amber-700 animate-pulse">{'>'}</span> Volatility spike detected in Asian Session.</p>
                     <div className="mt-4 p-3 bg-amber-950/20 border border-amber-500/20 text-amber-500 font-bold text-center tracking-widest animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        RECOMMENDATION: LONG ENTRY
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* FEATURE 3: GLOBAL INTEL */}
       <section className="py-24 px-6 border-b border-white/5 bg-[#020202]">
         <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
             <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center rounded-sm mb-6">
               <Globe className="text-zinc-400" />
             </div>
             <h2 className="text-3xl font-black mb-4">GLOBAL <span className="text-zinc-500">INTEL MATRIX</span></h2>
             <p className="text-zinc-400 max-w-2xl mb-12 font-light">
               Aggregated news from top financial sources. Belle filters the noise and delivers only high-impact signals.
             </p>

             <div className="grid md:grid-cols-3 gap-6 w-full text-left">
                {[
                  { t: "FOMC Minutes Released", d: "Fed signals potential rate cuts in late Q4. Markets react positively." },
                  { t: "Institutional Inflows", d: "BlackRock ETF volume hits record high. Supply shock imminent." },
                  { t: "Tech Earnings Beat", d: "AI sector rallies as earnings surpass Wall St estimates." }
                ].map((item, i) => (
                  <div key={i} className="border border-white/5 bg-black p-6 hover:border-amber-500/30 hover:bg-white/[0.02] transition-all group cursor-pointer relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="text-amber-600 text-[9px] font-bold mb-3 flex items-center gap-2 tracking-[0.2em] uppercase">
                        <span className="w-1 h-1 rounded-full bg-amber-500"></span> LIVE WIRE
                     </div>
                     <h3 className="text-zinc-200 font-bold mb-3 group-hover:text-amber-500 transition-colors text-lg leading-tight">{item.t}</h3>
                     <p className="text-zinc-600 text-xs leading-relaxed font-mono">{item.d}</p>
                  </div>
                ))}
             </div>
         </div>
       </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-white/5 bg-black text-zinc-600 text-sm text-center">
         <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 grayscale hover:grayscale-0 transition-all">
               <img src="/belle-agent.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold uppercase tracking-[0.2em] text-xs text-zinc-400">BELLE<span className="text-amber-500">.AGENT</span></span>
         </div>
         <p className="font-mono text-[10px] text-zinc-700">&copy; 2026 BELLE INTELLIGENCE SYSTEMS. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}