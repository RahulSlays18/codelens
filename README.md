# CodeLens — AI Code Analyzer

An AI-powered code analysis tool that generates execution flow graphs and complexity analysis for C, C++, Python, and Java code.

## Project Structure

```
codelens/
├── index.html          ← Open this in your browser
├── README.md
├── css/
│   ├── variables.css   ← CSS custom properties & reset
│   ├── layout.css      ← Header, app grid, panels, statusbar
│   ├── input.css       ← Code input panel, buttons, spinner
│   └── panels.css      ← Graph panel, dashboard, tooltip, toast
└── js/
    ├── config.js       ← API key & model config  ← EDIT THIS
    ├── api.js          ← Groq API call
    ├── graph.js        ← Cytoscape.js graph renderer
    └── main.js         ← DOM refs, events, dashboard logic
```

## Setup

1. Get a free Groq API key at https://console.groq.com
2. Open `js/config.js` and paste your key:
   ```js
   apiKey: 'gsk_XXXXXXXXXXXXXXXXXXXX',
   ```
3. Open `index.html` in your browser — done!

> **Note:** Cytoscape.js loads from CDN. Make sure you have internet when opening the file.
> If offline, download `cytoscape.min.js` from https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js
> and update the script tag in `index.html` to `<script src="cytoscape.min.js">`.

## Supported Languages
- C
- C++
- Python
- Java

## Features
- Execution flow graph with colour-coded nodes
- Time & space complexity analysis
- AI-powered optimization tips
- Demo mode (no API key needed to preview)
