import { useState } from 'react';

export default function GuideView({
  guideTab,
  setGuideTab,
  codeSnippets,
  copyText,
  copiedGuideSnippet,
  setCopiedGuideSnippet,
  GATEWAY_URL,
  keys = []
}) {
  const [activeModelTab, setActiveModelTab] = useState('nextjs'); // 'nextjs' | 'express'
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedNextjsCode, setCopiedNextjsCode] = useState(false);

  // Use actual key prefix if available, else placeholder
  const activeKeyPrefix = keys && keys.length > 0 && keys[0].keyPrefix ? keys[0].keyPrefix : 'live_xxx';
  const envExample = `RATE_LIMITER_API_KEY=${activeKeyPrefix}••••••••••••`;

  const nextjsMiddlewareCode = `import { NextResponse } from 'next/server';

export async function middleware(req: any) {
  const check = await fetch('https://rate-limiter-gateway-y5ff.onrender.com/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: process.env.RATE_LIMITER_API_KEY,
      ip: req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1',
      path: req.nextUrl.pathname
    })
  });

  if (check.status === 429) {
    return new Response(JSON.stringify({ error: 'Too Many Requests' }), { 
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
}`;

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
              Select your architecture below to view integration instructions and code snippets.
            </p>
          </div>

          {/* 2 Top Tabs */}
          <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1.5 rounded-xl border border-[#E5E2DA] self-start sm:self-auto">
            <button
              onClick={() => setActiveModelTab('nextjs')}
              className={`text-xs px-3.5 py-2 rounded-lg font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeModelTab === 'nextjs'
                  ? 'bg-[#C8623D] text-white shadow-2xs'
                  : 'text-[#5F6359] hover:text-[#1C1F1A]'
              }`}
            >
              <span>⚡ Next.js (Vercel)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                activeModelTab === 'nextjs' ? 'bg-[#FAF8F5]/20 text-white' : 'bg-[#EDF4EF] text-[#3F6E4E]'
              }`}>
                Recommended
              </span>
            </button>

            <button
              onClick={() => setActiveModelTab('express')}
              className={`text-xs px-3.5 py-2 rounded-lg font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeModelTab === 'express'
                  ? 'bg-[#C8623D] text-white shadow-2xs'
                  : 'text-[#5F6359] hover:text-[#1C1F1A]'
              }`}
            >
              <span>🔀 Express (Separate Backend)</span>
            </button>
          </div>
        </div>

        {/* TAB 1: NEXT.JS GUIDE */}
        {activeModelTab === 'nextjs' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Title */}
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C8623D] mb-1">
                SDK Check Model (No proxy loop)
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#1C1F1A] tracking-tight">
                Next.js Integration (For Vercel / Fullstack)
              </h3>
              <p className="text-xs sm:text-sm text-[#5F6359] mt-1">
                Protect your Next.js API routes with a single middleware file calling our low-latency SDK Check endpoint.
              </p>
            </div>

            {/* 3 Steps with Icons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#C8623D] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    01
                  </span>
                  <h4 className="font-bold text-sm text-[#1C1F1A]">Get API Key</h4>
                </div>
                <p className="text-xs text-[#5F6359] leading-relaxed">
                  Add Vercel URL in Create API Key -&gt; get <code className="text-[#1C1F1A] font-mono bg-white px-1 py-0.5 rounded border border-[#E5E2DA]">live_xxx</code>
                </p>
                <div className="text-[11px] text-[#5F6359] font-mono bg-white p-2.5 rounded-lg border border-[#E5E2DA]">
                  e.g. https://your-app.vercel.app
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#C8623D] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    02
                  </span>
                  <h4 className="font-bold text-sm text-[#1C1F1A]">Configure Environment</h4>
                </div>
                <p className="text-xs text-[#5F6359] leading-relaxed">
                  Add <code className="text-[#C8623D] font-mono bg-white px-1 py-0.5 rounded border border-[#E5E2DA]">RATE_LIMITER_API_KEY</code> to <code className="text-[#C8623D] font-mono bg-white px-1 py-0.5 rounded border border-[#E5E2DA]">.env.local</code>
                </p>
                <div className="text-[11px] text-[#3F6E4E] font-mono bg-[#EDF4EF] p-2.5 rounded-lg border border-[#C9DEC9]">
                  Keys stay secure on server runtime
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#C8623D] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    03
                  </span>
                  <h4 className="font-bold text-sm text-[#1C1F1A]">Create Middleware</h4>
                </div>
                <p className="text-xs text-[#5F6359] leading-relaxed">
                  Add this file as <code className="text-[#1C1F1A] font-mono bg-white px-1 py-0.5 rounded border border-[#E5E2DA]">middleware.ts</code> in project root (not in src)
                </p>
                <div className="text-[11px] text-[#5F6359] font-mono bg-white p-2.5 rounded-lg border border-[#E5E2DA]">
                  Intercepts all /api/:path* calls
                </div>
              </div>
            </div>

            {/* BIG and CLEAR File Path Header & Project Structure */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-[#E5E2DA] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E2DA] pb-4">
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#C8623D]">
                    Target File
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#1C1F1A] font-mono tracking-tight mt-0.5">
                    File to create: middleware.ts
                  </div>
                </div>
                <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white border border-[#E5E2DA] text-[#5F6359]">
                  Next.js App / Pages Router
                </div>
              </div>

              <div className="text-xs text-[#5F6359] font-medium">
                Location: Add this file as <strong className="text-[#1C1F1A] font-mono">middleware.ts</strong> in <strong className="text-[#1C1F1A]">project root (not in src)</strong>.
              </div>

              {/* Example Folder Structure Box */}
              <div className="rounded-xl border border-[#333830] bg-[#1C1F1A] p-4 text-xs font-mono text-[#FAF8F5]">
                <div className="text-[#A8ABA4] pb-2 border-b border-[#333830] text-[11px]">
                  Project Directory Structure:
                </div>
                <pre className="mt-2 text-[#FAF8F5] leading-relaxed select-all">
{`my-app/
├── package.json
├── middleware.ts  <-- CREATE HERE (PROJECT ROOT, NOT IN SRC)
├── app/
└── .env.local`}
                </pre>
              </div>
            </div>

            {/* .env.local example */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1 min-w-0">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#5F6359]">
                  .env.local Example (Variable: RATE_LIMITER_API_KEY)
                </span>
                <div className="font-mono text-xs text-[#1C1F1A] font-semibold select-all truncate">
                  {envExample}
                </div>
              </div>
              <button
                onClick={() => copyText(envExample, setCopiedEnv)}
                className={`text-xs px-3.5 py-2 rounded-lg font-mono font-semibold transition-all cursor-pointer shrink-0 ${
                  copiedEnv
                    ? 'bg-[#3F6E4E] text-white'
                    : 'bg-white hover:bg-[#F2F0E8] text-[#1C1F1A] border border-[#E5E2DA]'
                }`}
              >
                {copiedEnv ? 'Copied .env' : 'Copy .env'}
              </button>
            </div>

            {/* Backend HTTP 429 status callout */}
            <div className="p-4 rounded-xl bg-[#EDF4EF] border border-[#C9DEC9] flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-[#3F6E4E] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                ✓
              </span>
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#2A4C36]">
                  Native HTTP 429 Status Check
                </div>
                <p className="text-xs text-[#3F6E4E] leading-relaxed">
                  The backend now correctly returns <strong>HTTP 429</strong> when rate limited, so this simple status check (<code className="bg-white/80 px-1 py-0.5 rounded text-[#2A4C36] font-mono font-bold">check.status === 429</code>) is sufficient without needing to parse or check response body flags.
                </p>
              </div>
            </div>

            {/* Code Snippet Box (middleware.ts) */}
            <div className="rounded-xl border border-[#333830] bg-[#1C1F1A] overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between px-4 py-3 bg-[#161914] border-b border-[#333830]">
                <div className="text-xs font-mono text-[#E5E2DA] font-medium flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8623D] inline-block" />
                  <span>File: middleware.ts</span>
                </div>

                <button
                  onClick={() => copyText(nextjsMiddlewareCode, setCopiedNextjsCode)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    copiedNextjsCode
                      ? 'bg-[#3F6E4E] text-white font-bold'
                      : 'bg-[#C8623D] hover:bg-[#B95431] text-white'
                  }`}
                >
                  {copiedNextjsCode ? 'Code Copied' : 'Copy Snippet'}
                </button>
              </div>

              <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono text-[#FAF8F5] overflow-x-auto leading-relaxed select-all">
                <code>{nextjsMiddlewareCode}</code>
              </pre>

              <div className="px-4 py-3 bg-[#161914] border-t border-[#333830] flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-[#E5E2DA] gap-2">
                <div>
                  <span className="text-[#A8ABA4]">Endpoint: </span>
                  <span className="text-[#EDF4EF] font-semibold select-all">https://rate-limiter-gateway-y5ff.onrender.com/api/check</span>
                </div>
                <div className="text-[11px] text-[#A8ABA4]">
                  Returns HTTP 429 when rate limited &bull; Execution latency &lt; 20ms
                </div>
              </div>
            </div>

            {/* Note at bottom */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] text-[#5F6359] text-xs flex items-center gap-2.5 font-medium">
              <span className="font-mono font-bold uppercase text-[11px] px-1.5 py-0.5 rounded bg-white border border-[#E5E2DA] text-[#1C1F1A]">Analytics</span>
              <span>Your requests will appear in Analytics dashboard under this API key</span>
            </div>
          </div>
        )}

        {/* TAB 2: EXPRESS GUIDE (Proxy Model) */}
        {activeModelTab === 'express' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Title */}
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5F6359] mb-1">
                Reverse Proxy Model
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#1C1F1A] tracking-tight">
                Express &amp; Upstream API Integration (Proxy Model)
              </h3>
              <p className="text-xs sm:text-sm text-[#5F6359] mt-1">
                Point your frontend client or API consumers to Gateway URL <code className="font-mono text-[#C8623D] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E5E2DA]">{GATEWAY_URL}/api/[project]/</code> as your upstream reverse proxy.
              </p>
            </div>

            {/* Code Snippet Tabs */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E5E2DA] self-start">
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

            {/* 3 Step Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-[#C8623D] text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    01
                  </span>
                  <h3 className="font-bold text-sm text-[#1C1F1A]">Create an API Key</h3>
                </div>
                <p className="text-xs text-[#5F6359] leading-relaxed">
                  Provide your backend API URL (e.g. <code className="text-[#1C1F1A] font-mono bg-white px-1 py-0.5 rounded border border-[#E5E2DA]">https://api.mybackend.com</code>) and set your desired rate limit from 1 to 20,000 req/min.
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

            {/* Interactive Code Snippet Box for Proxy */}
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
          </div>
        )}
      </section>
    </div>
  );
}
