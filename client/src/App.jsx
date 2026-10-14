import { useState, useEffect } from 'react';
import axios from 'axios';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth, useUser } from '@clerk/clerk-react';

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

function Dashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
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
  const [guideTab, setGuideTab] = useState('fetch');

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

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleUrlChange = (value) => {
    setForm(prev => ({ ...prev, downstreamUrl: value }));
    if (value && !value.startsWith('https://')) {
      setUrlWarning('Backend URL must start with https://');
    } else {
      setUrlWarning('');
    }
  };

  // Synchronized rate limit input change with validation
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

  // Snippets for How-To-Use Guide
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 bg-grid-pattern relative pb-20">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial-glow pointer-events-none -z-0" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-xl shadow-lg shadow-indigo-500/10">
              🚀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">Rate Limiter SaaS</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Gateway
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Welcome <span className="text-zinc-200 font-semibold">{user?.firstName || user?.fullName || 'Developer'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-500 font-mono">Gateway:</span>
              <span className="font-mono text-zinc-300 font-medium truncate max-w-sm">{GATEWAY_URL}</span>
            </div>
            <div className="p-0.5 rounded-full bg-zinc-800/60 border border-zinc-700/60">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Create New Key Card */}
          <div className="lg:col-span-5">
            <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden group">
              {/* Top gradient highlight */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-purple-500 opacity-80" />
              
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    Create API Key
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure rate limit and target backend URL
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2 py-1 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                  {keys.length}/3 keys used
                </span>
              </div>

              {createError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                  <span className="font-bold">Error:</span>
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={createKey} className="space-y-5">
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
                    placeholder="e.g. Production Key, Mobile App API"
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
                    placeholder="https://api.rohit.com"
                    className={`w-full bg-black/60 border ${urlWarning ? 'border-amber-500/70 focus:border-amber-500' : 'border-zinc-800 focus:border-indigo-500/80'} focus:ring-1 focus:ring-indigo-500/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all font-mono`}
                  />
                  {urlWarning && (
                    <p className="mt-1.5 text-xs text-amber-400 flex items-center gap-1 font-medium">
                      <span>⚠️</span> {urlWarning}
                    </p>
                  )}
                  {form.downstreamUrl && !urlWarning && (
                    <p className="mt-1.5 text-[11px] text-zinc-500 font-mono truncate">
                      Gateway will route to: <span className="text-zinc-400">{getProxyUrl(form.downstreamUrl)}</span>
                    </p>
                  )}
                </div>

                {/* Rate Limit Slider & Custom Type Input (Synced Both) */}
                <div className="p-4 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Rate Limit
                    </span>
                    
                    {/* Synchronized Custom Number Input Box */}
                    <div className="flex items-center gap-1.5 bg-black/80 border border-zinc-700/80 hover:border-zinc-600 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 rounded-lg px-2.5 py-1 transition-all">
                      <span className="text-[11px] text-zinc-500 font-mono">[</span>
                      <input
                        type="number"
                        min="1"
                        max="20000"
                        value={form.limit}
                        onChange={handleLimitInputChange}
                        onBlur={handleLimitInputBlur}
                        placeholder="100"
                        className="w-16 bg-transparent text-right font-mono text-xs text-white font-semibold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[11px] text-zinc-500 font-mono">]</span>
                      <span className="text-[11px] text-zinc-400 font-mono">req/min</span>
                    </div>
                  </div>

                  {/* Big Number Display */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
                      {currentNumericLimit.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      req / min
                    </span>
                  </div>

                  {/* Custom Gradient Slider */}
                  <div className="relative pt-1 pb-1">
                    <input
                      type="range"
                      min="1"
                      max="20000"
                      value={currentNumericLimit}
                      onChange={e => setForm({ ...form, limit: parseInt(e.target.value, 10) || 1 })}
                      style={{
                        background: `linear-gradient(to right, #6366f1 0%, #a855f7 ${sliderPercent}%, #27272a ${sliderPercent}%, #27272a 100%)`
                      }}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  {/* Quick Preset Pills (Updates both slider & input) */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[10, 60, 100, 500, 1000, 5000, 20000].map(val => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setForm(prev => ({ ...prev, limit: val }))}
                        className={`text-[11px] px-2 py-1 rounded-md font-mono transition-all cursor-pointer ${
                          currentNumericLimit === val
                            ? 'bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20'
                            : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/40'
                        }`}
                      >
                        {val < 1000 ? `${val}/min` : `${val / 1000}k/min`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-50 text-black py-3.5 px-4 rounded-xl font-bold text-sm tracking-tight transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-white/5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Generating API Key...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate API Key</span>
                      <span className="text-zinc-600 font-normal">→</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Your Keys Card */}
          <div className="lg:col-span-7">
            <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-6 sm:p-7 shadow-2xl relative min-h-[480px] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Your Keys
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                    {keys.length}
                  </span>
                </div>
                
                <button
                  onClick={fetchKeys}
                  disabled={fetching}
                  title="Refresh keys"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/40 text-xs font-medium transition-all cursor-pointer"
                >
                  <svg className={`w-3.5 h-3.5 ${fetching ? 'animate-spin text-indigo-400' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                  <span>{fetching ? 'Syncing...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Error Alert */}
              {fetchError && (
                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                  <span>{fetchError}</span>
                  <button onClick={fetchKeys} className="underline hover:text-red-300 ml-2">Retry</button>
                </div>
              )}

              {/* Keys List / Empty State */}
              <div className="flex-1 space-y-4">
                {fetching && keys.length === 0 ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="animate-pulse bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-4 h-32" />
                    ))}
                  </div>
                ) : keys.length === 0 ? (
                  /* Empty state illustration */
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/40 border border-zinc-700/40 flex items-center justify-center text-3xl mb-4 shadow-inner">
                      🔑
                    </div>
                    <h3 className="text-base font-semibold text-zinc-200">No keys yet</h3>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
                      You haven't generated any API keys. Create your first key on the left to route and rate-limit your requests.
                    </p>
                  </div>
                ) : (
                  /* Key Cards with Gateway Proxy URL section */
                  keys.map(k => {
                    const proxyUrl = getProxyUrl(k.downstreamUrl);
                    return (
                      <div
                        key={k._id}
                        className="bg-black/60 hover:bg-black/80 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-4 sm:p-5 transition-all duration-200 group space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0 flex-1">
                            {/* Name & Active badge */}
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-white truncate">{k.name}</h3>
                              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active
                              </span>
                            </div>

                            {/* Prefix */}
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="font-mono text-xs text-zinc-400 tracking-wide">
                                {k.keyPrefix}••••••••••••
                              </span>
                              <button
                                onClick={() => copyText(k.keyPrefix, () => {
                                  setCopiedPrefixId(k._id);
                                  setTimeout(() => setCopiedPrefixId(null), 2500);
                                })}
                                className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-0.5 rounded bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 transition-colors font-mono cursor-pointer"
                                title="Copy key prefix"
                              >
                                {copiedPrefixId === k._id ? '✓ Copied' : 'Copy Prefix'}
                              </button>
                            </div>

                            {/* Target Downstream */}
                            <div className="text-xs text-zinc-500 font-mono truncate flex items-center gap-1.5 pt-0.5">
                              <span className="text-zinc-600">Proxy to:</span>
                              <span className="text-zinc-400 truncate max-w-sm sm:max-w-md" title={k.downstreamUrl}>
                                {k.downstreamUrl}
                              </span>
                            </div>
                          </div>

                          {/* Top Right: Rate Limit Badge */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-sm">
                              ⚡ {k.limit?.toLocaleString()}/min
                            </span>
                          </div>
                        </div>

                        {/* Feature 2: USE IN FRONTEND (Gateway Proxy URL) */}
                        <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                              <span>🔗</span> USE IN FRONTEND:
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
                            className={`shrink-0 text-xs px-2.5 py-1 rounded-md font-mono transition-all cursor-pointer ${
                              copiedProxyId === k._id
                                ? 'bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/20'
                                : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30'
                            }`}
                          >
                            {copiedProxyId === k._id ? '✓ URL Copied' : 'Copy URL'}
                          </button>
                        </div>

                        {/* Card Footer: Metadata & Actions */}
                        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span>
                              Created {k.createdAt ? new Date(k.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}
                            </span>
                            <span className="text-zinc-700">•</span>
                            <span>
                              {k.totalRequests || 0} reqs processed
                            </span>
                          </div>

                          <button
                            onClick={() => revokeKey(k._id)}
                            disabled={revokingId === k._id}
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/20 transition-all font-medium cursor-pointer disabled:opacity-50"
                          >
                            {revokingId === k._id ? 'Revoking...' : 'Revoke'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Usage tip footer */}
              <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                <span>Pass key in header: <code className="text-zinc-400 font-mono bg-zinc-800/60 px-1.5 py-0.5 rounded">x-api-key: live_...</code></span>
                <span className="hidden sm:inline font-mono">Protected by Redis Token Bucket</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Full Width "HOW TO USE" Guide Section */}
        <section className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top subtle highlight */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-purple-500 opacity-60" />

          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-800/80">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                Developer Integration Guide
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                How to use in your project — 3 simple steps
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Drop our rate-limiting proxy in front of your upstream APIs with zero configuration changes to your backend.
              </p>
            </div>

            {/* Code Snippet Tabs */}
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-zinc-800/80 self-start sm:self-auto">
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
                      ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
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
            <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">1️⃣</span>
                <h3 className="font-bold text-sm text-white">Create an API Key</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Provide your upstream backend target URL (e.g. <code className="text-zinc-300 font-mono bg-zinc-800/60 px-1 py-0.5 rounded">https://api.mybackend.com</code>) and set your desired rate limit from 1 to 20,000 req/min.
              </p>
              <div className="text-[11px] text-zinc-500 font-mono bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                ✓ Copy your raw key immediately — it's only shown once.
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">2️⃣</span>
                <h3 className="font-bold text-sm text-white">Replace with Gateway URL</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Point your frontend calls to the Gateway host instead of calling your upstream backend directly, and attach your API key in headers.
              </p>
              <div className="text-[11px] font-mono bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800 space-y-1.5 leading-relaxed">
                <div className="text-red-400 line-through truncate">
                  // Before: https://api.mybackend.com/posts &nbsp;&lt;- Your original backend (don't call directly)
                </div>
                <div className="text-emerald-400 font-semibold truncate">
                  // After: {GATEWAY_URL}/posts &nbsp;&lt;- Use OUR Gateway (we proxy to your backend)
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-xl bg-black/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">3️⃣</span>
                <h3 className="font-bold text-sm text-white">Handle Rate Limit (429)</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When limits are exceeded, our gateway returns <code className="text-amber-300 font-mono bg-amber-500/10 px-1 py-0.5 rounded">HTTP 429 Too Many Requests</code> with remaining token headers.
              </p>
              <div className="text-[11px] font-mono bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800 text-zinc-400">
                Headers returned:
                <div className="text-indigo-300 font-semibold mt-0.5">X-RateLimit-Limit: 100</div>
                <div className="text-indigo-300 font-semibold">X-RateLimit-Remaining: 0</div>
              </div>
            </div>
          </div>

          {/* Interactive Code Snippet Box */}
          <div className="rounded-xl border border-zinc-800 bg-black/70 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-zinc-300 font-semibold">
                  {guideTab === 'fetch' ? 'api-client.js (Native Fetch)' : guideTab === 'axios' ? 'api-service.js (Axios)' : 'terminal (cURL)'}
                </span>
              </div>
              
              <button
                onClick={() => copyText(codeSnippets[guideTab], setCopiedGuideSnippet)}
                className={`text-xs px-3 py-1.5 rounded-lg font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  copiedGuideSnippet
                    ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                }`}
              >
                {copiedGuideSnippet ? (
                  <><span>✓</span> Copied to Clipboard!</>
                ) : (
                  <><span>📋</span> Copy Snippet</>
                )}
              </button>
            </div>

            <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono text-zinc-200 overflow-x-auto leading-relaxed select-all">
              <code>{codeSnippets[guideTab]}</code>
            </pre>

            {/* Environment note below code */}
            <div className="px-4 py-3 bg-zinc-950/90 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-zinc-400 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span className="text-zinc-400 font-semibold">Production:</span>
                <span className="text-emerald-400 font-semibold select-all">Use {GATEWAY_URL}</span>
              </div>
              <div className="text-[11px] text-zinc-500">
                Local dev: <span className="text-zinc-400 select-all">Use http://localhost:3000</span>
              </div>
            </div>
          </div>
        </section>
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

            {/* Feature 2: Rate Limited URL & Backend Details inside Modal */}
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
        <Dashboard />
      </SignedIn>
    </>
  );
}