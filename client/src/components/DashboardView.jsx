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
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white border border-[#E5E2DA] shadow-2xs relative">
          <div className="flex items-center justify-between text-[#5F6359] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Keys</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1F1A] font-mono">
            {activeKeysCount} <span className="text-sm font-normal text-[#5F6359]">/ 3 allowed</span>
          </div>
          <p className="mt-2 text-xs text-[#5F6359]">
            {3 - activeKeysCount} key slot{3 - activeKeysCount === 1 ? '' : 's'} available
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E2DA] shadow-2xs relative">
          <div className="flex items-center justify-between text-[#5F6359] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Processed Reqs</span>
          </div>
          <div className="text-3xl font-extrabold text-[#1C1F1A] font-mono">
            {totalProcessed.toLocaleString()}
          </div>
          <p className="mt-2 text-xs text-[#5F6359]">
            Total traffic processed
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E2DA] shadow-2xs relative">
          <div className="flex items-center justify-between text-[#5F6359] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gateway Status</span>
          </div>
          <div className="text-xl font-bold text-[#1C1F1A] flex items-center gap-2 font-mono truncate">
            <span>Operational</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-[#EDF4EF] text-[#3F6E4E] border border-[#C9DEC9]">
              Healthy
            </span>
          </div>
          <p className="mt-2 text-xs text-[#5F6359] font-mono truncate" title={GATEWAY_URL}>
            {GATEWAY_URL}
          </p>
        </div>
      </div>

      {/* Main Keys List Container */}
      <section className="bg-white border border-[#E5E2DA] rounded-2xl p-6 sm:p-8 shadow-2xs relative">
        {/* Section Header with Search and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E2DA]">
          <div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#F2F0E8] text-[#5F6359] border border-[#E5E2DA] mb-2">
              Credentials Management
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1F1A] tracking-tight flex items-center gap-2">
              Your Generated API Keys
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6359] mt-1">
              Active API keys provisioned under your account with configured project targets and rate limits.
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
                className="bg-[#FAF8F5] border border-[#E5E2DA] focus:border-[#C8623D] focus:ring-1 focus:ring-[#C8623D] rounded-xl px-3.5 py-2 text-xs text-[#1C1F1A] placeholder:text-[#5F6359]/60 outline-none w-44 sm:w-56 font-mono transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F6359] hover:text-[#1C1F1A] text-xs cursor-pointer font-mono"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchKeys}
              disabled={fetching}
              className="text-xs px-3 py-2 rounded-xl bg-[#F2F0E8] hover:bg-[#E5E2DA] active:scale-95 border border-[#E5E2DA] text-[#1C1F1A] transition-all font-mono cursor-pointer disabled:opacity-50"
            >
              <span>{fetching ? 'Syncing...' : 'Sync'}</span>
            </button>

            {/* Create Key CTA */}
            <button
              onClick={onNavigateCreateKey}
              className="text-xs px-3.5 py-2 rounded-xl bg-[#C8623D] hover:bg-[#B95431] text-white font-semibold tracking-tight transition-all cursor-pointer whitespace-nowrap shadow-2xs border border-[#B95431]/20"
            >
              + Create Key
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="mt-6 p-4 rounded-xl bg-[#FDF2F0] border border-[#F5C7C3] text-[#B33B32] text-xs flex items-center justify-between font-mono">
            <span>{fetchError}</span>
            <button onClick={fetchKeys} className="underline hover:text-[#1C1F1A] font-bold ml-4 cursor-pointer">
              Try again
            </button>
          </div>
        )}

        {/* Keys List */}
        <div className="mt-6 space-y-4">
          {fetching && keys.length === 0 ? (
            <div className="py-16 text-center text-[#5F6359] space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#C8623D] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-mono">Loading API credentials...</p>
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="py-16 text-center text-[#5F6359] space-y-3">
              <h3 className="font-semibold text-[#1C1F1A] text-sm">
                {searchTerm ? 'No keys match your search' : 'No API keys yet'}
              </h3>
              <p className="text-xs text-[#5F6359] max-w-sm mx-auto">
                {searchTerm
                  ? 'Try clearing the search input to see all keys.'
                  : 'You have not generated any API keys. Create your first key to start protecting your APIs.'}
              </p>
              {!searchTerm && (
                <div className="pt-2">
                  <button
                    onClick={onNavigateCreateKey}
                    className="px-4 py-2 rounded-xl bg-[#C8623D] hover:bg-[#B95431] text-white font-semibold text-xs transition-all cursor-pointer shadow-2xs border border-[#B95431]/20"
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
                  className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] hover:border-[#C8623D]/40 transition-all space-y-4 group"
                >
                  {/* Top Key Info Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-[#1C1F1A] text-sm sm:text-base tracking-tight truncate">
                          {k.name}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#EDF4EF] text-[#3F6E4E] border border-[#C9DEC9]">
                          Active
                        </span>
                      </div>

                      {/* API Key with Copy Button */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="font-mono text-xs text-[#5F6359] tracking-wide">
                          {k.keyPrefix}••••••••••••
                        </span>
                        <button
                          onClick={() => copyText(k.keyPrefix, () => {
                            setCopiedPrefixId(k._id);
                            setTimeout(() => setCopiedPrefixId(null), 2500);
                          })}
                          className={`text-[11px] px-2 py-0.5 rounded border transition-colors font-mono cursor-pointer ${
                            copiedPrefixId === k._id
                              ? 'bg-[#3F6E4E] text-white border-[#3F6E4E]'
                              : 'text-[#5F6359] hover:text-[#1C1F1A] bg-white hover:bg-[#F2F0E8] border-[#E5E2DA]'
                          }`}
                          title="Copy API key prefix"
                        >
                          {copiedPrefixId === k._id ? 'Copied' : 'Copy Key'}
                        </button>
                      </div>

                      {/* Project URL */}
                      <div className="text-xs text-[#5F6359] font-mono truncate flex items-center gap-1.5 pt-0.5">
                        <span className="text-[#5F6359]">Project URL:</span>
                        <span className="text-[#1C1F1A] truncate max-w-sm sm:max-w-md font-medium" title={k.downstreamUrl}>
                          {k.downstreamUrl}
                        </span>
                      </div>
                    </div>

                    {/* Rate Limit Badge */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-mono font-semibold bg-white text-[#1C1F1A] border border-[#E5E2DA] shadow-2xs">
                        {k.limit?.toLocaleString()} req/min
                      </span>
                    </div>
                  </div>

                  {/* Gateway Proxy Endpoint */}
                  <div className="p-3 rounded-lg bg-white border border-[#E5E2DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono font-semibold text-[#5F6359] uppercase tracking-wider">
                        GATEWAY ENDPOINT
                      </div>
                      <div className="font-mono text-xs text-[#1C1F1A] truncate mt-0.5 select-all font-semibold" title={proxyUrl}>
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
                          ? 'bg-[#3F6E4E] text-white font-semibold'
                          : 'bg-[#F2F0E8] hover:bg-[#E5E2DA] text-[#1C1F1A] border border-[#E5E2DA]'
                      }`}
                    >
                      {copiedProxyId === k._id ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-2 border-t border-[#E5E2DA] flex items-center justify-between text-[11px] text-[#5F6359] flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span>
                        Created {k.createdAt ? new Date(k.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}
                      </span>
                      <span>/</span>
                      <span>
                        {k.totalRequests || 0} reqs processed
                      </span>
                    </div>

                    <button
                      onClick={() => revokeKey(k._id)}
                      disabled={revokingId === k._id}
                      className="text-xs text-[#B33B32] hover:bg-[#FDF2F0] active:bg-[#FDF2F0] px-2.5 py-1 rounded-lg border border-[#F5C7C3] transition-all font-medium cursor-pointer disabled:opacity-50"
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
        <div className="mt-8 pt-4 border-t border-[#E5E2DA] flex items-center justify-between text-xs text-[#5F6359] flex-wrap gap-2">
          <span>Need integration code? Check the <strong className="text-[#1C1F1A]">How to Use Guide</strong> tab above.</span>
          <span className="font-mono">Enforced with atomic Redis Token Bucket</span>
        </div>
      </section>
    </div>
  );
}
