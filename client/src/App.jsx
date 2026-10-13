import { useState, useEffect } from 'react';
import axios from 'axios';


const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const [form, setForm] = useState({ owner: '', downstreamUrl: '', tier: 'free' });
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchKeys = async () => {
    const res = await axios.get(`${API}/admin/keys`);
    setKeys(res.data);
  };
  useEffect(() => { fetchKeys(); }, []);

  const createKey = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/admin/create-key`, form);
      setForm({ owner: '', downstreamUrl: '', tier: 'free' });
      fetchKeys();
    } catch (err) { alert(err.response?.data?.error || err.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold">🚀 Rate Limiter SaaS Dashboard</h1>
        <p className="text-gray-400 mt-2">Create API key for your backend. Your users will hit our gateway.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          {/* Form */}
          <form onSubmit={createKey} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <h2 className="text-xl mb-4">Create New API Key</h2>
            <input className="w-full bg-black border border-zinc-700 p-3 rounded mb-3" placeholder="Owner Name (e.g. Rohit)" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} required />
            <input className="w-full bg-black border border-zinc-700 p-3 rounded mb-3" placeholder="Backend URL (e.g. https://api.rohit.com)" value={form.downstreamUrl} onChange={e => setForm({ ...form, downstreamUrl: e.target.value })} required />
            <select className="w-full bg-black border border-zinc-700 p-3 rounded mb-4" value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}>
              <option value="free">Free - 10 req/min</option>
              <option value="pro">Pro - 100 req/min</option>
            </select>
            <button disabled={loading} className="w-full bg-white text-black p-3 rounded font-bold hover:bg-gray-200">
              {loading ? 'Creating...' : 'Generate API Key'}
            </button>
          </form>

          {/* Keys List */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <h2 className="text-xl mb-4">Your API Keys ({keys.length})</h2>
            <div className="space-y-3 max-h- overflow-y-auto">
              {keys.map(k => (
                <div key={k.key} className="bg-black p-3 rounded border border-zinc-800 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">{k.owner} • {k.tier}</span><span className="text-xs bg-zinc-800 px-2 py-1 rounded">{k.limit}/min</span></div>
                  <div className="mt-2 font-mono text-green-400 break-all">{k.key}</div>
                  <div className="mt-1 text-gray-500 truncate">→ {k.downstreamUrl}</div>
                  <button onClick={() => navigator.clipboard.writeText(k.key)} className="mt-2 text-xs text-white underline">Copy Key</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-zinc-900 p-4 rounded text-sm text-gray-400 border border-zinc-800">
          <p>Usage: <code className="text-white">curl {API}/users -H "x-api-key: YOUR_KEY"</code></p>
        </div>
      </div>
    </div>
  )
}
export default App;