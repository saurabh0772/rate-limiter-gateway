import { useState } from 'react';

export default function DashboardView({
  keys,
  fetching,
  fetchError,
  fetchKeys,
  revokeKey,
  revokingId,
  copyText,
  copiedPrefixId,
  copiedProxyId,
  setCopiedPrefixId,
  setCopiedProxyId,
  getProxyUrl,
  onNavigateCreateKey,
  GATEWAY_URL
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredKeys = keys.filter(k => {
    const term = searchTerm.toLowerCase();
    const nameMatch = (k.name || '').toLowerCase().includes(term);
    const urlMatch = (k.downstreamUrl || '').toLowerCase().includes(term);
    const prefixMatch = (k.keyPrefix || '').toLowerCase().includes(term);
    return nameMatch || urlMatch || prefixMatch;
  });

  const totalProcessed = keys.reduce((acc, k) => acc + (k.totalRequests || 0), 0);
  const activeKeysCount = keys.filter(k => k.isActive !== false).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">Active Keys</span>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {activeKeysCount} <span className="text-sm font-normal text-zinc-500">/ 3 allowed</span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            {3 - activeKeysCount} key slot{3 - activeKeysCount === 1 ? '' : 's'} available
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">Processed Reqs</span>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {totalProcessed.toLocaleString()}
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Total proxy traffic forwarded
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">Gateway Status</span>
          </div>
          <div className="text-xl font-bold text-white flex items-center gap-2 font-mono truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0" />
            <span className="truncate">Operational</span>
          </div>
          <p className="mt-2 text-xs text-blue-400 font-mono truncate" title={GATEWAY_URL}>
            {GATEWAY_URL}
          </p>
        </div>
      </div>

      {/* Main Keys List Container */}
      <section className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">

        {/* Section Header with Search and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
              Credentials Management
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Your Generated API Keys
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              All active keys provisioned under your account with target proxy endpoints and rate limits.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search keys..."
                className="bg-black/60 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none w-44 sm:w-56 font-mono"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
                >
                  x
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchKeys}
              disabled={fetching}
              className="text-xs px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-zinc-300 transition-all font-mono cursor-pointer disabled:opacity-50"
            >
              <span>{fetching ? 'Syncing...' : 'Sync'}</span>
            </button>

            {/* Create Key CTA */}
            <button
              onClick={onNavigateCreateKey}
              className="text-xs px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold tracking-tight transition-all shadow-md shadow-blue-500/25 cursor-pointer whitespace-nowrap"
            >
              + Create Key
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="mt-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs flex items-center justify-between">
            <span>{fetchError}</span>
            <button onClick={fetchKeys} className="underline hover:text-white font-bold ml-4">
              Try again
            </button>
          </div>
        )}

        {/* Keys List */}
        <div className="mt-6 space-y-4">
          {fetching && keys.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-mono">Loading API credentials...</p>
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 space-y-3">
              <h3 className="font-semibold text-zinc-300 text-sm">
                {searchTerm ? 'No keys match your search' : 'No API keys yet'}
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchTerm
                  ? 'Try clearing the search input to see all keys.'
                  : 'You have not generated any API keys. Create your first key to route and rate-limit your requests.'}
              </p>
              {!searchTerm && (
                <div className="pt-2">
                  <button
                    onClick={onNavigateCreateKey}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all cursor-pointer"
                  >
                    Generate your first API Key
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredKeys.map(k => {
              const proxyUrl = getProxyUrl(k.downstreamUrl);
              return (
                <div
                  key={k._id}
                  className="p-5 rounded-xl bg-black/60 border border-zinc-800 hover:border-zinc-700 transition-all space-y-4 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                          {k.name}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                          Active
                        </span>
                      </div>

                      {/* Prefix & Copy */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="font-mono text-xs text-zinc-300 tracking-wide">
                          {k.keyPrefix}••••••••••••
                        </span>
                        <button
                          onClick={() => copyText(k.keyPrefix, () => {
                            setCopiedPrefixId(k._id);
                            setTimeout(() => setCopiedPrefixId(null), 2500);
                          })}
                          className="text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors font-mono cursor-pointer"
                          title="Copy key prefix"
                        >
                          {copiedPrefixId === k._id ? 'Copied' : 'Copy Prefix'}
                        </button>
                      </div>

                      {/* Downstream target */}
                      <div className="text-xs text-zinc-500 font-mono truncate flex items-center gap-1.5 pt-0.5">
                        <span className="text-zinc-600">Proxy to:</span>
                        <span className="text-zinc-300 truncate max-w-sm sm:max-w-md" title={k.downstreamUrl}>
                          {k.downstreamUrl}
                        </span>
                      </div>
                    </div>

                    {/* Rate Limit Badge */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-mono font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {k.limit?.toLocaleString()} req/min
                      </span>
                    </div>
                  </div>

                  {/* USE IN FRONTEND (Gateway Proxy URL) */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono font-semibold text-blue-400 uppercase tracking-wider">
                        GATEWAY ENDPOINT:
                      </div>
                      <div className="font-mono text-xs text-zinc-200 truncate mt-0.5 select-all" title={proxyUrl}>
                        {proxyUrl}
                      </div>
                    </div>
                    <button
                      onClick={() => copyText(proxyUrl, () => {
                        setCopiedProxyId(k._id);
                        setTimeout(() => setCopiedProxyId(null), 2500);
                      })}
                      className={`shrink-0 text-xs px-3 py-1.5 rounded-md font-mono transition-all cursor-pointer ${
                        copiedProxyId === k._id
                          ? 'bg-emerald-500 text-black font-semibold'
                          : 'bg-blue-600/80 hover:bg-blue-600 text-white shadow-sm'
                      }`}
                    >
                      {copiedProxyId === k._id ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span>
                        Created {k.createdAt ? new Date(k.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}
                      </span>
                      <span className="text-zinc-700">•</span>
                      <span className="text-zinc-400">
                        {k.totalRequests || 0} reqs processed
                      </span>
                    </div>

                    <button
                      onClick={() => revokeKey(k._id)}
                      disabled={revokingId === k._id}
                      className="text-xs text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 active:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/20 transition-all font-medium cursor-pointer disabled:opacity-50"
                    >
                      {revokingId === k._id ? 'Revoking...' : 'Revoke'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 flex-wrap gap-2">
          <span>Pass key in header: <code className="text-blue-300 font-mono bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">x-api-key: live_...</code></span>
          <span className="font-mono text-zinc-400">Enforced with atomic Redis Token Bucket</span>
        </div>
      </section>
    </div>
  );
}
