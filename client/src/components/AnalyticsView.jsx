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
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Step 3: Analytics & Anomaly Detection Section */}
      <section className="bg-white border border-[#E5E2DA] rounded-2xl p-6 sm:p-8 shadow-2xs relative space-y-8">
        {/* Anomaly Detection Banner if triggered */}
        {anomaliesData.hasAnomaly && !dismissedAnomaly && anomaliesData.anomalies?.length > 0 && (
          <div className="p-4 sm:p-5 rounded-xl bg-[#FDF8EE] border border-[#F3E0BA] text-[#945D18] shadow-2xs flex items-start justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="px-2 py-1 rounded bg-white border border-[#F3E0BA] text-[#945D18] text-xs font-mono font-bold shrink-0">
                ALERT
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#1C1F1A] tracking-tight">Security &amp; Anomaly Alert</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#C8623D] text-white tracking-wider">
                    {anomaliesData.anomalies[0]?.severity || 'HIGH'} SEVERITY
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#945D18] leading-relaxed font-medium">
                  {anomaliesData.anomalies[0]?.message}
                </p>
                {anomaliesData.anomalies.length > 1 && (
                  <div className="pt-1.5 space-y-1">
                    {anomaliesData.anomalies.slice(1).map((anom, idx) => (
                      <div key={idx} className="text-xs text-[#945D18]/90 font-mono">
                        — {anom.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setDismissedAnomaly(true)}
              className="text-xs text-[#5F6359] hover:text-[#1C1F1A] px-2.5 py-1 rounded-lg bg-white hover:bg-[#F2F0E8] border border-[#E5E2DA] transition-colors cursor-pointer shrink-0 shadow-2xs font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section Header & Period / Refresh Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E2DA]">
          <div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#EDF4EF] text-[#3F6E4E] border border-[#C9DEC9] mb-2">
              Gateway Telemetry
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1F1A] tracking-tight flex items-center gap-2">
              Analytics &amp; Anomaly Detection
            </h2>
            <p className="text-xs sm:text-sm text-[#5F6359] mt-1">
              Monitor request throughput, rate limit enforcement, and anomalous spikes across your proxy routes.
            </p>
          </div>

          {/* Controls: Period Selector & Auto-refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period selector */}
            <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-[#E5E2DA]">
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
                      ? 'bg-[#C8623D] text-white font-semibold shadow-2xs'
                      : 'text-[#5F6359] hover:text-[#1C1F1A]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAnalyticsAutoRefresh(!analyticsAutoRefresh)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-mono ${
                analyticsAutoRefresh
                  ? 'bg-[#EDF4EF] border-[#C9DEC9] text-[#3F6E4E] font-semibold'
                  : 'bg-[#FAF8F5] border-[#E5E2DA] text-[#5F6359] hover:text-[#1C1F1A]'
              }`}
              title="Toggle automatic refresh every 30 seconds"
            >
              <span>{analyticsAutoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={loadingAnalytics}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#F2F0E8] hover:bg-[#E5E2DA] active:scale-95 border border-[#E5E2DA] text-[#1C1F1A] transition-all cursor-pointer font-mono disabled:opacity-50"
              title="Refresh metrics now"
            >
              <span>{loadingAnalytics ? 'Updating...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Row 1: 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Requests */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] relative group hover:border-[#C8623D]/40 transition-all">
            <div className="flex items-center justify-between text-[#5F6359] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Requests</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E5E2DA]">REQ</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1C1F1A] font-mono tracking-tight">
              {(analyticsSummary.total || 0).toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#5F6359]">
              <span>Last {analyticsPeriod}</span>
              <span className="text-[#C8623D] font-medium font-mono">+{analyticsSummary.requestsLastHour || 0} this hr</span>
            </div>
          </div>

          {/* Card 2: Blocked Requests (429) */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] relative group hover:border-[#F5C7C3] transition-all">
            <div className="flex items-center justify-between text-[#5F6359] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#B33B32]">Blocked (429)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FDF2F0] text-[#B33B32] border border-[#F5C7C3]">429</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#B33B32] font-mono tracking-tight">
              {(analyticsSummary.blocked || 0).toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#5F6359]">
              <span>Rate limited</span>
              <span className="text-[#B33B32] font-medium font-mono">
                {analyticsSummary.total > 0 ? ((analyticsSummary.blocked / analyticsSummary.total) * 100).toFixed(1) : '0'}% blocked
              </span>
            </div>
          </div>

          {/* Card 3: Success Rate */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] relative group hover:border-[#C9DEC9] transition-all flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#3F6E4E] mb-2">
                Success Rate
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#3F6E4E] font-mono tracking-tight">
                {analyticsSummary.successRate || 100}%
              </div>
              <div className="mt-2 text-[11px] text-[#5F6359]">
                {(analyticsSummary.allowed || 0).toLocaleString()} allowed
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" className="text-[#E5E2DA]" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 - ((analyticsSummary.successRate || 100) / 100) * (2 * Math.PI * 20)}
                  strokeLinecap="round"
                  className="text-[#3F6E4E] transition-all duration-500"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-[11px] font-bold text-[#1C1F1A] font-mono">
                {Math.round(analyticsSummary.successRate || 100)}%
              </span>
            </div>
          </div>

          {/* Card 4: Avg Response Time */}
          <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] relative group hover:border-[#C8623D]/40 transition-all">
            <div className="flex items-center justify-between text-[#5F6359] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E5E2DA]">ms</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1C1F1A] font-mono tracking-tight">
              {analyticsSummary.avgResponseTime || 0}ms
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#5F6359]">
              <span>Gateway proxy</span>
              <span className="text-[#5F6359] font-mono">{analyticsSummary.activeKeys || 0} active keys</span>
            </div>
          </div>
        </div>

        {/* Row 2: Timeseries Chart (70%) + Top Paths (30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 70%: Timeseries Chart */}
          <div className="lg:col-span-8 p-5 sm:p-6 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#1C1F1A] tracking-tight flex items-center gap-2">
                  Request Volume Over Time
                </h3>
                <p className="text-xs text-[#5F6359]">
                  Distribution of allowed vs blocked traffic across {analyticsPeriod}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-2xs bg-[#3F6E4E] inline-block" />
                  <span className="text-[#5F6359]">Allowed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-2xs bg-[#B33B32] inline-block" />
                  <span className="text-[#5F6359]">Blocked (429)</span>
                </div>
              </div>
            </div>

            {/* Chart Visual Bars */}
            <div className="h-48 sm:h-56 w-full flex items-end gap-1 sm:gap-1.5 pt-8 pb-2 relative border-b border-[#E5E2DA]">
              {/* Horizontal Guide lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-dashed border-[#E5E2DA] w-full" />
                <div className="border-b border-dashed border-[#E5E2DA] w-full" />
                <div className="border-b border-dashed border-[#E5E2DA] w-full" />
              </div>

              {timeseriesData.length === 0 || timeseriesData.every(d => d.total === 0) ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#5F6359] font-mono space-y-1">
                  <span>Awaiting incoming traffic...</span>
                  <span className="text-[11px] text-[#5F6359]/70">Send requests through the proxy gateway to plot data points</span>
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
                        <div className="absolute -top-16 z-30 bg-[#1C1F1A] border border-[#333830] p-2 rounded-lg shadow-lg text-[11px] font-mono whitespace-nowrap pointer-events-none transform -translate-x-1/2 left-1/2 space-y-0.5 text-[#FAF8F5]">
                          <div className="text-[#E5E2DA] font-bold">{slot.time}</div>
                          <div>Total: <strong>{slot.total}</strong></div>
                          <div className="text-[#EDF4EF]">Allowed: {slot.allowed}</div>
                          <div className="text-[#F5C7C3]">Blocked: {slot.blocked}</div>
                        </div>
                      )}

                      {/* Bar Body */}
                      <div
                        style={{ height: `${totalHeightPct}%` }}
                        className="w-full max-w-[18px] rounded-t-sm overflow-hidden flex flex-col-reverse transition-all duration-200 group-hover:opacity-85"
                      >
                        {/* Allowed Green Segment */}
                        <div
                          style={{ height: `${allowedPct}%` }}
                          className="w-full bg-[#3F6E4E]"
                        />
                        {/* Blocked Red Segment */}
                        <div
                          style={{ height: `${blockedPct}%` }}
                          className="w-full bg-[#B33B32]"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* X-axis Labels */}
            <div className="flex justify-between items-center text-[10px] text-[#5F6359] font-mono pt-2 px-1">
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
          <div className="lg:col-span-4 p-5 sm:p-6 rounded-xl bg-[#FAF8F5] border border-[#E5E2DA] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#1C1F1A] tracking-tight flex items-center gap-2">
                Top Endpoints
              </h3>
              <p className="text-xs text-[#5F6359] mb-4">
                Most requested routes across API keys
              </p>

              {analyticsSummary.topPaths && analyticsSummary.topPaths.length > 0 ? (
                <div className="space-y-3.5">
                  {analyticsSummary.topPaths.map((tp, idx) => {
                    const pct = analyticsSummary.total > 0 ? Math.round((tp.total / analyticsSummary.total) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#1C1F1A] truncate font-semibold" title={tp.path || tp._id}>
                            {tp.path || tp._id}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[#5F6359]">{tp.total} reqs</span>
                            {tp.blocked > 0 && (
                              <span className="text-[10px] text-[#B33B32] bg-[#FDF2F0] border border-[#F5C7C3] px-1.5 py-0.2 rounded font-semibold">
                                {tp.blocked} blocked
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-[#E5E2DA] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-[#C8623D] rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                  <span className="text-xs font-mono text-[#5F6359] uppercase tracking-wider">No Route Activity</span>
                  <span className="text-[11px] text-[#5F6359]/70 mt-1">Make requests to /posts or upstream target endpoints</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E5E2DA] text-[11px] text-[#5F6359] font-mono flex items-center justify-between">
              <span>Top 5 endpoints</span>
              <span className="text-[#1C1F1A] font-medium">Live telemetry</span>
            </div>
          </div>
        </div>

        {/* Row 3: Live Request Logs Stream */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1C1F1A] tracking-tight">
                Live Request Stream
              </h3>
              <span className="text-xs text-[#5F6359] font-mono">
                ({logs.length} logged)
              </span>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Pills */}
              <div className="flex items-center bg-[#FAF8F5] p-1 rounded-lg border border-[#E5E2DA] text-xs">
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
                        ? 'bg-white text-[#1C1F1A] font-semibold shadow-2xs'
                        : 'text-[#5F6359] hover:text-[#1C1F1A]'
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
                  placeholder="Filter path..."
                  className="bg-[#FAF8F5] border border-[#E5E2DA] focus:border-[#C8623D] focus:ring-1 focus:ring-[#C8623D] rounded-lg px-3 py-1.5 text-xs text-[#1C1F1A] placeholder:text-[#5F6359]/60 outline-none w-44 sm:w-56 font-mono transition-all"
                />
                {logSearch && (
                  <button
                    onClick={() => setLogSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5F6359] hover:text-[#1C1F1A] text-xs cursor-pointer font-mono"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-[#E5E2DA] bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E2DA] bg-[#FAF8F5] text-[#5F6359] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Path</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">API Key</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DA]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#5F6359]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="font-semibold text-[#1C1F1A]">No requests recorded yet</span>
                        <p className="text-xs text-[#5F6359] max-w-sm">
                          Send a request through the gateway using cURL or your client application to see real-time streaming telemetry.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => {
                              const sampleKey = keys[0]?.keyPrefix ? `${keys[0].keyPrefix}...` : 'live_...';
                              copyText(`curl -i -X GET "${GATEWAY_URL}/posts" -H "x-api-key: ${sampleKey}"`, setCopiedLogCurl);
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-[#C8623D] hover:bg-[#B95431] text-white font-mono cursor-pointer transition-all shadow-2xs border border-[#B95431]/20"
                          >
                            {copiedLogCurl ? 'Command Copied' : 'Copy Sample cURL'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log._id} className="hover:bg-[#FAF8F5]/70 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[#5F6359] whitespace-nowrap" title={new Date(log.timestamp).toLocaleString()}>
                        {formatLogTime(log.timestamp)}
                      </td>

                      {/* Method */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getMethodBadge(log.method)}`}>
                          {log.method || 'GET'}
                        </span>
                      </td>

                      {/* Path */}
                      <td className="py-3 px-4 font-mono text-[#1C1F1A] font-medium max-w-xs truncate" title={log.path}>
                        {log.path}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status, log.statusCode)}
                      </td>

                      {/* API Key */}
                      <td className="py-3 px-4 text-[#5F6359] font-mono whitespace-nowrap">
                        <span className="text-[#1C1F1A] font-medium">{log.apiKeyName}</span>
                        {log.apiKeyPrefix && (
                          <span className="text-[#5F6359] text-[10px] ml-1.5 font-normal">({log.apiKeyPrefix})</span>
                        )}
                      </td>

                      {/* Client IP */}
                      <td className="py-3 px-4 font-mono text-[#5F6359] whitespace-nowrap">
                        {log.ip || '127.0.0.1'}
                      </td>

                      {/* Latency */}
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${(log.responseTimeMs || 0) < 100
                            ? 'bg-[#EDF4EF] text-[#3F6E4E] border border-[#C9DEC9]'
                            : 'bg-[#FDF8EE] text-[#945D18] border border-[#F3E0BA]'
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
