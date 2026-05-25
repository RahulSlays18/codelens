# ⌬ CodeLens

**AI-powered code complexity analyzer with execution flow visualization and competitive challenges.**

🔗 **Live Site:** [codelens-44i6.onrender.com](https://codelens-44i6.onrender.com)

---

## What is CodeLens?

CodeLens is a web app that helps developers understand their code better. Paste any snippet of C, C++, Python, or Java code and get an instant AI-powered breakdown of:

- **Time & Space Complexity** — Big O analysis with explanations
- **Execution Flow Graph** — Visual graph showing how your code runs, built with Cytoscape.js
- **Optimization Tips** — Concrete AI suggestions to improve your code

---

## Features

### 🔍 Code Analysis
- Paste code in C, C++, Python, or Java
- Get instant Time and Space complexity (e.g. `O(n log n)`, `O(1)`)
- See a detailed explanation of why the complexity is what it is
- Get a specific optimization tip powered by Llama 3.3 via Groq

### 📊 Execution Flow Graph
- Visual node graph showing the execution path of your code
- Color coded node types:
  - 🟢 Entry
  - 🔴 Return
  - 🟣 Condition (if/else)
  - 🟠 Loop (while/for)
  - 🔵 Function call
  - ⬛ Assignment
- Zoom, pan, and click nodes to explore

### 👤 Accounts
- Register and log in securely
- JWT-based authentication
- Passwords hashed with bcrypt

### 💾 Save & History
- Save any analysis to your account
- View your last 20 saved analyses
- Click any saved entry to reload the code into the editor

### ↗ Share
- Generate a unique challenge link to share your analysis
- Copy analysis as text
- Download the execution graph as a PNG image
- Tweet your results directly

### ⚔ Competitor System
- Search for other CodeLens users
- Send competitor requests
- Accept or decline incoming requests
- Both users see each other in their competitor list after accepting
- Bell notification icon shows pending requests in real time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Graph | Cytoscape.js |
| Backend | Node.js + Express |
| Database | SQLite via better-sqlite3 |
| AI | Llama 3.3 70B via Groq API |
| Auth | JWT + bcrypt |
| Hosting | Render |

---

## Running Locally

### 1. Clone the repo
```bash
git clone https://github.com/RahulSlays18/codelens.git
cd codelens
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create a `.env` file
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=any_random_secret_string
PORT=3000

Get a free Groq API key at [console.groq.com](https://console.groq.com)

### 4. Create `js/config.local.js`
```js
const CONFIG = {
  apiKey: 'your_groq_api_key'
};
```

### 5. Start the server
```bash
node server.js
```

### 6. Open in browser
http://localhost:3000

---

## Project Structure
codelens/
├── server.js          # Express server, all API routes
├── db.js              # SQLite database setup
├── index.html         # Main app page
├── login.html         # Login & register page
├── css/
│   ├── variables.css  # Design tokens
│   ├── layout.css     # Header, grid, statusbar
│   ├── input.css      # Code input panel
│   └── panels.css     # Graph & dashboard panels
├── js/
│   ├── main.js        # Core app logic
│   ├── api.js         # Groq API call
│   ├── graph.js       # Cytoscape graph rendering
│   ├── auth-ui.js     # Auth-aware UI (login state, modals)
│   └── config.js      # Config template
└── .env               # Secret keys (not in repo)

---

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/analyze` | Analyze code with Groq AI |
| POST | `/register` | Create account |
| POST | `/login` | Login and get JWT |
| POST | `/save` | Save an analysis |
| GET | `/history` | Get saved analyses |
| GET | `/users/search` | Search users |
| POST | `/competitor/request` | Send competitor request |
| GET | `/competitor/requests` | Get pending requests |
| POST | `/competitor/respond` | Accept or decline request |
| GET | `/competitor/accepted` | Get accepted competitors |
| POST | `/challenge/create` | Create a challenge |
| POST | `/challenge/submit` | Submit and judge a challenge |
| GET | `/challenge/:id` | Get challenge result |

---

## Made by

**Rahul Pandey** — [github.com/RahulSlays18](https://github.com/RahulSlays18)

> Built as a learning project exploring AI integration, graph visualization, and full stack Node.js development.