import { useState } from 'react';

export default function AnalyticsView({
  analyticsSummary,
  timeseriesData,
  logs,
  anomaliesData,
  dismissedAnomaly,
  setDismissedAnomaly,
  analyticsPeriod,
  setAnalyticsPeriod,
  analyticsAutoRefresh,
  setAnalyticsAutoRefresh,
  fetchAnalytics,
  loadingAnalytics,
  logFilter,
  setLogFilter,
  logSearch,
  setLogSearch,
  formatLogTime,
  getMethodBadge,
  getStatusBadge,
  keys,
  copyText,
  GATEWAY_URL
}) {
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [copiedLogCurl, setCopiedLogCurl] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Step 3: Analytics & Anomaly Detection Section */}
      <section className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-8">
        {/* Anomaly Detection Banner if triggered */}
        {anomaliesData.hasAnomaly && !dismissedAnomaly && anomaliesData.anomalies?.length > 0 && (
          <div className="p-4 sm:p-5 rounded-xl bg-zinc-900 border border-red-500/30 backdrop-blur-xl shadow-xl flex items-start justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xl shrink-0">
                ⚠️
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white tracking-tight">Security & Anomaly Alert</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500 text-white tracking-wider">
                    {anomaliesData.anomalies[0]?.severity || 'HIGH'} SEVERITY
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-red-200 leading-relaxed font-medium">
                  {anomaliesData.anomalies[0]?.message}
                </p>
                {anomaliesData.anomalies.length > 1 && (
                  <div className="pt-1.5 space-y-1">
                    {anomaliesData.anomalies.slice(1).map((anom, idx) => (
                      <div key={idx} className="text-xs text-red-300/80 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span>{anom.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setDismissedAnomaly(true)}
              className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 transition-colors cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section Header & Period / Refresh Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Real-Time Gateway Telemetry
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Analytics & Anomaly Detection
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Monitor request throughput, rate limit enforcement, and anomalous spikes across your proxy routes.
            </p>
          </div>

          {/* Controls: Period Selector & Auto-refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period selector */}
            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-zinc-800/80">
              {[
                { id: '24h', label: '24 Hours' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setAnalyticsPeriod(p.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    analyticsPeriod === p.id
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAnalyticsAutoRefresh(!analyticsAutoRefresh)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                analyticsAutoRefresh
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              title="Toggle automatic refresh every 30 seconds"
            >
              <span className={`w-2 h-2 rounded-full ${analyticsAutoRefresh ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <span className="font-medium">Auto-refresh (30s)</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={loadingAnalytics}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 border border-zinc-700/60 text-zinc-200 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh metrics now"
            >
              <span className={`${loadingAnalytics ? 'animate-spin' : ''}`}>🔄</span>
              <span>{loadingAnalytics ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Row 1: 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Requests */}
          <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Requests</span>
              <span className="text-lg">⚡</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {(analyticsSummary.total || 0).toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>In last {analyticsPeriod}</span>
              <span className="text-indigo-400 font-medium">+{analyticsSummary.requestsLastHour || 0} this hr</span>
            </div>
          </div>

          {/* Card 2: Blocked Requests (429) */}
          <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 relative overflow-hidden group hover:border-red-900/40 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Blocked (429)</span>
              <span className="text-lg">🛡️</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-400 font-mono tracking-tight">
              {(analyticsSummary.blocked || 0).toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Rate limited</span>
              <span className="text-red-400 font-medium">
                {analyticsSummary.total > 0 ? ((analyticsSummary.blocked / analyticsSummary.total) * 100).toFixed(1) : '0'}% blocked
              </span>
            </div>
          </div>

          {/* Card 3: Success Rate */}
          <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 relative overflow-hidden group hover:border-emerald-900/40 transition-all flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                Success Rate
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                {analyticsSummary.successRate || 100}%
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">
                {(analyticsSummary.allowed || 0).toLocaleString()} allowed
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" className="text-zinc-800" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 - ((analyticsSummary.successRate || 100) / 100) * (2 * Math.PI * 20)}
                  strokeLinecap="round"
                  className="text-emerald-500 transition-all duration-500"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-[11px] font-bold text-white font-mono">
                {Math.round(analyticsSummary.successRate || 100)}%
              </span>
            </div>
          </div>

          {/* Card 4: Avg Response Time */}
          <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 relative overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
              <span className="text-lg">⏱️</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-300 font-mono tracking-tight">
              {analyticsSummary.avgResponseTime || 0}ms
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Gateway proxy</span>
              <span className="text-indigo-400 font-mono">{analyticsSummary.activeKeys || 0} active keys</span>
            </div>
          </div>
        </div>

        {/* Row 2: Timeseries Chart (70%) + Top Paths (30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 70%: Timeseries Chart */}
          <div className="lg:col-span-8 p-5 sm:p-6 rounded-xl bg-black/40 border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  Request Volume Over Time
                </h3>
                <p className="text-xs text-zinc-500">
                  Distribution of allowed vs blocked traffic across {analyticsPeriod}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-zinc-400">Allowed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                  <span className="text-zinc-400">Blocked (429)</span>
                </div>
              </div>
            </div>

            {/* Chart Visual Bars */}
            <div className="h-48 sm:h-56 w-full flex items-end gap-1 sm:gap-1.5 pt-8 pb-2 relative border-b border-zinc-800/80">
              {/* Horizontal Guide lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-dashed border-zinc-700 w-full" />
                <div className="border-b border-dashed border-zinc-700 w-full" />
                <div className="border-b border-dashed border-zinc-700 w-full" />
              </div>

              {timeseriesData.length === 0 || timeseriesData.every(d => d.total === 0) ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-zinc-500 font-mono space-y-1">
                  <span>Awaiting incoming traffic...</span>
                  <span className="text-[11px] text-zinc-600">Send requests through the proxy gateway to plot data points</span>
                </div>
              ) : (
                timeseriesData.map((slot, index) => {
                  const maxRequests = Math.max(1, ...timeseriesData.map(d => d.total || 0));
                  const totalHeightPct = Math.max(4, ((slot.total || 0) / maxRequests) * 100);
                  const allowedPct = slot.total > 0 ? ((slot.allowed || 0) / slot.total) * 100 : 0;
                  const blockedPct = slot.total > 0 ? ((slot.blocked || 0) / slot.total) * 100 : 0;

                  return (
                    <div
                      key={index}
                      onMouseEnter={() => setHoveredBarIndex(index)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    >
                      {/* Hover Tooltip */}
                      {hoveredBarIndex === index && (
                        <div className="absolute -top-16 z-30 bg-zinc-950 border border-zinc-700/80 p-2 rounded-lg shadow-xl text-[11px] font-mono whitespace-nowrap pointer-events-none transform -translate-x-1/2 left-1/2 space-y-0.5">
                          <div className="text-zinc-400 font-bold">{slot.time}</div>
                          <div className="text-white">Total: <strong className="text-zinc-100">{slot.total}</strong></div>
                          <div className="text-emerald-400">Allowed: {slot.allowed}</div>
                          <div className="text-red-400">Blocked: {slot.blocked}</div>
                        </div>
                      )}

                      {/* Bar Body */}
                      <div
                        style={{ height: `${totalHeightPct}%` }}
                        className="w-full max-w-[18px] rounded-t-sm overflow-hidden flex flex-col-reverse transition-all duration-300 group-hover:brightness-125"
                      >
                        {/* Allowed Green Segment */}
                        <div
                          style={{ height: `${allowedPct}%` }}
                          className="w-full bg-emerald-500/80"
                        />
                        {/* Blocked Red Segment */}
                        <div
                          style={{ height: `${blockedPct}%` }}
                          className="w-full bg-red-500/90"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* X-axis Labels */}
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono pt-2 px-1">
              {timeseriesData.length > 0 && (
                <>
                  <span>{timeseriesData[0]?.time}</span>
                  <span className="hidden sm:inline">{timeseriesData[Math.floor(timeseriesData.length / 2)]?.time}</span>
                  <span>{timeseriesData[timeseriesData.length - 1]?.time}</span>
                </>
              )}
            </div>
          </div>

          {/* Right 30%: Top Paths */}
          <div className="lg:col-span-4 p-5 sm:p-6 rounded-xl bg-black/40 border border-zinc-800/80 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Top Endpoints
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Most requested routes across API keys
              </p>

              {analyticsSummary.topPaths && analyticsSummary.topPaths.length > 0 ? (
                <div className="space-y-3.5">
                  {analyticsSummary.topPaths.map((tp, idx) => {
                    const pct = analyticsSummary.total > 0 ? Math.round((tp.total / analyticsSummary.total) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-200 truncate font-semibold" title={tp.path || tp._id}>
                            {tp.path || tp._id}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-zinc-400">{tp.total} reqs</span>
                            {tp.blocked > 0 && (
                              <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.2 rounded">
                                {tp.blocked} blocked
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-indigo-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                  <span className="text-2xl mb-1">🧭</span>
                  <span className="text-xs text-zinc-500">No route paths recorded yet</span>
                  <span className="text-[11px] text-zinc-600 mt-1">Make requests to /posts or your custom endpoints</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
              <span>Top 5 endpoints</span>
              <span className="text-indigo-400">Live proxy stats</span>
            </div>
          </div>
        </div>

        {/* Row 3: Live Request Logs Stream */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Live Request Stream
              </h3>
              <span className="text-xs text-zinc-500 font-mono">
                ({logs.length} logged)
              </span>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Pills */}
              <div className="flex items-center bg-black/60 p-1 rounded-lg border border-zinc-800/80 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'allowed', label: 'Allowed' },
                  { id: 'blocked', label: 'Blocked' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setLogFilter(f.id)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      logFilter === f.id
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Path Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder="Search path (e.g. /posts)..."
                  className="bg-black/60 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none w-44 sm:w-56 font-mono"
                />
                {logSearch && (
                  <button
                    onClick={() => setLogSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-black/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Path</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">API Key</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-3xl">📡</span>
                        <span className="font-semibold text-zinc-400">No requests yet</span>
                        <p className="text-xs text-zinc-500 max-w-sm">
                          Make a request through our gateway using curl or your frontend app to see real-time analytics.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => {
                              const sampleKey = keys[0]?.keyPrefix ? `${keys[0].keyPrefix}...` : 'live_...';
                              copyText(`curl -i -X GET "${GATEWAY_URL}/posts" -H "x-api-key: ${sampleKey}"`, setCopiedLogCurl);
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-mono cursor-pointer transition-all"
                          >
                            {copiedLogCurl ? '✓ Command Copied!' : '📋 Copy Sample cURL'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log._id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap" title={new Date(log.timestamp).toLocaleString()}>
                        {formatLogTime(log.timestamp)}
                      </td>

                      {/* Method */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getMethodBadge(log.method)}`}>
                          {log.method || 'GET'}
                        </span>
                      </td>

                      {/* Path */}
                      <td className="py-3 px-4 font-mono text-zinc-200 font-medium max-w-xs truncate" title={log.path}>
                        {log.path}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status, log.statusCode)}
                      </td>

                      {/* API Key */}
                      <td className="py-3 px-4 text-zinc-400 font-mono whitespace-nowrap">
                        <span className="text-zinc-300 font-medium">{log.apiKeyName}</span>
                        {log.apiKeyPrefix && (
                          <span className="text-zinc-500 text-[10px] ml-1.5">({log.apiKeyPrefix})</span>
                        )}
                      </td>

                      {/* Client IP */}
                      <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {log.ip || '127.0.0.1'}
                      </td>

                      {/* Latency */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          (log.responseTimeMs || 0) < 100
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {log.responseTimeMs || 0}ms
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
