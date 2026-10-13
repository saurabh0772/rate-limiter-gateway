# 🚀 Rate Limiter SaaS - Multi-Tenant API Gateway

> A production-grade, multi-tenant distributed rate limiting SaaS. Like Zuplo / Kong - Give any backend instant rate limiting with 1 dashboard. Each API key gets its own backend URL.

**Live Demo:** [Dashboard](https://rate-limiter-gateway.vercel.app) | [Gateway](https://rate-limiter-gateway-y5ff.onrender.com)

[Live](https://img.shields.io/badge/Live-Vercel-black)
[Node.js](https://img.shields.io/badge/Node.js-20-green)
[Redis](https://img.shields.io/badge/Redis-Upstash-red)
[MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
[Deploy](https://img.shields.io/badge/Deploy-Render-blue)

---

## 📸 Architecture - From Global to SaaS

**Old (Global):** 1 ENV `DOWNSTREAM_URL` for all keys -> Not SaaS

**New (SaaS):** `downstreamUrl` saved in MongoDB per API Key -> True Multi-Tenant

```
[Customer A - Rohit] -> Dashboard -> Create Key -> MongoDB: { key: free_abc, owner: Rohit, downstreamUrl: https://api.rohit.com, limit: 10 }
[Customer B - Saurabh] -> Dashboard -> Create Key -> MongoDB: { key: pro_xyz, owner: Saurabh, downstreamUrl: https://api.saurabh.com, limit: 100 }

[End User] -> GET gateway.onrender.com/users + x-api-key: free_abc
           -> Gateway: Find key in Mongo -> Get downstreamUrl -> Redis Lua INCR ratelimit:free_abc
           -> If < limit -> Proxy to https://api.rohit.com/users (Dynamic Target)
           -> Else -> 429 Rate limit exceeded
```

**Two Flows:**
1. **Control Plane (Dashed):** Dashboard `VITE_API_URL` -> `POST /admin/create-key` -> MongoDB Atlas
2. **Data Plane (Solid):** End User -> Gateway (Validate Key -> Redis Lua Check) -> Dynamic Proxy -> Customer's Backend

---

## 🧠 How It Works? (SaaS Deep Dive)

### Character 1: Developer (Our SaaS Customer - e.g., Rohit)

1. Goes to `rate-limiter-gateway.vercel.app`
2. Fills: Owner Name: `Rohit`, Backend URL: `https://api.rohit.com`, Tier: `Free - 10 req/min`
3. Dashboard calls `POST https://rate-limiter-gateway-y5ff.onrender.com/admin/create-key` with `{ tier, owner, downstreamUrl }`
4. Gateway generates `free_qz8ptj2lzu` and saves in **MongoDB Atlas**: `{ key, tier, limit, owner, downstreamUrl }`
5. Rohit gets key and gives to his users. His API is now protected without writing a single line of rate limit code.

### Character 2: End User (Rohit's Customer)

1. `curl https://rate-limiter-gateway-y5ff.onrender.com/users -H "x-api-key: free_qz8ptj2lzu"`
2. **Gateway (Express on Render):**
    - Checks `x-api-key` header -> 401 if missing
    - Finds in MongoDB Atlas -> 403 if invalid, gets `downstreamUrl` & `limit`
    - Calls **Upstash Redis with Lua Script** (Atomic)
3. **Redis Lua (rateLimiter.lua):**
    ```lua
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
    if current > tonumber(ARGV[2]) then return 0 else return 1 end
    ```
4. If Allowed -> `http-proxy-middleware` proxies to `req.keyData.downstreamUrl + req.originalUrl` -> Returns Customer's Backend Response
5. If Blocked -> `429` with `X-RateLimit-Limit` and `retryAfter`

---

## ✨ Why Multi-Tenant & Why Lua?

**Why per-key downstreamUrl instead of ENV?**
ENV is static: `DOWNSTREAM_URL=http://dummy-service:3001` means all 1000 customers share same backend. Not SaaS.
SaaS needs dynamic: Each key in Mongo has its own `downstreamUrl`. Gateway reads `req.keyData.downstreamUrl` on every request.

**Why Lua? Race Condition:**
Without Lua, 2 gateway instances both READ `9`, both ALLOW, counter becomes `11` (Limit 10 breached).
With Lua: `INCR + EXPIRE + CHECK` is **1 atomic operation** inside Redis single thread. 1 network trip, 5ms latency, no race.

**Why EXPIRE only on first request?**
- No EXPIRE: User blocked forever.
- EXPIRE on every request: Sliding window, user never resets if keeps hitting.
- EXPIRE on first: Perfect **Fixed Window** of 60s.

---

## 🛠 Tech Stack

- **Gateway:** Node.js + Express + `http-proxy-middleware` (Dynamic Proxy) - Hosted on **Render**
- **Dashboard:** React + Vite + `VITE_API_URL` ENV - Hosted on **Vercel**
- **Rate Limit Store:** **Upstash Redis** (Serverless Redis with TLS `rediss://`) + Lua
- **Config Store:** **MongoDB Atlas** (Mumbai `ap-south-1`) - `{ key, tier, limit, owner, downstreamUrl }`
- **Local Dev:** Docker Compose (Mongo 6.0, Redis 8)

---

## 📁 Project Structure

```
rate-limiter-gateway/
├── gateway-service/
│ ├── index.js # SaaS Gateway + Admin + Dynamic Proxy + CORS
│ ├── models/ApiKey.js # { key, tier, limit, owner, downstreamUrl }
│ ├── lua/rateLimiter.lua # Atomic Fixed Window
│ └── Dockerfile
├── client/ (Dashboard)
│ ├── src/App.jsx # Uses import.meta.env.VITE_API_URL
│ ├── .env.example # VITE_API_URL=https://rate-limiter-gateway-y5ff.onrender.com
│ └── vite.config.js
├── dummy-service/ (Legacy, for local only)
└── docker-compose.yml
```

---

## 🚀 Live Deployment

**Gateway (Render):**
- URL: `https://rate-limiter-gateway-y5ff.onrender.com`
- ENV: `MONGO_URL=mongodb+srv://...`, `REDIS_URL=rediss://...`, `PORT=10000`
- Health: `/health`

**Dashboard (Vercel):**
- URL: `https://rate-limiter-gateway.vercel.app`
- Root Directory: `client`
- ENV: `VITE_API_URL=https://rate-limiter-gateway-y5ff.onrender.com`
- Framework: Vite

**Free Tier Note:** Render sleeps after 15 min. First request after sleep takes 30-50s (cold start).

---

## 🧪 Live Testing (Proof - From My Terminal)

**Generate Key from Dashboard:** Owner: `Saurabh`, URL: `https://jsonplaceholder.typicode.com`

**Test Free Tier - 10 req/min:**
```bash
curl https://rate-limiter-gateway-y5ff.onrender.com/posts/1 -H "x-api-key: free_qz8ptj2lzu"
# 1-10: 200 OK -> Returns JSON from jsonplaceholder
# 11th:
{"error":"Rate limit exceeded","tier":"free","limit":10,"retryAfter":60}

# Pro Tier:
curl https://rate-limiter-gateway-y5ff.onrender.com/posts/1 -H "x-api-key: pro_xxxx"
# Allows 100 req/min
```

**Admin API:**
```bash
curl https://rate-limiter-gateway-y5ff.onrender.com/admin/keys
# Returns all keys with owner and downstreamUrl
```

---

## 💻 How to Run Locally

```bash
git clone https://github.com/saurabh0772/rate-limiter-gateway.git
cd rate-limiter-gateway

# Local ENV - create gateway-service/.env
MONGO_URL=mongodb://admin:admin123@mongo:27017/rate-limiter?authSource=admin
REDIS_URL=redis://redis:6379
PORT=3000

# client/.env.local
VITE_API_URL=http://localhost:3000

docker-compose up --build
# Gateway: http://localhost:3000, Dashboard: http://localhost:5173
```

---

## 🔮 Roadmap

- [x] Global Rate Limiter (Fixed Window + Lua)
- [x] SaaS Multi-Tenant (per-key downstreamUrl)
- [x] Live Deploy (Render + Vercel + Atlas + Upstash)
- [ ] Route-Based Limits: `POST /admin/routes { path: /gemini, free_limit: 5 }` -> Redis Key `ratelimit:{key}:{path}`
- [ ] Analytics: Requests, Blocked, Graph per key
- [ ] Auth: Dashboard login, user sees only his keys

---

## 👨💻 Author

**Saurabh** - Learning Distributed Systems & Building SaaS

**Learnings:** Multi-tenancy, Dynamic Proxy, ENV vs DB config, Atomic Lua, Cold Starts, CORS for SaaS, Vercel Root Directory.

## 📄 License

MIT
