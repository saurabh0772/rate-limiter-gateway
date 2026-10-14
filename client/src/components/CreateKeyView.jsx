export default function CreateKeyView({
  form,
  setForm,
  handleUrlChange,
  urlWarning,
  handleLimitInputChange,
  handleLimitInputBlur,
  sliderPercent,
  currentNumericLimit,
  createKey,
  createError,
  loading,
  keys,
  getProxyUrl,
  copyText,
  copiedPrefixId,
  copiedProxyId,
  setCopiedPrefixId,
  setCopiedProxyId,
  revokeKey,
  revokingId
}) {
  return (
    <div className="space-y-10 animate-in fade-in duration-200">
      {/* Creation Card */}
      <section className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-purple-500 opacity-80" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
              Key Generation Wizard
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Create New API Key
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Configure your upstream server endpoint and assign token bucket rate limits from 1 to 20,000 req/min.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
              {keys.length}/3 keys used
            </span>
          </div>
        </div>

        {createError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
            <span className="font-bold">Error:</span>
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={createKey} className="space-y-6 max-w-3xl">
          {/* Key Name Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Key Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Production Backend, Mobile App Client"
              className="w-full bg-black/60 border border-zinc-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all"
            />
          </div>

          {/* Downstream Backend URL Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Backend Target URL
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">Must use HTTPS</span>
            </div>
            <input
              type="url"
              required
              value={form.downstreamUrl}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://api.mybackend.com"
              className={`w-full bg-black/60 border ${
                urlWarning ? 'border-amber-500/70 focus:border-amber-500' : 'border-zinc-800 focus:border-indigo-500/80'
              } focus:ring-1 focus:ring-indigo-500/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all font-mono`}
            />
            {urlWarning && (
              <p className="mt-1.5 text-xs text-amber-400 flex items-center gap-1 font-medium">
                <span>⚠️</span> {urlWarning}
              </p>
            )}
            {form.downstreamUrl && !urlWarning && (
              <p className="mt-1.5 text-xs text-zinc-500 font-mono truncate">
                Gateway proxy will route to: <span className="text-zinc-300">{getProxyUrl(form.downstreamUrl)}</span>
              </p>
            )}
          </div>

          {/* Rate Limit Slider & Custom Type Input (Synced Both) */}
          <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Rate Limit
                </span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Adjust slider or type direct custom integer
                </p>
              </div>

              {/* Synchronized Custom Number Input Box */}
              <div className="flex items-center gap-1.5 bg-black/80 border border-zinc-700/80 hover:border-zinc-600 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 rounded-lg px-2.5 py-1.5 transition-all">
                <span className="text-xs text-zinc-500 font-mono">[</span>
                <input
                  type="number"
                  min="1"
                  max="20000"
                  value={form.limit}
                  onChange={handleLimitInputChange}
                  onBlur={handleLimitInputBlur}
                  className="w-16 bg-transparent text-right font-mono text-sm text-indigo-300 font-bold outline-none focus:text-white"
                  placeholder="100"
                />
                <span className="text-xs text-zinc-500 font-mono">] req/min</span>
              </div>
            </div>

            {/* Huge numeric display */}
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
                {currentNumericLimit.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase">
                REQ / MIN
              </span>
            </div>

            {/* Custom Range Slider with Dynamic Track Fill */}
            <div className="pt-2">
              <input
                type="range"
                min="1"
                max="20000"
                step="1"
                value={currentNumericLimit}
                onChange={e => setForm({ ...form, limit: Number(e.target.value) })}
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #a855f7 ${sliderPercent}%, #27272a ${sliderPercent}%, #27272a 100%)`
                }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-1">
                <span>1 req/min</span>
                <span>10,000</span>
                <span>20,000 req/min</span>
              </div>
            </div>

            {/* Quick Preset Pills */}
            <div className="pt-2">
              <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '10/min', val: 10 },
                  { label: '50/min', val: 50 },
                  { label: '100/min', val: 100 },
                  { label: '500/min', val: 500 },
                  { label: '1k/min', val: 1000 },
                  { label: '5k/min', val: 5000 },
                  { label: '20k/min', val: 20000 }
                ].map(preset => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setForm({ ...form, limit: preset.val })}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      currentNumericLimit === preset.val
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                        : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || keys.length >= 3}
            className="w-full sm:w-auto bg-white hover:bg-zinc-200 active:scale-[0.99] text-black font-bold px-8 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-xl shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Generating secure key...</span>
              </>
            ) : keys.length >= 3 ? (
              <span>Plan Limit Reached (3/3 Keys)</span>
            ) : (
              <span>Generate API Key →</span>
            )}
          </button>
        </form>
      </section>

      {/* Past Generated Keys Section */}
      <section className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-5 border-b border-zinc-800/80 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Your Past Generated Keys
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Reference list of keys created on this account
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            {keys.length} total
          </span>
        </div>

        {keys.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs font-mono">
            No past keys found. Create your first key above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keys.map(k => {
              const proxyUrl = getProxyUrl(k.downstreamUrl);
              return (
                <div
                  key={k._id}
                  className="p-4 rounded-xl bg-black/50 border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-sm truncate">{k.name}</div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-mono text-xs text-zinc-400">{k.keyPrefix}••••••••</span>
                        <button
                          onClick={() => copyText(k.keyPrefix, () => {
                            setCopiedPrefixId(k._id);
                            setTimeout(() => setCopiedPrefixId(null), 2500);
                          })}
                          className="text-[10px] text-zinc-500 hover:text-zinc-200 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/40 cursor-pointer"
                        >
                          {copiedPrefixId === k._id ? '✓' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      ⚡ {k.limit?.toLocaleString()}/min
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-zinc-500 truncate">
                    Target: <span className="text-zinc-400">{k.downstreamUrl}</span>
                  </div>

                  <div className="p-2 rounded bg-zinc-950 border border-indigo-500/20 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-zinc-300 truncate">{proxyUrl}</span>
                    <button
                      onClick={() => copyText(proxyUrl, () => {
                        setCopiedProxyId(k._id);
                        setTimeout(() => setCopiedProxyId(null), 2500);
                      })}
                      className="text-[10px] px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 cursor-pointer font-mono shrink-0"
                    >
                      {copiedProxyId === k._id ? '✓ Copied' : 'Copy URL'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                    <span>{k.totalRequests || 0} reqs</span>
                    <button
                      onClick={() => revokeKey(k._id)}
                      disabled={revokingId === k._id}
                      className="text-red-400 hover:text-red-300 text-xs cursor-pointer disabled:opacity-50"
                    >
                      {revokingId === k._id ? 'Revoking...' : 'Revoke'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
