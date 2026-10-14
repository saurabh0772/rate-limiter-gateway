import { useState, useEffect } from 'react';
import axios from 'axios';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth, useUser } from '@clerk/clerk-react';

import DashboardView from './components/DashboardView';
import CreateKeyView from './components/CreateKeyView';
import AnalyticsView from './components/AnalyticsView';
import GuideView from './components/GuideView';

const GATEWAY_URL = import.meta.env.VITE_API_URL || 'https://rate-limiter-gateway-y5ff.onrender.com';
const API = GATEWAY_URL;

// Helper to extract path from backend URL and format Gateway Proxy URL
const getProxyUrl = (downstreamUrl) => {
  if (!downstreamUrl) return `${GATEWAY_URL}/api`;
  try {
    const parsed = new URL(downstreamUrl);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${GATEWAY_URL}${path}`;
  } catch (e) {
    return `${GATEWAY_URL}/api`;
  }
};

function MainApp() {
  const { getToken } = useAuth();
  const { user } = useUser();

  // Navigation tab state: 'dashboard' | 'create-key' | 'analytics' | 'guide'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Key creation form & keys state
  const [form, setForm] = useState({ name: '', downstreamUrl: '', limit: 100 });
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [urlWarning, setUrlWarning] = useState('');
  const [newKeyModal, setNewKeyModal] = useState(null);

  // Copy state trackers
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPrefixId, setCopiedPrefixId] = useState(null);
  const [copiedProxyId, setCopiedProxyId] = useState(null);
  const [copiedModalProxy, setCopiedModalProxy] = useState(false);
  const [copiedModalHeader, setCopiedModalHeader] = useState(false);
  const [copiedGuideSnippet, setCopiedGuideSnippet] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  // Guide tab state
  const [guideTab, setGuideTab] = useState('fetch');

  // Analytics & Anomaly Detection State
  const [analyticsPeriod, setAnalyticsPeriod] = useState('24h');
  const [analyticsAutoRefresh, setAnalyticsAutoRefresh] = useState(true);
  const [analyticsSummary, setAnalyticsSummary] = useState({
    total: 0,
    blocked: 0,
    allowed: 0,
    successRate: 100,
    requestsLastHour: 0,
    avgResponseTime: 0,
    activeKeys: 0,
    topPaths: []
  });
  const [timeseriesData, setTimeseriesData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [anomaliesData, setAnomaliesData] = useState({ hasAnomaly: false, anomalies: [] });
  const [dismissedAnomaly, setDismissedAnomaly] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const getAuthClient = async () => {
    const token = await getToken();
    return axios.create({
      baseURL: API,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  };

  const fetchKeys = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const client = await getAuthClient();
      const res = await client.get('/admin/keys');
      setKeys(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Fetch keys error:', err);
      if (err.response?.status === 401) {
        setFetchError('Session expired or unauthorized. Please re-login.');
      } else {
        setFetchError(err.response?.data?.error || err.message || 'Failed to load keys');
      }
    } finally {
      setFetching(false);
    }
  };

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setLoadingAnalytics(true);
    try {
      const client = await getAuthClient();
      const [summaryRes, timeseriesRes, anomaliesRes, logsRes] = await Promise.allSettled([
        client.get(`/admin/analytics/summary?period=${analyticsPeriod}`),
        client.get(`/admin/analytics/timeseries?period=${analyticsPeriod}`),
        client.get('/admin/analytics/anomalies'),
        client.get(`/admin/analytics/logs?limit=50&status=${logFilter}&search=${encodeURIComponent(logSearch)}`)
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data) {
        setAnalyticsSummary(summaryRes.value.data);
      }
      if (timeseriesRes.status === 'fulfilled' && Array.isArray(timeseriesRes.value?.data)) {
        setTimeseriesData(timeseriesRes.value.data);
      }
      if (anomaliesRes.status === 'fulfilled' && anomaliesRes.value?.data) {
        setAnomaliesData(anomaliesRes.value.data);
      }
      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value?.data)) {
        setLogs(logsRes.value.data);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      if (isManual) setLoadingAnalytics(false);
    }
  };

  const fetchLogsOnly = async () => {
    try {
      const client = await getAuthClient();
      const res = await client.get(`/admin/analytics/logs?limit=50&status=${logFilter}&search=${encodeURIComponent(logSearch)}`);
      if (Array.isArray(res.data)) setLogs(res.data);
    } catch (err) {
      console.error('Logs fetch error:', err);
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [analyticsPeriod]);

  useEffect(() => {
    fetchLogsOnly();
  }, [logFilter, logSearch]);

  useEffect(() => {
    if (!analyticsAutoRefresh) return;
    const interval = setInterval(() => {
      fetchAnalytics(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [analyticsPeriod, analyticsAutoRefresh, logFilter, logSearch]);

  const handleUrlChange = (value) => {
    setForm(prev => ({ ...prev, downstreamUrl: value }));
    if (value && !value.startsWith('https://')) {
      setUrlWarning('Backend URL must start with https://');
    } else {
      setUrlWarning('');
    }
  };

  const handleLimitInputChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setForm(prev => ({ ...prev, limit: '' }));
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    if (num > 20000) {
      setForm(prev => ({ ...prev, limit: 20000 }));
    } else {
      setForm(prev => ({ ...prev, limit: num }));
    }
  };

  const handleLimitInputBlur = () => {
    if (form.limit === '' || Number(form.limit) < 1) {
      setForm(prev => ({ ...prev, limit: 1 }));
    } else if (Number(form.limit) > 20000) {
      setForm(prev => ({ ...prev, limit: 20000 }));
    }
  };

  const createKey = async (e) => {
    e.preventDefault();
    setCreateError(null);

    const trimmedUrl = form.downstreamUrl.trim();
    if (!trimmedUrl.startsWith('https://')) {
      setUrlWarning('Backend URL must start with https://');
      return;
    }

    const finalLimit = Math.min(20000, Math.max(1, Number(form.limit) || 100));

    setLoading(true);
    try {
      const client = await getAuthClient();
      const res = await client.post('/admin/create-key', {
        name: form.name.trim(),
        downstreamUrl: trimmedUrl,
        limit: finalLimit
      });
      setNewKeyModal(res.data);
      setCopiedKey(false);
      setCopiedModalProxy(false);
      setCopiedModalHeader(false);
      setForm({ name: '', downstreamUrl: '', limit: 100 });
      setUrlWarning('');
      await fetchKeys();
      await fetchAnalytics();
    } catch (err) {
      console.error('Create key error:', err);
      setCreateError(err.response?.data?.error || err.message || 'Failed to create key');
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this API key? Traffic using this key will immediately be blocked.')) {
      return;
    }
    setRevokingId(id);
    try {
      const client = await getAuthClient();
      await client.delete(`/admin/keys/${id}`);
      await fetchKeys();
      await fetchAnalytics();
    } catch (err) {
      console.error('Revoke key error:', err);
      alert(err.response?.data?.error || 'Failed to revoke key');
    } finally {
      setRevokingId(null);
    }
  };

  const copyText = (text, setCopiedState) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2500);
    }
  };

  const currentNumericLimit = Number(form.limit) || 1;
  const sliderPercent = Math.min(100, Math.max(0, ((currentNumericLimit - 1) / (20000 - 1)) * 100));

  const sampleKey = keys[0]?.keyPrefix ? `${keys[0].keyPrefix}••••••••` : 'live_YOUR_API_KEY';
  const sampleProxyUrl = `${GATEWAY_URL}/posts`;

  const codeSnippets = {
    fetch: `// Send request through our Rate Limiter Gateway
fetch('${sampleProxyUrl}', {
  method: 'GET',
  headers: {
    'x-api-key': '${sampleKey}'
  }
})
  .then(response => {
    if (response.status === 429) {
      const limit = response.headers.get('X-RateLimit-Limit');
      const remaining = response.headers.get('X-RateLimit-Remaining');
      console.warn(\`Rate limit exceeded! Remaining: \${remaining}/\${limit}\`);
      return;
    }
    return response.json();
  })
  .then(data => console.log('Data:', data))
  .catch(err => console.error('Error:', err));`,

    axios: `import axios from 'axios';

try {
  const response = await axios.get('${sampleProxyUrl}', {
    headers: {
      'x-api-key': '${sampleKey}'
    }
  });

  console.log('Data:', response.data);
  console.log('Remaining tokens:', response.headers['x-ratelimit-remaining']);
} catch (error) {
  if (error.response?.status === 429) {
    console.error('Rate limit exceeded! Retry after a few seconds.');
  } else {
    console.error('Request failed:', error.message);
  }
}`,

    curl: `# cURL command to call through our Rate Limiter Gateway
curl -i -X GET "${sampleProxyUrl}" \\
  -H "x-api-key: ${sampleKey}"`
  };

  const formatLogTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMethodBadge = (method) => {
    const m = (method || 'GET').toUpperCase();
    if (m === 'GET') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (m === 'POST') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (m === 'PUT' || m === 'PATCH') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (m === 'DELETE') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  const getStatusBadge = (status, code) => {
    if (status === 'blocked' || code === 429) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          429 Blocked
        </span>
      );
    }
    if (code >= 500) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {code} Error
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {code || 200} Allowed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 bg-grid-pattern relative pb-20">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial-glow pointer-events-none -z-0" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#0a0a0a]/90 backdrop-blur-xl">
        {/* Top Brand Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm shadow-sm">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">Rate Limiter</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-xs text-zinc-400">
              <span className="text-zinc-500 font-mono">Gateway:</span>
              <span className="font-mono text-zinc-300 font-medium truncate max-w-sm">{GATEWAY_URL}</span>
            </div>
            <div className="p-0.5 rounded-full bg-zinc-800/60 border border-zinc-700/60">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>

        {/* Sub-Header Navigation Tabs */}
        <div className="border-t border-zinc-800/60 bg-black/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-1 sm:gap-8 overflow-x-auto scrollbar-none">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'create-key', label: 'Create API Key' },
                { id: 'analytics', label: 'Analytics', hasAlert: anomaliesData.hasAnomaly && !dismissedAnomaly },
                { id: 'guide', label: 'How to Use Guide' }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative py-3.5 px-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.hasAlert && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Security alert active" />
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        {/* Tab 1: Dashboard (Show all keys user generated till now) */}
        {activeTab === 'dashboard' && (
          <DashboardView
            keys={keys}
            fetching={fetching}
            fetchError={fetchError}
            fetchKeys={fetchKeys}
            revokeKey={revokeKey}
            revokingId={revokingId}
            copyText={copyText}
            copiedPrefixId={copiedPrefixId}
            copiedProxyId={copiedProxyId}
            setCopiedPrefixId={setCopiedPrefixId}
            setCopiedProxyId={setCopiedProxyId}
            getProxyUrl={getProxyUrl}
            onNavigateCreateKey={() => setActiveTab('create-key')}
            GATEWAY_URL={GATEWAY_URL}
          />
        )}

        {/* Tab 2: Create Api Key (Where user can create key and past keys also show) */}
        {activeTab === 'create-key' && (
          <CreateKeyView
            form={form}
            setForm={setForm}
            handleUrlChange={handleUrlChange}
            urlWarning={urlWarning}
            handleLimitInputChange={handleLimitInputChange}
            handleLimitInputBlur={handleLimitInputBlur}
            sliderPercent={sliderPercent}
            currentNumericLimit={currentNumericLimit}
            createKey={createKey}
            createError={createError}
            loading={loading}
            keys={keys}
            getProxyUrl={getProxyUrl}
            copyText={copyText}
            copiedPrefixId={copiedPrefixId}
            copiedProxyId={copiedProxyId}
            setCopiedPrefixId={setCopiedPrefixId}
            setCopiedProxyId={setCopiedProxyId}
            revokeKey={revokeKey}
            revokingId={revokingId}
          />
        )}

        {/* Tab 3: Analytics (Where analytics related things shown) */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            analyticsSummary={analyticsSummary}
            timeseriesData={timeseriesData}
            logs={logs}
            anomaliesData={anomaliesData}
            dismissedAnomaly={dismissedAnomaly}
            setDismissedAnomaly={setDismissedAnomaly}
            analyticsPeriod={analyticsPeriod}
            setAnalyticsPeriod={setAnalyticsPeriod}
            analyticsAutoRefresh={analyticsAutoRefresh}
            setAnalyticsAutoRefresh={setAnalyticsAutoRefresh}
            fetchAnalytics={fetchAnalytics}
            loadingAnalytics={loadingAnalytics}
            logFilter={logFilter}
            setLogFilter={setLogFilter}
            logSearch={logSearch}
            setLogSearch={setLogSearch}
            formatLogTime={formatLogTime}
            getMethodBadge={getMethodBadge}
            getStatusBadge={getStatusBadge}
            keys={keys}
            copyText={copyText}
            GATEWAY_URL={GATEWAY_URL}
          />
        )}

        {/* Tab 4: How to Use Guide (Where user guide is available) */}
        {activeTab === 'guide' && (
          <GuideView
            guideTab={guideTab}
            setGuideTab={setGuideTab}
            codeSnippets={codeSnippets}
            copyText={copyText}
            copiedGuideSnippet={copiedGuideSnippet}
            setCopiedGuideSnippet={setCopiedGuideSnippet}
            GATEWAY_URL={GATEWAY_URL}
          />
        )}
      </main>

      {/* Secret Key Modal (Shown ONCE upon creation with Enhanced Rate Limited URL Info) */}
      {newKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                  Key Created Successfully
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Save Your API Key & Gateway URL
                </h3>
              </div>
              <button
                onClick={() => setNewKeyModal(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Warning alert */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
              <span className="text-base shrink-0">⚠️</span>
              <p className="leading-relaxed">
                <strong className="text-amber-200">Copy this key now.</strong> For security purposes, this raw key is only shown once and is never stored in plain text in our database. You won't be able to see it again!
              </p>
            </div>

            {/* Raw Key Display */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                API Secret Key
              </label>
              <div className="relative">
                <pre className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 font-mono text-emerald-400 text-xs sm:text-sm break-all select-all pr-24 overflow-x-auto">
                  {newKeyModal.key}
                </pre>
                <button
                  onClick={() => copyText(newKeyModal.key, setCopiedKey)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                    copiedKey
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                      : 'bg-white hover:bg-zinc-200 text-black'
                  }`}
                >
                  {copiedKey ? '✓ Copied!' : 'Copy Key'}
                </button>
              </div>
            </div>

            {/* Rate Limited URL & Backend Details inside Modal */}
            <div className="bg-black/60 border border-zinc-800/90 rounded-xl p-4 text-xs space-y-3 font-mono">
              <div className="flex justify-between items-center text-zinc-400 pb-2 border-b border-zinc-800/60">
                <span>Key Name:</span>
                <span className="text-white font-semibold">{newKeyModal.name}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400 pb-2 border-b border-zinc-800/60">
                <span>Rate Limit:</span>
                <span className="text-indigo-400 font-semibold">{newKeyModal.limit?.toLocaleString()} req/min</span>
              </div>

              {/* Original Backend */}
              <div className="space-y-1">
                <span className="text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">Original Backend Target:</span>
                <div className="text-zinc-300 break-all select-all">{newKeyModal.downstreamUrl}</div>
              </div>

              {/* Rate Limited URL */}
              <div className="space-y-1 pt-1">
                <span className="text-indigo-400 uppercase text-[10px] tracking-wider font-semibold flex items-center gap-1">
                  <span>🔗</span> Your Rate Limited URL (Call this in frontend):
                </span>
                <div className="flex items-center justify-between gap-2 bg-zinc-950 p-2 rounded-lg border border-indigo-500/30">
                  <span className="text-zinc-200 break-all select-all font-semibold">
                    {getProxyUrl(newKeyModal.downstreamUrl)}
                  </span>
                  <button
                    onClick={() => copyText(getProxyUrl(newKeyModal.downstreamUrl), setCopiedModalProxy)}
                    className={`shrink-0 px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      copiedModalProxy
                        ? 'bg-emerald-500 text-black'
                        : 'bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200'
                    }`}
                  >
                    {copiedModalProxy ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Required Header */}
              <div className="space-y-1 pt-1">
                <span className="text-zinc-500 uppercase text-[10px] tracking-wider font-semibold">Required Header:</span>
                <div className="flex items-center justify-between gap-2 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                  <span className="text-emerald-400 break-all select-all">
                    x-api-key: {newKeyModal.key}
                  </span>
                  <button
                    onClick={() => copyText(`x-api-key: ${newKeyModal.key}`, setCopiedModalHeader)}
                    className={`shrink-0 px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      copiedModalHeader
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {copiedModalHeader ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Done Button */}
            <button
              onClick={() => setNewKeyModal(null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer"
            >
              I have saved my key securely
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 bg-grid-pattern relative flex flex-col justify-between p-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-radial-glow pointer-events-none -z-0" />

          {/* Nav */}
          <div className="max-w-7xl w-full mx-auto flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <span className="font-bold text-lg tracking-tight text-white">Rate Limiter SaaS</span>
            </div>
            <SignInButton mode="modal">
              <button className="text-xs font-semibold px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer">
                Sign In
              </button>
            </SignInButton>
          </div>

          {/* Hero Center */}
          <div className="max-w-2xl mx-auto text-center space-y-6 z-10 py-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Production-Grade Rate Limiting Gateway
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Protect your APIs with <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Token Bucket Precision
              </span>
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              Issue secure API keys with customizable rate limits from 1 to 20,000 req/min. Enforced in real-time with Redis & Lua scripts.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignInButton mode="modal">
                <button className="w-full sm:w-auto bg-white hover:bg-zinc-200 active:scale-[0.99] text-black px-7 py-3.5 rounded-xl font-bold text-sm tracking-tight transition-all duration-200 shadow-xl shadow-white/10 cursor-pointer">
                  Get Started with Google
                </button>
              </SignInButton>
            </div>
          </div>

          {/* Footer stats */}
          <div className="max-w-4xl w-full mx-auto grid grid-cols-3 gap-4 border-t border-zinc-800/80 pt-6 text-center z-10">
            <div>
              <div className="text-lg font-bold text-white font-mono">&lt; 1ms</div>
              <div className="text-xs text-zinc-500">Gateway Latency</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white font-mono">20,000</div>
              <div className="text-xs text-zinc-500">Max Req / Minute</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white font-mono">100%</div>
              <div className="text-xs text-zinc-500">Atomic Redis Lua</div>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <MainApp />
      </SignedIn>
    </>
  );
}