export default function GuideView({
  guideTab,
  setGuideTab,
  codeSnippets,
  copyText,
  copiedGuideSnippet,
  setCopiedGuideSnippet,
  GATEWAY_URL
}) {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <section className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-800/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
              Developer Integration Guide
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              How to use in your project
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Drop our rate-limiting proxy in front of your upstream APIs with zero configuration changes to your backend.
            </p>
          </div>

          {/* Code Snippet Tabs */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-zinc-800/80 self-start sm:self-auto font-mono">
            {[
              { id: 'fetch', label: 'JavaScript (Fetch)' },
              { id: 'axios', label: 'Axios' },
              { id: 'curl', label: 'cURL' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setGuideTab(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  guideTab === tab.id
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/25'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Step 1 */}
          <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">01</span>
              <h3 className="font-bold text-sm text-white">Create an API Key</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Provide your upstream backend target URL (e.g. <code className="text-blue-300 font-mono bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded">https://api.mybackend.com</code>) and set your desired rate limit from 1 to 20,000 req/min.
            </p>
            <div className="text-[11px] text-blue-300/90 font-mono bg-blue-950/20 p-2.5 rounded-lg border border-blue-900/30">
              <span className="text-blue-400 font-semibold">[Note]</span> Copy your raw key immediately — it's only shown once.
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">02</span>
              <h3 className="font-bold text-sm text-white">Replace with Gateway URL</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Point your frontend calls to the Gateway host instead of calling your upstream backend directly, and attach your API key in headers.
            </p>
            <div className="text-[11px] font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-1.5 leading-relaxed">
              <div className="text-rose-400/80 line-through truncate">
                // Before: https://api.mybackend.com/posts &nbsp;&lt;- Your original backend
              </div>
              <div className="text-emerald-400 font-semibold truncate">
                // After: {GATEWAY_URL}/posts &nbsp;&lt;- Use OUR Gateway
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">03</span>
              <h3 className="font-bold text-sm text-white">Handle Rate Limit (429)</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              When limits are exceeded, our gateway returns <code className="text-amber-300 font-mono bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">HTTP 429 Too Many Requests</code> with remaining token headers.
            </p>
            <div className="text-[11px] font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-zinc-400">
              Headers returned:
              <div className="text-blue-300 font-semibold mt-0.5">X-RateLimit-Limit: 100</div>
              <div className="text-amber-400 font-semibold">X-RateLimit-Remaining: 0</div>
            </div>
          </div>
        </div>

        {/* Interactive Code Snippet Box */}
        <div className="rounded-xl border border-zinc-800 bg-black/70 overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 text-zinc-200 font-semibold">
                {guideTab === 'fetch' ? 'api-client.js (Native Fetch)' : guideTab === 'axios' ? 'api-service.js (Axios)' : 'terminal (cURL)'}
              </span>
            </div>

            <button
              onClick={() => copyText(codeSnippets[guideTab], setCopiedGuideSnippet)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                copiedGuideSnippet
                  ? 'bg-emerald-500 text-black font-semibold'
                  : 'bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-500/25'
              }`}
            >
              {copiedGuideSnippet ? 'Copied' : 'Copy Snippet'}
            </button>
          </div>

          <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono text-zinc-200 overflow-x-auto leading-relaxed select-all">
            <code>{codeSnippets[guideTab]}</code>
          </pre>

          {/* Environment note below code */}
          <div className="px-4 py-3 bg-zinc-950 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-zinc-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] inline-block" />
              <span className="text-zinc-400 font-semibold">Production:</span>
              <span className="text-emerald-400 font-semibold select-all font-mono">Use {GATEWAY_URL}</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Local dev: <span className="text-blue-400 select-all font-mono">Use http://localhost:3000</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
