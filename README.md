# 🚀 Distributed API Gateway - Global Rate Limiter

> A production-grade, distributed rate limiting gateway built with Node.js, Redis (Lua), and MongoDB. Protects all your APIs with a single API key.

[Node.js](https://img.shields.io/badge/Node.js-20-green)
[Redis](https://img.shields.io/badge/Redis-8-red)
[MongoDB](https://img.shields.io/badge/MongoDB-6.0-green)
[Docker](https://img.shields.io/badge/Docker-Compose-blue)
[License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📸 Architecture Flowchart

[Architecture](./flowcharts-and-diagrams/flow-of-rate-limiter-service.jpg)

**Two Flows:**
- **Flow 1 (Dashed Line): Developer Onboarding** - Customer creates API Key via Dashboard -> Saved in MongoDB
- **Flow 2 (Solid Line): End User Request** - End User -> Gateway (Validate Key -> Check Redis Lua) -> Allowed? -> Proxy to Backend OR 429

---

## 🧠 How Someone Uses Our Service? (Deep Dive)

### Character 1: Developer (Our Customer - e.g., Rohit who owns an API)

1.  Goes to `your-gateway.com/dashboard`
2.  Clicks **Create API Key** -> Selects Tier: `Free (10 req/min)` or `Pro (100 req/min)`
3.  Dashboard calls `POST /admin/create-key` -> Gateway generates key like `free_a1b2c3d4e5` and saves in **MongoDB**: `{ key, tier, limit, owner }`
4.  Developer gets the key and distributes to his users. He sets his DNS/Upstream URL to our Gateway: `DOWNSTREAM_URL=http://his-backend`

### Character 2: End User (Developer's Customer - e.g., Aman)

1.  Sends request: `GET your-gateway.com/users` with Header `x-api-key: free_a1b2c3d4e5`
2.  **Gateway Service (Node.js)** intercepts:
    - Checks header -> 401 if missing
    - Looks up in MongoDB for tier/limit -> 403 if invalid
    - Calls **Redis with Lua Script** (Atomic)
3.  **Redis Lua Logic:**
    ```lua
    INCR ratelimit:free_a1b2c3d4e5
    If first request (current == 1): EXPIRE 60s
    If count > limit: return 0 (BLOCK)
    Else: return 1 (ALLOW)
    ```
4.  If Allowed -> `http-proxy-middleware` proxies request to `dummy-service:3001` -> Returns 200 OK
5.  If Blocked -> Returns `429 Too Many Requests` with `Retry-After` header

**Result:** One API Key protects ALL APIs globally. `/login`, `/users`, `/gemini` - all share same quota.

---

## ✨ Why Lua? Why Not Simple INCR?

Without Lua, race condition happens with multiple gateway instances:

```
Req A: GET -> 9
Req B: GET -> 9 (because A hasn't INCR yet)
Both think 9 < 10 -> Both ALLOW -> Counter becomes 11 (Limit breached!)
```

**With Lua:** The entire `INCR + CHECK + EXPIRE` runs as a **single atomic operation** inside Redis (single-threaded). No race. Plus, 1 network round-trip instead of 3. Latency 30ms -> 5ms.

### Why EXPIRE only when `current == 1`?

- **If no EXPIRE:** Counter never resets -> User blocked forever after 10 requests.
- **If EXPIRE on every request:** Window slides forever if user keeps hitting -> User never gets reset.
- **If EXPIRE only on first request:** Creates a perfect **Fixed Window** of 60s. Key auto-deletes after 60s, new window starts.

---

## 🛠️ Tech Stack

- **Gateway:** Node.js + Express + `http-proxy-middleware@2.0.6`
- **Rate Limit Store:** Redis 8 with Lua Script (Atomic Counter)
- **Config Store:** MongoDB 6.0 + Mongoose (API Keys, Tier, Owner)
- **Downstream:** Dummy Node.js Service (represents customer's backend)
- **Infra:** Docker & Docker Compose

---

## 📁 Project Structure

```
rate-limiter-gateway/
├── docker-compose.yml
├── gateway-service/
│   ├── index.js          # Main gateway + admin APIs + proxy
│   ├── models/ApiKey.js   # Mongo Schema
│   ├── lua/rateLimiter.lua # Atomic Lua script
│   └── Dockerfile (node:20-alpine)
├── dummy-service/
│   ├── index.js          # Customer's backend simulation
│   └── Dockerfile
└── dashboard/ (optional)
```

---

## 🚀 How to Run Locally

```bash
# 1. Clone
git clone https://github.com/saurabh0772/rate-limiter-gateway.git
cd rate-limiter-gateway

# 2. Fix for Kernel 6.19+ (if needed) - Use mongo:6.0 in docker-compose.yml

# 3. Run all services
docker-compose up --build

# Wait for:
# - Mongo Connected
# - Demo API Keys Created
# - Gateway running on 3000
# - Dummy service running on 3001
```

### Services:
- Gateway: http://localhost:3000
- Dummy Backend: http://localhost:3001
- Mongo: localhost:27017
- Redis: localhost:6379

---

## 🧪 Testing (Proof)

**Test 1: Without Key -> 401**
```bash
curl http://localhost:3000/users
# {"error":"API Key missing..."}
```

**Test 2: Free Key - 10 allowed, 11th blocked -> 429**
```bash
for i in {1..11}; do echo -n "Request $i: "; curl -s -o /dev/null -w "%{http_code}\n" -H "x-api-key: free_a1b2c3d4e5" http://localhost:3000/users; done

# Output:
# Request 1: 200
# Request 2: 200
# ...
# Request 10: 200
# Request 11: 429  <-- WORKING!
```

**Test 3: Pro Key - 100 req/min**
```bash
curl -H "x-api-key: pro_xyz999" http://localhost:3000/users
```

---

## 🔮 Future Upgrade (From Global to Route-Based)

Current: **Global Rate Limiter** (1 key = all routes same limit)

Upgrade to **Route-Based** in 2 hours:

1.  Add new Mongo Collection `RouteConfig`:
    ```json
    { "path": "/gemini", "free_limit": 5, "pro_limit": 20 },
    { "path": "/login", "free_limit": 100, "pro_limit": 1000 }
    ```
2.  Change Redis Key: `ratelimit:${apiKey}:${req.path}`
3.  Lookup limit per route.

This allows customer to say: "/login 100/min but /gemini only 5/min because it's expensive"

---

## 👨‍💻 Author

Built by Saurabh for learning Distributed Systems & API Gateway concepts.

**Key Learnings:** Redis Atomicity, Fixed Window vs Sliding Window, API Gateway Pattern, Docker Networking, Race Conditions in Distributed Systems.

---

## 📄 License

MIT
