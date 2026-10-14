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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMethodBadge = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'bg-[#F2F0E8] text-[#1C1F1A] border-[#E5E2DA] font-mono';
      case 'POST':
        return 'bg-[#EDF4EF] text-[#3F6E4E] border-[#C9DEC9] font-mono';
      case 'PUT':
      case 'PATCH':
        return 'bg-[#FDF8EE] text-[#945D18] border-[#F3E0BA] font-mono';
      case 'DELETE':
        return 'bg-[#FDF2F0] text-[#B33B32] border-[#F5C7C3] font-mono';
      default:
        return 'bg-[#F2F0E8] text-[#5F6359] border-[#E5E2DA] font-mono';
    }
  };

  const getStatusBadge = (status, code) => {
    if (status === 'blocked' || code === 429) {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#FDF2F0] text-[#B33B32] border border-[#F5C7C3]">
          429 Blocked
        </span>
      );
    }
    if (code >= 500) {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#FDF2F0] text-[#B33B32] border border-[#F5C7C3]">
          {code} Error
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#EDF4EF] text-[#3F6E4E] border border-[#C9DEC9]">
        {code || 200} Allowed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1F1A] relative pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#E5E2DA] bg-[#FAF8F5]/95 backdrop-blur-md">
        {/* Top Brand Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#C8623D] text-white font-mono font-bold text-xs tracking-tight shadow-2xs">
              RL
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold tracking-tight text-[#1C1F1A]">Rate Limiter</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#EDF4EF] text-[#3F6E4E] border border-[#C9DEC9]">
                  Live
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F2F0E8] border border-[#E5E2DA] text-xs text-[#5F6359]">
              <span className="font-mono text-[#5F6359]">Gateway:</span>
              <span className="font-mono text-[#1C1F1A] font-medium truncate max-w-sm">{GATEWAY_URL}</span>
            </div>
            <div className="p-0.5 rounded-full bg-white border border-[#E5E2DA]">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>

        {/* Sub-Header Navigation Tabs */}
        <div className="border-t border-[#E5E2DA] bg-white/70">
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
                    className={`relative py-3.5 px-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${isActive
                        ? 'text-[#1C1F1A] font-semibold'
                        : 'text-[#5F6359] hover:text-[#1C1F1A]'
                      }`}
                  >
                    <span>{tab.label}</span>
                    {tab.hasAlert && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-[#FDF2F0] text-[#B33B32] border border-[#F5C7C3]">
                        Alert
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C8623D] rounded-full" />
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

        {/* Tab 3: Analytics (Where analytics and telemetry are shown) */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1F1A]/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E5E2DA] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-lg relative space-y-5 text-[#1C1F1A]">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#EDF4EF] text-[#3F6E4E] border border-[#C9DEC9] mb-2">
                  Key Created Successfully
                </span>
                <h3 className="text-xl font-bold text-[#1C1F1A] tracking-tight">
                  Save Your API Key &amp; Gateway URL
                </h3>
              </div>
              <button
                onClick={() => setNewKeyModal(null)}
                className="text-[#5F6359] hover:text-[#1C1F1A] px-2 py-1 rounded-md hover:bg-[#F2F0E8] text-xs font-mono cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>

            {/* Warning alert */}
            <div className="p-3.5 rounded-xl bg-[#FDF8EE] border border-[#F3E0BA] text-[#945D18] text-xs space-y-1">
              <span className="font-mono text-[#945D18] text-[10px] uppercase tracking-wider block font-bold">Important Notice</span>
              <p className="leading-relaxed">
                Copy this key now. For security purposes, this raw key is only shown once and is never stored in plain text in our database. You will not be able to view it again.
              </p>
            </div>

            {/* Raw Key Display */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#5F6359] uppercase tracking-wider">
                API Secret Key
              </label>
              <div className="relative">
                <pre className="w-full bg-[#1C1F1A] border border-[#333830] rounded-xl p-3.5 font-mono text-[#FAF8F5] text-xs sm:text-sm break-all select-all pr-28 overflow-x-auto">
                  {newKeyModal.key}
                </pre>
                <button
                  onClick={() => copyText(newKeyModal.key, setCopiedKey)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer shadow-2xs ${copiedKey
                      ? 'bg-[#3F6E4E] text-white'
                      : 'bg-[#C8623D] hover:bg-[#B95431] text-white'
                    }`}
                >
                  {copiedKey ? 'Copied' : 'Copy Key'}
                </button>
              </div>
            </div>

            {/* Rate Limited URL & Backend Details inside Modal */}
            <div className="bg-[#FAF8F5] border border-[#E5E2DA] rounded-xl p-4 text-xs space-y-3 font-mono">
              <div className="flex justify-between items-center text-[#5F6359] pb-2 border-b border-[#E5E2DA]">
                <span>Key Name:</span>
                <span className="text-[#1C1F1A] font-semibold">{newKeyModal.name}</span>
              </div>
              <div className="flex justify-between items-center text-[#5F6359] pb-2 border-b border-[#E5E2DA]">
                <span>Rate Limit:</span>
                <span className="text-[#1C1F1A] font-semibold">{newKeyModal.limit?.toLocaleString()} req/min</span>
              </div>

              {/* Original Backend */}
              <div className="space-y-1">
                <span className="text-[#5F6359] uppercase text-[10px] tracking-wider font-semibold">Original Backend Target:</span>
                <div className="text-[#1C1F1A] break-all select-all">{newKeyModal.downstreamUrl}</div>
              </div>

              {/* Rate Limited URL */}
              <div className="space-y-1 pt-1">
                <span className="text-[#5F6359] uppercase text-[10px] tracking-wider font-semibold">
                  Rate Limited Proxy URL:
                </span>
                <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-[#E5E2DA]">
                  <span className="text-[#1C1F1A] break-all select-all font-semibold">
                    {getProxyUrl(newKeyModal.downstreamUrl)}
                  </span>
                  <button
                    onClick={() => copyText(getProxyUrl(newKeyModal.downstreamUrl), setCopiedModalProxy)}
                    className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${copiedModalProxy
                        ? 'bg-[#3F6E4E] text-white'
                        : 'bg-[#F2F0E8] hover:bg-[#E5E2DA] text-[#1C1F1A] border border-[#E5E2DA]'
                      }`}
                  >
                    {copiedModalProxy ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Required Header */}
              <div className="space-y-1 pt-1">
                <span className="text-[#5F6359] uppercase text-[10px] tracking-wider font-semibold">Required Header:</span>
                <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-[#E5E2DA]">
                  <span className="text-[#1C1F1A] break-all select-all font-mono">
                    x-api-key: {newKeyModal.key}
                  </span>
                  <button
                    onClick={() => copyText(`x-api-key: ${newKeyModal.key}`, setCopiedModalHeader)}
                    className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${copiedModalHeader
                        ? 'bg-[#3F6E4E] text-white'
                        : 'bg-[#F2F0E8] hover:bg-[#E5E2DA] text-[#1C1F1A] border border-[#E5E2DA]'
                      }`}
                  >
                    {copiedModalHeader ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Done Button */}
            <button
              onClick={() => setNewKeyModal(null)}
              className="w-full bg-[#C8623D] hover:bg-[#B95431] text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-2xs cursor-pointer border border-[#B95431]/20"
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
        <div className="min-h-screen bg-[#FAF8F5] text-[#1C1F1A] relative flex flex-col justify-between p-6 sm:p-10">
          {/* Nav */}
          <div className="max-w-7xl w-full mx-auto flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#C8623D] text-white font-mono font-bold text-xs tracking-tight shadow-2xs">
                RL
              </div>
              <span className="font-bold text-lg tracking-tight text-[#1C1F1A]">Rate Limiter</span>
            </div>
            <SignInButton mode="modal">
              <button className="text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-[#F2F0E8] border border-[#E5E2DA] text-[#1C1F1A] transition-all cursor-pointer shadow-2xs">
                Sign In
              </button>
            </SignInButton>
          </div>

          {/* Hero Center */}
          <div className="max-w-3xl mx-auto text-center space-y-6 z-10 py-16">
            <div className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-mono font-medium bg-[#F2F0E8] text-[#5F6359] border border-[#E5E2DA]">
              Production Rate Limiting Infrastructure
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#1C1F1A] leading-[1.12]">
              Protect your APIs with <br />
              <span className="text-[#C8623D]">
                Token Bucket Precision
              </span>
            </h1>

            <p className="text-[#5F6359] text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              Issue secure API keys with customizable rate limits from 1 to 20,000 req/min. Enforced in real-time with Redis &amp; atomic Lua scripts.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignInButton mode="modal">
                <button className="w-full sm:w-auto bg-[#C8623D] hover:bg-[#B95431] active:scale-[0.99] text-white px-8 py-3.5 rounded-xl font-bold text-sm tracking-tight transition-all duration-150 shadow-2xs cursor-pointer border border-[#B95431]/20">
                  Get Started with Google
                </button>
              </SignInButton>
            </div>
          </div>

          {/* Footer stats */}
          <div className="max-w-4xl w-full mx-auto grid grid-cols-3 gap-4 border-t border-[#E5E2DA] pt-6 text-center z-10">
            <div>
              <div className="text-lg font-bold text-[#1C1F1A] font-mono">&lt; 1ms</div>
              <div className="text-xs text-[#5F6359]">Gateway Latency</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#1C1F1A] font-mono">20,000</div>
              <div className="text-xs text-[#5F6359]">Max Req / Minute</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#1C1F1A] font-mono">100%</div>
              <div className="text-xs text-[#5F6359]">Atomic Redis Lua</div>
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