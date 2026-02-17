
import Link from "next/link";
import { Activity, Zap, Terminal, Globe, Shield, ChevronsRight, ArrowRight, Bot, LineChart, Cpu } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 font-mono flex flex-col selection:bg-orange-500/30 overflow-x-hidden relative">
      
      {/* BACKGROUND GRID */}
      <div className="fixed inset-0 cyber-grid opacity-20 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.1)_0%,transparent_50%)] pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="border-b border-zinc-900 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 border border-zinc-800 flex items-center justify-center rounded overflow-hidden">
              <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold tracking-tighter text-lg uppercase">Claw Financial <span className="text-orange-500">Agent</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
             <Link href="#features" className="text-zinc-500 hover:text-white transition-colors">FEATURES</Link>
             <Link href="#bot" className="text-zinc-500 hover:text-red-500 transition-colors uppercase">C.F.A</Link>
             <Link 
               href="/terminal" 
               className="bg-orange-600 hover:bg-orange-500 text-black px-4 py-2 font-bold flex items-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
             >
               ENTER_TERMINAL <ArrowRight size={14} />
             </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 border-b border-zinc-900">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-900/50 bg-orange-900/10 text-orange-500 text-xs font-bold tracking-widest mb-8 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            SYSTEM ONLINE: V2.0 LIVE
          </div>
          
          {/* CRAB ICON - ROBOT CRAB WITH OPEN CLAWS */}
          {/* <div className="flex justify-center mb-8">
            <div className="relative w-20 h-14">
              <div className="absolute top-1 left-2 w-3 h-3 bg-black border-2 border-red-500 rounded-full flex items-center justify-center shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="absolute top-1 right-2 w-3 h-3 bg-black border-2 border-red-500 rounded-full flex items-center justify-center shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              
              <div className="absolute -top-1 -left-6 w-8 h-6 border-l-2 border-t-2 border-red-500 rounded-tl-lg -rotate-12 bg-red-900/10 flex items-start justify-start">
                <div className="w-3 h-2 border-r border-t border-red-500 rounded-tr-sm -rotate-45 mt-1 ml-1"></div>
              </div>
              <div className="absolute -top-1 -right-6 w-8 h-6 border-r-2 border-t-2 border-red-500 rounded-tr-lg rotate-12 bg-red-900/10 flex items-start justify-end">
                <div className="w-3 h-2 border-l border-t border-red-500 rounded-tl-sm rotate-45 mt-1 mr-1"></div>
              </div>
              
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-4 bg-black border border-orange-500/50 rounded flex items-center justify-center">
                <div className="w-8 h-0.5 bg-orange-500/50"></div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-900/20 rounded-lg -z-10"></div>
            </div>
          </div> */}
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-tight">
            Real-Time Market<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-700">Intelligence</span>
          </h1>
          
          <p className="text-zinc-500 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed uppercase">
            Advanced real-time analytics, AI-powered sentiment matrix, and the all-new <span className="text-red-500 font-bold border-b border-red-500/50">claw financial agent</span> automated assistant.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link 
              href="/terminal" 
              className="w-full md:w-auto px-8 py-4 bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              <Zap size={20} className="fill-black" /> START TRADING
            </Link>
            <button className="w-full md:w-auto px-8 py-4 bg-black border border-zinc-800 text-zinc-300 font-bold text-lg hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center gap-2">
              VIEW DOCS
            </button>
          </div>
        </div>

        {/* HERO VISUAL MOCKUP */}
        <div className="mt-20 max-w-6xl mx-auto border border-zinc-800 bg-[#050505] p-2 rounded-lg shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
           <div className="grid grid-cols-12 h-64 md:h-96 gap-1 p-1 bg-black">
              {/* SIDEBAR MOCK */}
              <div className="col-span-1 hidden md:block bg-zinc-900/50 border-r border-zinc-800"></div>
              {/* CHART MOCK */}
              <div className="col-span-12 md:col-span-8 border border-zinc-800 bg-zinc-900/20 relative overflow-hidden flex items-center justify-center">
                 <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-orange-500/10 to-transparent"></div>
                 {/* Chart lines */}
                 <div className="flex items-end justify-between w-full h-full p-4 gap-1 opacity-50">
                    {[40, 60, 45, 70, 55, 80, 65, 90, 75, 50, 60, 85, 95, 80, 70, 85].map((h, i) => (
                       <div key={i} className="w-full bg-orange-500/80" style={{height: `${h}%`}}></div>
                    ))}
                 </div>
              </div>
              {/* BOT MOCK */}
              <div className="col-span-12 md:col-span-3 border border-zinc-800 bg-zinc-900/20 flex flex-col p-4 border-l-0 md:border-l-2 border-l-red-500 relative items-center justify-center">
                 <div className="w-16 h-16 bg-black border border-red-500 rounded-full flex items-center justify-center mb-4 self-center animate-bounce shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                    <Bot size={24} className="text-red-500" />
                 </div>
                 <div className="text-red-500 font-bold text-xs tracking-widest animate-pulse">ANALYZING...</div>
              </div>
           </div>
        </div>
      </section>

      {/* FEATURE 1: QUANT DATA */}
      <section id="features" className="py-24 px-6 border-b border-zinc-900 bg-[#020202]">
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
               <div className="w-12 h-12 bg-orange-900/20 border border-orange-500/50 flex items-center justify-center rounded mb-6">
                  <Activity className="text-orange-500" />
               </div>
               <h2 className="text-3xl font-bold mb-4">REAL-TIME <span className="text-orange-500">QUANT DATA</span></h2>
               <p className="text-zinc-400 leading-relaxed mb-6">
                 latency-free WebSocket connections to Binance, NYSE, and Forex feeds. Visualize 
                 market movements with our proprietary simulation engine tailored for high-frequency strategies.
               </p>
               <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><ChevronsRight size={14} className="text-orange-500"/> Sub-millisecond Updates</li>
                  <li className="flex items-center gap-2"><ChevronsRight size={14} className="text-orange-500"/> Multi-Asset Coverage (Crypto, Forex, Stocks)</li>
                  <li className="flex items-center gap-2"><ChevronsRight size={14} className="text-orange-500"/> Custom Technical Indicators</li>
               </ul>
            </div>
            
            <div className="border border-zinc-800 bg-zinc-900/10 p-6 rounded-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/20 blur-3xl rounded-full"></div>
               <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between border-b border-zinc-800 pb-2">
                     <span className="text-zinc-500">SYMBOL</span>
                     <span className="text-zinc-500">PRICE</span>
                     <span className="text-zinc-500">24H</span>
                  </div>
                  {[
                     {s:'BTC/USDT', p:'64,230.50', c:'+2.4%'},
                     {s:'ETH/USDT', p:'3,450.10', c:'+1.8%'},
                     {s:'SOL/USDT', p:'145.20', c:'+5.2%'},
                     {s:'NVDA', p:'950.00', c:'+0.5%'},
                  ].map((row, i) => (
                     <div key={i} className="flex justify-between items-center text-orange-400">
                        <span className="font-bold">{row.s}</span>
                        <span>${row.p}</span>
                        <span className="bg-orange-900/20 px-2 py-0.5 rounded text-orange-500">{row.c}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </section>

      {/* FEATURE 2: AI SENTIMENT */}
      <section className="py-24 px-6 border-b border-zinc-900 bg-black">
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            
            <div className="order-2 md:order-1 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-zinc-900/80 border border-zinc-800 p-8 rounded-lg flex flex-col items-center justify-center aspect-square">
                   <div className="text-center mb-8">
                      <div className="text-6xl font-black text-white mb-2 tracking-tighter">74</div>
                      <div className="text-orange-500 font-bold tracking-widest uppercase text-sm border-t border-orange-500/30 pt-2">Greed Index</div>
                   </div>
                   <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="w-[74%] h-full bg-gradient-to-r from-orange-500 to-orange-300"></div>
                   </div>
                   <div className="flex justify-between w-full mt-2 text-[10px] text-zinc-500 uppercase font-bold">
                      <span>Extreme Fear</span>
                      <span>Neutral</span>
                      <span className="text-orange-500">Extreme Greed</span>
                   </div>
                </div>
            </div>

            <div className="order-1 md:order-2">
               <div className="w-12 h-12 bg-orange-900/20 border border-orange-500/50 flex items-center justify-center rounded mb-6">
                  <Cpu className="text-orange-500" />
               </div>
               <h2 className="text-3xl font-bold mb-4">AI SENTIMENT <span className="text-orange-500">MATRIX</span></h2>
               <p className="text-zinc-400 leading-relaxed mb-6">
                 We aggregate social signals, news sentiment, and on-chain metrics into a single readable score.
                 Know the market psychology before you execute.
               </p>
               <ul className="space-y-3 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><ChevronsRight size={14} className="text-orange-500"/> GPT-4o Powered Analysis</li>
                  <li className="flex items-center gap-2"><ChevronsRight size={14} className="text-orange-500"/> Fear & Greed Integration</li>
                  <li className="flex items-center gap-2"><ChevronsRight size={14} className="text-orange-500"/> Global Macro Context</li>
               </ul>
            </div>
         </div>
      </section>

      {/* FEATURE 3: C.F.A (RED HIGHLIGHT) */}
      <section id="bot" className="py-24 px-6 border-b border-zinc-900 bg-[#050000] relative overflow-hidden">
         <div className="absolute top-0 right-0 w-1/3 h-full bg-red-900/5 blur-[100px] pointer-events-none"></div>
         
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
            <div>
               <div className="w-12 h-12 bg-red-900/20 border border-red-500/50 flex items-center justify-center rounded mb-6">
                  <Bot className="text-red-500" />
               </div>
               <h2 className="text-3xl font-bold mb-4 text-white">MEET <span className="text-red-500">C.F.A</span></h2>
               <p className="text-zinc-400 leading-relaxed mb-6 uppercase">
                 Your personal automated assistant. C.F.A monitors the charts 24/7 so you don't have to.
                 Reactive, intelligent, and always watching for the next breakout.
               </p>
               
               <div className="bg-black border border-red-900/30 p-6 rounded-lg text-xs font-mono shadow-[0_0_20px_rgba(220,38,38,0.1)]">
                  <div className="flex items-center gap-2 mb-4 border-b border-red-900/20 pb-2">
                     <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                     <span className="text-red-500 font-bold">SYSTEM LOGS</span>
                  </div>
                  <div className="space-y-2 text-red-100/70">
                     <p>{'>'} DETECTED VOLUME SPIKE ON <span className="text-white font-bold">BTC/USDT</span></p>
                     <p>{'>'} RSI DIVERGENCE CONFIRMED [1H TIMEFRAME]</p>
                     <p>{'>'} CALCULATING ENTRY POINTS...</p>
                     <p className="text-red-400 font-bold animate-pulse">{'>'} RECOMMENDATION: ACCUMULATE</p>
                  </div>
               </div>
            </div>

            <div className="h-80 border border-red-900/30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] rounded-xl relative overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.15)] group">
               <div className="absolute inset-0 bg-red-900/10"></div>
               {/* Animated Circles */}
               <div className="absolute w-[300px] h-[300px] border border-red-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
               <div className="absolute w-[200px] h-[200px] border border-red-500/40 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
               
               <div className="relative z-10 text-center">
                  <div className="w-24 h-24 bg-black border-2 border-red-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.5)] group-hover:scale-110 transition-transform duration-500">
                     <div className="w-16 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
                  </div>
                  <span className="text-red-500 font-bold tracking-[0.3em] text-sm animate-pulse">WATCHING MARKETS</span>
               </div>
            </div>
         </div>
      </section>

      {/* FEATURE 4: GLOBAL INTEL (RED HIGHLIGHT) */}
       <section className="py-24 px-6 border-b border-zinc-900 bg-black relative">
         <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
             <div className="w-12 h-12 bg-red-900/20 border border-red-500/50 flex items-center justify-center rounded mb-6">
               <Globe className="text-red-500" />
             </div>
             <h2 className="text-3xl font-bold mb-4">GLOBAL <span className="text-red-500">INTEL FEED</span></h2>
             <p className="text-zinc-400 max-w-2xl mb-12">
               Aggregated news from top financial sources, filtered for relevance. 
               Red-alert priority system ensures you never miss a market-moving event.
             </p>

             <div className="grid md:grid-cols-3 gap-6 w-full text-left">
                {[
                  { t: "Fed Rate Decision Looming", d: "Markets brace for impact as Powell signals potential pivot in late Q4." },
                  { t: "Bitcoin ETFs See Inflows", d: "Institutional volume hits record highs amidst supply crunch fears." },
                  { t: "Tech Sector Volatility", d: "AI regulation talks spark sell-off in semiconductor stocks." }
                ].map((item, i) => (
                  <div key={i} className="border border-red-900/20 bg-[#0a0505] p-6 hover:border-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all group cursor-pointer relative overflow-hidden rounded-xl">
                     <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-500/10 blur-3xl rounded-full group-hover:bg-red-500/20 transition-all"></div>
                     <div className="text-red-500 text-[10px] font-bold mb-3 flex items-center gap-2 tracking-widest uppercase relative z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> BREAKING NEWS
                     </div>
                     <h3 className="text-white font-bold mb-2 group-hover:text-red-400 transition-colors text-lg leading-tight relative z-10">{item.t}</h3>
                     <p className="text-zinc-500 text-sm leading-relaxed border-l-2 border-zinc-800 pl-3 mt-4 group-hover:border-red-500 block transition-colors relative z-10">{item.d}</p>
                  </div>
                ))}
             </div>
         </div>
       </section>
      
      {/* SECTION 5: SECURITY & INFRASTRUCTURE */}
      <section className="py-24 px-6 border-b border-zinc-900 bg-[#020202]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
               <div className="w-12 h-12 bg-blue-900/20 border border-blue-500/50 flex items-center justify-center rounded mb-6">
                  <Shield className="text-blue-500" />
               </div>
               <h2 className="text-3xl font-bold mb-4">INSTITUTIONAL <span className="text-blue-500">GRADE SECURITY</span></h2>
               <p className="text-zinc-400 leading-relaxed mb-6">
                 Built on a zero-trust architecture with end-to-end encryption. Your strategies and data never leave the secure enclave.
               </p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded">
                     <div className="text-blue-500 font-bold text-2xl mb-1">AES-256</div>
                     <div className="text-zinc-500 text-xs">Unbreakable Encryption</div>
                  </div>
                  <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded">
                     <div className="text-blue-500 font-bold text-2xl mb-1">99.99%</div>
                     <div className="text-zinc-500 text-xs">Uptime Guarantee</div>
                  </div>
               </div>
            </div>
            
            {/* Security Visual */}
            <div className="relative border border-zinc-800 bg-black p-8 rounded-xl overflow-hidden group">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)] opacity-50 group-hover:opacity-100 transition-opacity"></div>
               <div className="grid grid-cols-4 gap-2 relative z-10 opacity-60">
                  {[...Array(16)].map((_,i) => (
                     <div key={i} className="aspect-square bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-700 font-mono">
                        {Math.random() > 0.5 ? '1' : '0'}
                     </div>
                  ))}
               </div>
               <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="w-24 h-24 bg-black border-2 border-blue-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-pulse">
                     <Shield size={32} className="text-blue-500" />
                  </div>
               </div>
            </div>
        </div>
      </section>

      {/* SECTION 6: API INTEGRATION */}
      <section className="py-24 px-6 border-b border-zinc-900 bg-black">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
               <h2 className="text-3xl font-bold mb-4">DEV-FIRST <span className="text-purple-500">API ACCESS</span></h2>
               <p className="text-zinc-400 max-w-2xl mx-auto">
                  Connect your own Python scripts, trading bots, or custom frontends directly to our engine.
               </p>
            </div>

            <div className="bg-[#111] border border-zinc-800 p-6 rounded-lg font-mono text-sm shadow-2xl overflow-x-auto relative group">
               <div className="absolute top-4 right-4 flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-orange-500/50"></div>
               </div>
               <div className="text-purple-400 mb-4 opacity-50"># Example Python Integration</div>
               <pre className="text-zinc-300">
                  <span className="text-purple-400">import</span> quant_terminal <span className="text-purple-400">as</span> qt<br/><br/>
                  <span className="text-zinc-500"># Initialize Client</span><br/>
                  client = qt.Client(api_key=<span className="text-orange-400">"qt_sk_live_..."</span>)<br/><br/>
                  <span className="text-zinc-500"># Subscribe to Real-time Feed</span><br/>
                  <span className="text-purple-400">def</span> <span className="text-yellow-400">on_tick</span>(data):<br/>
                  &nbsp;&nbsp;signal = client.analyze_sentiment(data.symbol)<br/>
                  &nbsp;&nbsp;<span className="text-purple-400">if</span> signal.score {'>'} <span className="text-blue-400">0.8</span>:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;client.place_order(symbol=<span className="text-orange-400">"BTC-USD"</span>, side=<span className="text-orange-400">"BUY"</span>)<br/><br/>
                  client.stream.connect(on_tick)
               </pre>
               <div className="absolute bottom-6 right-6 px-4 py-2 bg-purple-900/20 text-purple-500 border border-purple-500/30 rounded text-xs font-bold tracking-widest hover:bg-purple-500 hover:text-black transition-colors cursor-pointer">
                  VIEW DOCUMENTATION
               </div>
            </div>
        </div>
      </section>

      {/* SECTION 7: MVP BETA ACCESS */}
     

      {/* PRE-FOOTER */}
      {/* <section className="py-32 px-6 bg-[#050505] border-t border-zinc-900 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.15)_0%,transparent_60%)] pointer-events-none"></div>
         <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tighter">READY TO DEPLOY?</h2>
            <Link 
                href="/terminal" 
                className="inline-block px-12 py-5 bg-orange-600 hover:bg-orange-500 text-black font-black text-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(34,197,94,0.4)] clip-path-polygon"
            >
                LAUNCH TERMINAL
            </Link>
            <p className="text-zinc-500 text-sm mt-8 font-mono">Free Access. No Credit Card Required.</p>
         </div>
      </section> */}

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-zinc-900 bg-black text-zinc-600 text-sm text-center">
         <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <div className="w-6 h-6 border border-zinc-800 flex items-center justify-center rounded overflow-hidden grayscale">
               <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold uppercase tracking-widest text-xs">QUANT<span className="text-orange-500">.TERMINAL</span></span>
         </div>
         <p className="font-mono text-[10px]">&copy; 2026 QUANT TERMINAL SYSTEMS. POWERED BY NEXT.JS 15 & TAILWIND V4.</p>
      </footer>
    </div>
  );
}


