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
    <div className="space-y-10 animate-in fade-in duration-150">
      {/* Creation Card */}
      <section className="bg-white border border-[#E5E2DA] rounded-2xl p-6 sm:p-8 shadow-2xs relative">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E2DA] mb-6">
          <div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#F2F0E8] text-[#5F6359] border border-[#E5E2DA] mb-2">
              Key Provisioning
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1F1A] tracking-tight flex items-center gap-2">
              Create New API Key
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6359] mt-1">
              Configure your upstream server endpoint and assign token bucket rate limits from 1 to 20,000 req/min.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[#F2F0E8] text-[#1C1F1A] border border-[#E5E2DA]">
              {keys.length}/3 keys used
            </span>
          </div>
        </div>

        {createError && (
          <div className="mb-6 p-4 rounded-xl bg-[#FDF2F0] border border-[#F5C7C3] text-[#B33B32] text-xs flex items-start gap-2 font-mono">
            <span className="font-semibold">[Error]</span>
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={createKey} className="space-y-6 max-w-3xl">
          {/* Key Name Input */}
          <div>
            <label className="block text-xs font-semibold text-[#5F6359] uppercase tracking-wider mb-2">
              Key Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Production Backend, Mobile App Client"
              className="w-full bg-[#FAF8F5] border border-[#E5E2DA] focus:border-[#C8623D] focus:ring-1 focus:ring-[#C8623D] rounded-xl px-4 py-3 text-sm text-[#1C1F1A] placeholder:text-[#5F6359]/60 outline-none transition-all"
            />
          </div>

          {/* Downstream Backend URL Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-[#5F6359] uppercase tracking-wider">
                Backend Target URL
              </label>
              <span className="text-[11px] text-[#5F6359] font-mono">Must use HTTPS</span>
            </div>
            <input
              type="url"
              required
              value={form.downstreamUrl}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://api.mybackend.com"
              className={`w-full bg-[#FAF8F5] border ${
                urlWarning ? 'border-[#F5C7C3] focus:border-[#B33B32]' : 'border-[#E5E2DA] focus:border-[#C8623D]'
              } focus:ring-1 focus:ring-[#C8623D] rounded-xl px-4 py-3 text-sm text-[#1C1F1A] placeholder:text-[#5F6359]/60 outline-none transition-all font-mono`}
            />
            {urlWarning && (
              <p className="mt-1.5 text-xs text-[#945D18] flex items-center gap-1 font-mono">
                <span>[Warning]</span> {urlWarning}
              </p>
            )}
            {form.downstreamUrl && !urlWarning && (
              <p className="mt-1.5 text-xs text-[#5F6359] font-mono truncate">
                Gateway proxy will route to: <span className="text-[#1C1F1A] font-medium">{getProxyUrl(form.downstreamUrl)}</span>
              </p>
            )}
          </div>

          {/* Rate Limit Slider & Custom Type Input (Synced Both) */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#5F6359] uppercase tracking-wider">
                  Rate Limit
                </span>
                <p className="text-[11px] text-[#5F6359] mt-0.5">
                  Adjust slider or type direct custom integer
                </p>
              </div>

              {/* Synchronized Custom Number Input Box */}
              <div className="flex items-center gap-1.5 bg-white border border-[#E5E2DA] hover:border-[#C8623D]/50 focus-within:border-[#C8623D] focus-within:ring-1 focus-within:ring-[#C8623D] rounded-lg px-2.5 py-1.5 transition-all shadow-2xs">
                <span className="text-xs text-[#5F6359] font-mono">[</span>
                <input
                  type="number"
                  min="1"
                  max="20000"
                  value={form.limit}
                  onChange={handleLimitInputChange}
                  onBlur={handleLimitInputBlur}
                  className="w-16 bg-transparent text-right font-mono text-sm text-[#1C1F1A] font-bold outline-none"
                  placeholder="100"
                />
                <span className="text-xs text-[#5F6359] font-mono">] req/min</span>
              </div>
            </div>

            {/* Huge numeric display */}
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-4xl font-extrabold text-[#1C1F1A] font-mono tracking-tight">
                {currentNumericLimit.toLocaleString()}
              </span>
              <span className="text-xs text-[#5F6359] font-semibold tracking-wider uppercase">
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
                  background: `linear-gradient(to right, #C8623D 0%, #C8623D ${sliderPercent}%, #E5E2DA ${sliderPercent}%, #E5E2DA 100%)`
                }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between items-center text-[10px] text-[#5F6359] font-mono mt-1">
                <span>1 req/min</span>
                <span>10,000</span>
                <span>20,000 req/min</span>
              </div>
            </div>

            {/* Quick Preset Pills */}
            <div className="pt-2">
              <span className="block text-[10px] font-semibold text-[#5F6359] uppercase tracking-wider mb-2">
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
                        ? 'bg-[#C8623D] text-white font-semibold shadow-2xs'
                        : 'bg-white hover:bg-[#F2F0E8] text-[#5F6359] hover:text-[#1C1F1A] border border-[#E5E2DA]'
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
            className="w-full sm:w-auto bg-[#C8623D] hover:bg-[#B95431] active:scale-[0.99] text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all duration-150 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 border border-[#B95431]/20"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating secure key...</span>
              </>
            ) : keys.length >= 3 ? (
              <span>Plan Limit Reached (3/3 Keys)</span>
            ) : (
              <span>Generate API Key</span>
            )}
          </button>
        </form>
      </section>

      {/* Past Generated Keys Section */}
      <section className="bg-white border border-[#E5E2DA] rounded-2xl p-6 sm:p-8 shadow-2xs relative">
        <div className="flex items-center justify-between pb-5 border-b border-[#E5E2DA] mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#1C1F1A] tracking-tight flex items-center gap-2">
              Your Past Generated Keys
            </h3>
            <p className="text-xs text-[#5F6359] mt-0.5">
              Reference list of keys created on this account
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#F2F0E8] text-[#5F6359] border border-[#E5E2DA]">
            {keys.length} total
          </span>
        </div>

        {keys.length === 0 ? (
          <div className="py-8 text-center text-[#5F6359] text-xs font-mono">
            No past keys found. Create your first key above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keys.map(k => {
              const proxyUrl = getProxyUrl(k.downstreamUrl);
              return (
                <div
                  key={k._id}
                  className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] hover:border-[#C8623D]/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-[#1C1F1A] text-sm truncate">{k.name}</div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-mono text-xs text-[#5F6359]">{k.keyPrefix}••••••••</span>
                        <button
                          onClick={() => copyText(k.keyPrefix, () => {
                            setCopiedPrefixId(k._id);
                            setTimeout(() => setCopiedPrefixId(null), 2500);
                          })}
                          className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer font-mono transition-colors ${
                            copiedPrefixId === k._id
                              ? 'bg-[#3F6E4E] text-white border-[#3F6E4E]'
                              : 'text-[#5F6359] hover:text-[#1C1F1A] bg-white border-[#E5E2DA]'
                          }`}
                        >
                          {copiedPrefixId === k._id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white text-[#1C1F1A] border border-[#E5E2DA] shadow-2xs">
                      {k.limit?.toLocaleString()} req/min
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-[#5F6359] truncate">
                    Target: <span className="text-[#1C1F1A] font-medium">{k.downstreamUrl}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-[#E5E2DA] flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-[#1C1F1A] truncate font-medium">{proxyUrl}</span>
                    <button
                      onClick={() => copyText(proxyUrl, () => {
                        setCopiedProxyId(k._id);
                        setTimeout(() => setCopiedProxyId(null), 2500);
                      })}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer font-mono shrink-0 transition-colors ${
                        copiedProxyId === k._id
                          ? 'bg-[#3F6E4E] text-white'
                          : 'bg-[#F2F0E8] hover:bg-[#E5E2DA] text-[#1C1F1A] border border-[#E5E2DA]'
                      }`}
                    >
                      {copiedProxyId === k._id ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#5F6359] pt-1 border-t border-[#E5E2DA]">
                    <span>{k.totalRequests || 0} reqs</span>
                    <button
                      onClick={() => revokeKey(k._id)}
                      disabled={revokingId === k._id}
                      className="text-[#B33B32] hover:underline text-xs cursor-pointer disabled:opacity-50"
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
