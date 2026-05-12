# 🌟 AURA SYNERGY HUB — Complete Interview Knowledge Guide

---

## 1. PROJECT OVERVIEW

**Aura Synergy Hub** is a full-stack, AI-powered holistic student success platform. It integrates **coding progress tracking**, **mental wellness coaching**, **physical health management**, and **career roadmap planning** into a single dashboard.

### What Problem Does It Solve?
Students juggle multiple coding platforms (LeetCode, CodeChef, Codeforces), career planning, and personal wellness. Aura brings everything into one place — automatically scraping live coding stats, providing AI-powered wellness coaching, tracking daily progress, and offering interactive career roadmaps.

### Key Modules:
1. **Dashboard** — Real-time coding stats, streak tracking, monthly goal progress
2. **Day Tracker** — Daily progress monitoring with goal setting
3. **Mental Wellness Coach** — AI chatbot with sentiment analysis
4. **Physical Wellness Coach** — BMI calculator, food image recognition, diet plans
5. **Career Roadmaps** — Interactive learning paths with milestone tracking

---

## 2. COMPLETE TECHNOLOGY STACK

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** + **TypeScript** | UI framework with type safety |
| **Vite** | Build tool (fast HMR, optimized builds) |
| **Tailwind CSS** | Utility-first CSS framework |
| **shadcn/ui** (Radix UI) | Accessible, pre-built UI component library |
| **React Router DOM v6** | Client-side routing with protected routes |
| **TanStack React Query** | Server state management & caching |
| **Recharts** | Data visualization (charts, graphs) |
| **Lucide React** | Icon library |
| **Sonner** | Toast notifications |
| **React Hook Form + Zod** | Form handling with schema validation |
| **date-fns** | Date formatting utilities |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime |
| **Express.js** | REST API framework |
| **PostgreSQL** (via `pg`) | Relational database |
| **Puppeteer** | Headless browser for web scraping |
| **Cheerio** | HTML parsing for scraping |
| **Axios** | HTTP client for API calls |
| **JWT (jsonwebtoken)** | Token-based authentication |
| **bcrypt** | Password hashing (12 salt rounds) |
| **Zod** | Request body validation |
| **Groq SDK** | LLM API for AI chat responses |
| **Hugging Face Inference** | ML models (sentiment analysis, food classification) |
| **Multer** | File upload handling (food images) |
| **Helmet** | HTTP security headers |
| **CORS** | Cross-Origin Resource Sharing |
| **dotenv** | Environment variable management |
| **node-cron** | Scheduled tasks |

### Database
| Technology | Purpose |
|---|---|
| **PostgreSQL** | Primary database (hosted on Aiven cloud) |
| **SSL connections** | `rejectUnauthorized: false` for cloud DB |
| **Connection pooling** | `pg.Pool` with max 15 connections |

---

## 3. PROJECT ARCHITECTURE

```
aura/
├── Frontend/                     # React + TypeScript (Vite)
│   └── src/
│       ├── App.tsx               # Router with protected routes
│       ├── pages/                # 8 page components
│       │   ├── Index.tsx         # Dashboard
│       │   ├── DayTracker.tsx    # Daily progress
│       │   ├── MentalCoach.tsx   # AI mental wellness
│       │   ├── PhysicalCoach.tsx # Physical health + food analysis
│       │   ├── Roadmaps.tsx      # Career roadmaps
│       │   ├── Login.tsx / Register.tsx
│       │   └── NotFound.tsx
│       ├── components/           # Reusable components
│       │   ├── ProfileSection.tsx
│       │   ├── MentalCoachChatBoard.tsx
│       │   ├── HealthChatBoard.tsx
│       │   ├── ProtectedRoute.tsx
│       │   ├── dashboard/        # Dashboard-specific components
│       │   ├── navigation/       # Nav components
│       │   └── ui/               # shadcn/ui components
│       ├── lib/
│       │   └── api.ts            # API client class (all HTTP calls)
│       ├── contexts/
│       │   └── AuthContext.tsx    # Authentication context
│       └── hooks/                # Custom React hooks
│
├── backend/                      # Node.js + Express
│   ├── server.js                 # Express app entry point
│   ├── config/
│   │   └── database.js           # PostgreSQL pool configuration
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication middleware
│   │   ├── validation.js         # Zod schema validation
│   │   └── connectionManager.js  # DB connection management
│   ├── routes/                   # 13 route modules
│   │   ├── auth.js               # Register/Login
│   │   ├── user.js               # Profile CRUD
│   │   ├── dashboard.js          # Dashboard data
│   │   ├── scrape.js             # Trigger web scraping
│   │   ├── activity.js           # Activity tracking
│   │   ├── dailyTracking.js      # Daily progress
│   │   ├── mentalCoach.js        # AI mental wellness
│   │   ├── physicalCoach.js      # Food analysis, diet plans
│   │   ├── physical.js           # Physical metrics
│   │   ├── roadmaps.js           # Career path management
│   │   ├── progress.js           # Progress tracking
│   │   ├── goals.js              # Goal management
│   │   └── tracker.js            # Tracker data
│   ├── services/                 # Business logic
│   │   ├── scraping.js           # Web scraping (LeetCode, CodeChef, Codeforces)
│   │   ├── aiService.js          # AI/ML service (Groq + HuggingFace)
│   │   ├── dailyTrackingService.js
│   │   ├── dailySolvedService.js
│   │   ├── dailyProgressTracker.js
│   │   ├── roadmapScraper.js     # Roadmap.sh API scraping
│   │   ├── calculations.js       # BMI, streaks, progress
│   │   └── formatRoadmapData.js
│   ├── migrations/               # SQL migration files
│   ├── scripts/                  # DB setup scripts
│   └── data/                     # Static data (roadmaps)
```

---

## 4. WEB SCRAPING — THE CORE ENGINE

### 4.1 Why Web Scraping?
The coding platforms (LeetCode, CodeChef, Codeforces) don't all have official APIs. We use a combination of **public REST APIs** and **HTML scraping with Cheerio** to extract live solved-question counts.

> **Important Note:** Puppeteer is listed as a dependency and imported in `scraping.js`, but it is **never actually called** in any function. All scraping is handled by **Axios** (HTTP requests) and **Cheerio** (HTML parsing). Puppeteer was initially planned for JavaScript-rendered pages but was not needed since the CodeChef profile page serves static HTML and the other platforms have APIs.

### 4.2 LeetCode Scraping (API-based)

LeetCode stats are fetched using **third-party public APIs** with a fallback strategy:

```javascript
// Three API endpoints tried in sequence
const endpoints = [
  `https://leetcode-stats-api.herokuapp.com/${handle}`,
  `https://leetcode.com/api/problems/algorithms/`,
  `https://alfa-leetcode-api.onrender.com/${handle}/solved`
];
```

**How it works:**
- Uses `axios` to make HTTP GET requests to each endpoint sequentially
- Each API returns different JSON formats, so we handle all of them:
  - `response.data.totalSolved`
  - `response.data.solvedProblem`
  - `response.data.solved`
- If one API fails (timeout/error), it falls through to the next (failover pattern)
- Timeout is set to 10 seconds per request
- Custom User-Agent header to avoid being blocked

### 4.3 CodeChef Scraping (Cheerio HTML Parsing)

CodeChef has no public API, so we **scrape the user profile page HTML**:

```javascript
import * as cheerio from 'cheerio';

const url = `https://www.codechef.com/users/${handle}`;
const response = await axios.get(url, { headers });
const $ = cheerio.load(response.data);

// Target the "problems-solved" section
const solvedSection = $('section.rating-data-section.problems-solved');
const h3Elements = solvedSection.find('h3');

// Extract "Total Problems Solved: X" using regex
const match = text.match(/Total Problems Solved:\s*(\d+)/i);
```

**What is Cheerio?**
- Cheerio is a **server-side jQuery-like library** for parsing HTML
- It loads raw HTML and lets you use CSS selectors to find elements
- Unlike Puppeteer, it doesn't open a browser — it just parses the HTML string
- Much faster and lighter than Puppeteer, but can't handle JavaScript-rendered pages

**The scraping logic:**
1. Fetch the profile page HTML with `axios`
2. Load HTML into Cheerio: `cheerio.load(response.data)`
3. Find the section with class `rating-data-section problems-solved`
4. Look for `<h3>` elements matching "Total Problems Solved: X"
5. If not found, fallback to `<h5>` elements with parentheses pattern

### 4.4 Codeforces Scraping (Official API)

Codeforces has an **official public API**, so we use it directly:

```javascript
const url = `https://codeforces.com/api/user.status?handle=${handle}`;
const response = await axios.get(url);

// Filter accepted submissions and count unique problems
const solvedProblems = new Set();
for (const sub of submissions) {
  if (sub.verdict === 'OK') {
    const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
    solvedProblems.add(problemId);
  }
}
```

**Key logic:**
- Uses `user.status` API endpoint to get all submissions
- Filters only `verdict === 'OK'` (accepted) submissions
- Uses a `Set` to count **unique** problems (avoids counting re-submissions)
- Problem uniqueness = `contestId + index` (e.g., "1234-A")
- Also calculates **contest problems** and **streak** from submission dates

### 4.5 Daily Solved Calculation (Differential Tracking)

This is one of the most important algorithms — calculating **how many questions were solved TODAY**:

```javascript
// First update of the day → store current totals as "start reference"
if (!existingRecord) {
  referenceTotals = currentTotals;  // Baseline for today
  dailySolved = { leetcode: 0, codechef: 0, codeforces: 0 };
} else {
  // Subsequent updates → difference from morning baseline
  dailySolved = {
    leetcode: Math.max(0, currentTotals.leetcode - referenceTotals.leetcode),
    codechef: Math.max(0, currentTotals.codechef - referenceTotals.codechef),
    codeforces: Math.max(0, currentTotals.codeforces - referenceTotals.codeforces)
  };
}
```

**How it works:**
1. When user clicks "Update Stats" the **first time today**, we store the current total as the **start-of-day reference** (e.g., LeetCode = 150)
2. On **subsequent updates**, we scrape again (e.g., LeetCode = 153) and calculate: `153 - 150 = 3 solved today`
3. `Math.max(0, ...)` prevents negative values if APIs return inconsistent data
4. This data feeds into the Mental Coach AI to give personalized advice

---

## 5. AUTHENTICATION SYSTEM

### 5.1 Registration Flow

```javascript
// 1. Validate input with Zod schema
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6)
});

// 2. Check for existing user
const existingUser = await client.query(
  'SELECT id FROM users WHERE email = $1', [email]
);

// 3. Hash password with bcrypt (12 salt rounds)
const passwordHash = await bcrypt.hash(password, 12);

// 4. Database transaction — create user + profile + stats + goals
await client.query('BEGIN');
// INSERT INTO users ...
// INSERT INTO user_profiles ...
// INSERT INTO coding_stats ...
// INSERT INTO user_goals ...
await client.query('COMMIT');

// 5. Generate JWT token
const token = jwt.sign({ userId, email, name }, JWT_SECRET, { expiresIn: '7d' });
```

### 5.2 JWT Authentication Middleware

```javascript
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  });
};
```

- Token stored in `localStorage` on the frontend
- Sent as `Authorization: Bearer <token>` header
- Token expires in 7 days
- Protected routes use `<ProtectedRoute>` component that checks `localStorage`

---

## 6. DATABASE DESIGN (PostgreSQL)

### 6.1 Core Tables

```sql
-- Users (authentication)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    learning_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extended info + platform handles)
CREATE TABLE user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    leetcode_handle VARCHAR(100),
    codechef_handle VARCHAR(100),
    codeforces_handle VARCHAR(100),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    age INTEGER,
    gender VARCHAR(10),
    study_domain VARCHAR(100),
    skills TEXT[]
);

-- Coding statistics (scraped totals)
CREATE TABLE coding_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    leetcode_solved INTEGER DEFAULT 0,
    codechef_solved INTEGER DEFAULT 0,
    codeforces_solved INTEGER DEFAULT 0,
    codeforces_contest_solved INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 Daily Tracking Tables

```sql
-- Daily coding tracker (differential tracking)
CREATE TABLE daily_coding_tracker (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    prev_leetcode_total INTEGER DEFAULT 0,      -- Start-of-day baseline
    current_leetcode_total INTEGER DEFAULT 0,    -- Latest scraped value
    daily_leetcode_solved INTEGER DEFAULT 0,     -- Calculated difference
    -- (same for codechef, codeforces)
    total_daily_solved INTEGER DEFAULT 0,
    UNIQUE(user_id, tracking_date)
);

-- Daily solved questions (simplified version for AI service)
CREATE TABLE daily_solved_questions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    leetcode_solved_today INTEGER DEFAULT 0,
    codechef_solved_today INTEGER DEFAULT 0,
    codeforces_solved_today INTEGER DEFAULT 0,
    total_solved_today INTEGER DEFAULT 0,
    leetcode_start_total INTEGER DEFAULT 0,   -- Reference baseline
    leetcode_current_total INTEGER DEFAULT 0, -- Latest total
    UNIQUE(user_id, date)
);
```

### 6.3 Roadmap System Tables

```sql
-- User's selected career paths
CREATE TABLE user_career_paths (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    roadmap_id INTEGER NOT NULL,
    roadmap_name VARCHAR(255) NOT NULL,
    progress INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE implied by business logic
);

-- Individual module completion tracking
CREATE TABLE user_module_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    roadmap_id INTEGER NOT NULL,
    module_name VARCHAR(500) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    UNIQUE(user_id, roadmap_id, module_name)
);
```

### 6.4 Key SQL Patterns Used

**UPSERT (INSERT ON CONFLICT):**
```sql
INSERT INTO coding_stats (user_id, leetcode_solved, ...)
VALUES ($1, $2, ...)
ON CONFLICT (user_id) 
DO UPDATE SET leetcode_solved = EXCLUDED.leetcode_solved, last_updated = NOW();
```

**CTEs (Common Table Expressions) for Complex Queries:**
```sql
WITH daily_progress AS (
  SELECT user_id, COUNT(*) as total_active_days,
         SUM(problems_solved) as total_problems_today
  FROM daily_activity 
  WHERE user_id = $1 AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY user_id
),
career_progress AS ( ... ),
module_progress AS ( ... )
SELECT u.name, cs.leetcode_solved, dp.total_active_days, ...
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN daily_progress dp ON u.id = dp.user_id
WHERE u.id = $1;
```

**Database Transactions:**
```sql
BEGIN;
  INSERT INTO users ...;
  INSERT INTO user_profiles ...;
  INSERT INTO coding_stats ...;
COMMIT;
-- If any step fails → ROLLBACK
```

**Triggers for Auto-Timestamps:**
```sql
CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_career_paths_updated_at 
    BEFORE UPDATE ON career_paths 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Views for Complex Queries:**
```sql
CREATE VIEW user_progress_overview AS
SELECT u.id, u.name, cs.leetcode_solved, ...
FROM users u
LEFT JOIN coding_stats cs ON u.id = cs.user_id
LEFT JOIN user_goals ug ON u.id = ug.user_id;
```

**Indexes for Performance:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_daily_activity_user_date ON daily_activity(user_id, activity_date);
CREATE INDEX idx_career_paths_user_id ON career_paths(user_id);
```

---

## 7. AI/ML INTEGRATION

### 7.1 Mental Wellness Coach

**Architecture:** User message → Sentiment Analysis → Context Gathering → LLM Response

**Step 1 — Sentiment Analysis (Hugging Face):**
```javascript
// Uses Cardiff NLP's Twitter RoBERTa model
const result = await hf.textClassification({
  model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
  inputs: userMessage
});
// Returns: { label: 'positive'/'negative'/'neutral', score: 0.95 }
```

**What is RoBERTa?**
- A transformer-based NLP model fine-tuned for sentiment classification
- Classifies text into positive, negative, or neutral
- We use the Hugging Face Inference API (cloud-hosted model)

**Step 2 — Context Gathering (Complex SQL):**
- Fetches user's coding stats, career progress, streak data, goals
- Calculates stress indicators (burnout risk, late-night sessions)
- Generates a comprehensive `mentalHealthContext` object

**Step 3 — LLM Response (Groq API):**
```javascript
const completion = await groq.chat.completions.create({
  messages: [
    { role: 'system', content: systemPrompt },  // Persona + user context
    { role: 'user', content: userMessage }
  ],
  model: 'openai/gpt-oss-20b',
  temperature: 0.7,
  max_tokens: 500
});
```

**Why Groq?**
- Groq provides ultra-fast LLM inference (specialized hardware)
- We use the `gpt-oss-20b` model via Groq's API
- System prompt includes all user context (coding stats, today's progress, mood)

### 7.2 Physical Coach — Food Image Analysis

**Flow:** Image Upload → ML Classification → Nutrition Lookup → BMI-based Recommendations

```javascript
// Step 1: Upload handled by Multer (memory storage, 5MB limit)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });

// Step 2: Image classification via Hugging Face
const result = await hf.imageClassification({
  model: 'nateraw/food',  // Food classification model
  data: imageBuffer
});

// Step 3: Map to Indian food items
const indianFoodMapping = {
  'rice': 'rice', 'fried rice': 'biryani', 'bread': 'chapati',
  'pancake': 'dosa', 'curry': 'curry', 'soup': 'dal', ...
};

// Step 4: Get nutrition info + BMI-based recommendations
const bmi = weight_kg / (height_m * height_m);
```

### 7.3 BMI Calculation & Diet Plan Generation

```javascript
// BMI Formula
const bmi = weightKg / Math.pow(heightCm / 100, 2);

// BMI Categories
if (bmi < 18.5) → 'Underweight' → High-calorie diet plan
if (bmi < 25)   → 'Normal'      → Balanced maintenance plan
if (bmi < 30)   → 'Overweight'  → Calorie-controlled plan
if (bmi >= 30)  → 'Obese'       → Safe weight loss plan

// BMR (Basal Metabolic Rate) for calorie targets
// Daily calorie needs = BMR × activity level multiplier
```

---

## 8. CAREER ROADMAPS SYSTEM

### 8.1 Data Sources
- **Primary:** Roadmap.sh API (scraping 85+ career roadmaps)
- **Fallback:** Static roadmap data with 11 career paths

### 8.2 Roadmap Scraper
```javascript
// Tries multiple API endpoints for each roadmap
const endpoints = [
  `https://api.roadmap.sh/v1/roadmaps/${slug}`,
  `https://roadmap.sh/${slug}.json`,
  // ... more fallbacks
];
// Rate-limited: 1.5s delay between requests
```

### 8.3 Module Completion Tracking
- User selects a roadmap → modules created in `user_module_progress`
- Checking a module → updates `completed`, `completed_at`, recalculates progress %
- Progress % = `(completed_modules / total_modules) × 100`
- Streak tracking: consecutive days with module completions

---

## 9. API ENDPOINTS (REST)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/profile` | Update profile |
| GET | `/api/dashboard` | Dashboard data |
| POST | `/api/scrape/update` | Trigger web scraping |
| POST | `/api/mental-coach/chat` | AI mental wellness chat |
| GET | `/api/mental-coach/insights` | Mental health insights |
| POST | `/api/physical-coach/food-analysis` | Food image analysis |
| POST | `/api/physical-coach/diet-plan` | Generate diet plan |
| POST | `/api/physical-coach/exercise-plan` | Generate exercise plan |
| GET | `/api/physical-coach/metrics` | Get BMI & metrics |
| GET | `/api/roadmaps/templates` | Get roadmap templates |
| POST | `/api/roadmaps/select-roadmap` | Select a roadmap |
| PUT | `/api/roadmaps/module-completion` | Toggle module completion |
| GET | `/api/daily-tracking/today` | Today's solved count |
| POST | `/api/daily-tracking/track-today` | Track today's progress |
| GET/PUT | `/api/activity/goals/:year/:month` | Monthly goals |
| GET | `/api/activity/streak/current` | Current streak |
| GET | `/health` | Health check |

---

## 10. SECURITY MEASURES

1. **Helmet.js** — Sets secure HTTP headers (XSS protection, HSTS, etc.)
2. **CORS whitelist** — Only allows requests from specified frontend origins
3. **bcrypt hashing** — Passwords hashed with 12 salt rounds (never stored in plain text)
4. **JWT tokens** — Stateless auth, 7-day expiry, sent as Bearer token
5. **Zod validation** — All request bodies validated against schemas before processing
6. **SQL parameterization** — All queries use `$1, $2` placeholders (prevents SQL injection)
7. **Multer file filtering** — Only image MIME types accepted for food analysis
8. **Environment variables** — Secrets stored in `.env` file, never committed to Git
9. **Graceful shutdown** — SIGTERM/SIGINT handlers close DB pool properly

---

## 11. KEY DESIGN PATTERNS

### Failover/Retry Pattern (Scraping)
Multiple API endpoints tried sequentially; if one fails, the next is attempted.

### Repository Pattern
Services encapsulate all database operations (e.g., `DailySolvedService`, `DailyTrackingService`).

### Middleware Chain
`Request → Helmet → CORS → JSON Parser → Logger → Auth → Validation → Route Handler → Error Handler`

### Differential Tracking
Daily solved = Current Total − Start-of-Day Reference (baseline comparison pattern).

### UPSERT Pattern
`INSERT ON CONFLICT DO UPDATE` ensures idempotent operations.

### Transaction Pattern
Multi-table writes wrapped in `BEGIN/COMMIT/ROLLBACK` for atomicity.

### Context-Aware AI
User's complete context (stats, progress, mood, time of day) injected into AI system prompts.

---

## 12. FRONTEND ARCHITECTURE

### State Management
- **React Query** for server state (caching, refetching, stale data)
- **React Context** for auth state (user logged in/out)
- **React Hooks** for component-level state
- **localStorage** for JWT token persistence

### Routing (React Router v6)
```tsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
  <Route path="/mental" element={<ProtectedRoute><MentalCoach /></ProtectedRoute>} />
  <Route path="/physical" element={<ProtectedRoute><PhysicalCoach /></ProtectedRoute>} />
  <Route path="/roadmaps" element={<ProtectedRoute><Roadmaps /></ProtectedRoute>} />
  <Route path="/tracker" element={<ProtectedRoute><DayTracker /></ProtectedRoute>} />
</Routes>
```

### API Client Pattern
Singleton `ApiClient` class with methods for every endpoint, automatic auth header injection, and response normalization.

---

## 13. COMMON INTERVIEW Q&A

**Q: Why did you choose PostgreSQL over MongoDB?**
A: Our data is highly relational — users have profiles, coding stats, goals, roadmaps with milestones, daily tracking. SQL with JOINs, transactions, and constraints (foreign keys, unique) was the natural fit. PostgreSQL also supports arrays (`TEXT[]` for skills) and JSON when needed.

**Q: Why is Puppeteer in your dependencies if you don't use it?**
A: Puppeteer was initially added as a planned fallback for JavaScript-rendered pages (e.g., if LeetCode required browser rendering). However, we found that all three platforms could be scraped without it — LeetCode has third-party APIs, CodeChef serves static HTML (parsed with Cheerio), and Codeforces has an official API. So Puppeteer remains as an unused import. In a production cleanup, we would remove it to reduce the bundle size (~300MB for Chromium).

**Q: How do you handle API failures during scraping?**
A: Failover pattern — we try multiple API endpoints sequentially. If all fail, we return 0 and log the error. The app continues working with cached data in the database. Each API call has a 10-20 second timeout.

**Q: How does the daily solved tracking work?**
A: Differential tracking. First update of the day stores total as baseline. Subsequent updates calculate: `today_solved = current_total - start_of_day_total`. This avoids needing submission-level data that some APIs don't provide.

**Q: How is the AI personalized?**
A: We build a comprehensive context object with 30+ data points — coding stats, today's progress, career progress, streak, time of day, stress indicators — and inject it into the system prompt. The AI (Groq LLM) generates responses that reference the user's actual data.

**Q: How do you prevent SQL injection?**
A: All queries use parameterized statements: `$1, $2, $3` placeholders. No string concatenation of user input into SQL. Zod validates all input before it reaches the database layer.

**Q: What is the connection pooling strategy?**
A: PostgreSQL pool configured with min 2, max 15 connections, 30s connection timeout, 60s idle timeout. Pool events (`connect`, `error`) are logged. Graceful shutdown closes the pool on SIGTERM/SIGINT.

**Q: How does the food image analysis pipeline work?**
A: Image uploaded via Multer (memory storage) → Buffer sent to HuggingFace image classification model → Top prediction mapped to Indian food dictionary → Nutrition info retrieved → BMI calculated → Personalized diet recommendations generated.

**Q: What happens when the user registers?**
A: Database transaction creates 4 records atomically: `users` (auth), `user_profiles` (extended info), `coding_stats` (initialized to 0), `user_goals` (default targets). If any INSERT fails, the entire transaction rolls back.

**Q: How are roadmap progress percentages calculated?**
A: `progress = Math.round((completed_modules / total_modules) * 100)`. Updated via a helper function every time a module is toggled. Uses SQL aggregation with `COUNT(CASE WHEN completed = true THEN 1 END)`.
