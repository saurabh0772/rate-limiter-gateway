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
    <div className="space-y-8 animate-in fade-in duration-150">
      <section className="bg-white border border-[#E5E2DA] rounded-2xl p-6 sm:p-8 shadow-2xs relative">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E5E2DA]">
          <div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#F2F0E8] text-[#5F6359] border border-[#E5E2DA] mb-2">
              Integration Documentation
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1F1A] tracking-tight flex items-center gap-2">
              Implementation Guide
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6359] mt-1">
              Drop our rate-limiting proxy in front of your upstream APIs with zero configuration changes to your backend.
            </p>
          </div>

          {/* Code Snippet Tabs */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E5E2DA] self-start sm:self-auto">
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
                    ? 'bg-white text-[#1C1F1A] shadow-2xs font-semibold'
                    : 'text-[#5F6359] hover:text-[#1C1F1A]'
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
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-[#C8623D] text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0 shadow-2xs">
                01
              </span>
              <h3 className="font-bold text-sm text-[#1C1F1A]">Create an API Key</h3>
            </div>
            <p className="text-xs text-[#5F6359] leading-relaxed">
              Provide your upstream backend target URL (e.g. <code className="text-[#1C1F1A] font-mono bg-white px-1 py-0.5 rounded border border-[#E5E2DA]">https://api.mybackend.com</code>) and set your desired rate limit from 1 to 20,000 req/min.
            </p>
            <div className="text-[11px] text-[#5F6359] font-mono bg-white p-2.5 rounded-lg border border-[#E5E2DA]">
              Copy your raw key immediately upon generation — it is only shown once.
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-[#C8623D] text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0 shadow-2xs">
                02
              </span>
              <h3 className="font-bold text-sm text-[#1C1F1A]">Route Through Gateway</h3>
            </div>
            <p className="text-xs text-[#5F6359] leading-relaxed">
              Point client requests to the Gateway proxy host instead of your upstream server directly, and pass your API key in the headers.
            </p>
            <div className="text-[11px] font-mono bg-white p-2.5 rounded-lg border border-[#E5E2DA] space-y-1.5 leading-relaxed">
              <div className="text-[#B33B32] line-through truncate">
                // Direct: https://api.mybackend.com/posts
              </div>
              <div className="text-[#3F6E4E] font-semibold truncate">
                // Proxy: {GATEWAY_URL}/posts
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-[#C8623D] text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0 shadow-2xs">
                03
              </span>
              <h3 className="font-bold text-sm text-[#1C1F1A]">Handle Rate Limit (429)</h3>
            </div>
            <p className="text-xs text-[#5F6359] leading-relaxed">
              When limits are exceeded, our gateway returns <code className="text-[#945D18] font-mono bg-[#FDF8EE] border border-[#F3E0BA] px-1 py-0.5 rounded">HTTP 429 Too Many Requests</code> with remaining token headers.
            </p>
            <div className="text-[11px] font-mono bg-white p-2.5 rounded-lg border border-[#E5E2DA] text-[#5F6359]">
              <div>Response Headers:</div>
              <div className="text-[#1C1F1A] font-semibold mt-0.5">X-RateLimit-Limit: 100</div>
              <div className="text-[#1C1F1A] font-semibold">X-RateLimit-Remaining: 0</div>
            </div>
          </div>
        </div>

        {/* Interactive Code Snippet Box */}
        <div className="rounded-xl border border-[#333830] bg-[#1C1F1A] overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between px-4 py-3 bg-[#161914] border-b border-[#333830]">
            <div className="text-xs font-mono text-[#E5E2DA] font-medium">
              {guideTab === 'fetch' ? 'api-client.js (Native Fetch)' : guideTab === 'axios' ? 'api-service.js (Axios)' : 'terminal (cURL)'}
            </div>

            <button
              onClick={() => copyText(codeSnippets[guideTab], setCopiedGuideSnippet)}
              className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                copiedGuideSnippet
                  ? 'bg-[#3F6E4E] text-white font-bold'
                  : 'bg-[#C8623D] hover:bg-[#B95431] text-white'
              }`}
            >
              {copiedGuideSnippet ? 'Command Copied' : 'Copy Snippet'}
            </button>
          </div>

          <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono text-[#FAF8F5] overflow-x-auto leading-relaxed select-all">
            <code>{codeSnippets[guideTab]}</code>
          </pre>

          {/* Environment note below code */}
          <div className="px-4 py-3 bg-[#161914] border-t border-[#333830] flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-[#E5E2DA] gap-2">
            <div>
              <span className="text-[#A8ABA4]">Production Host: </span>
              <span className="text-[#EDF4EF] font-semibold select-all">{GATEWAY_URL}</span>
            </div>
            <div className="text-[11px] text-[#A8ABA4]">
              Local Development: <span className="text-[#FAF8F5] select-all">http://localhost:3000</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
