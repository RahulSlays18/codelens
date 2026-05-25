// ─── DOM REFS ─────────────────────────────────────────────────────────
const codeInput   = document.getElementById('code-input');
const langSelect  = document.getElementById('lang');
const lineCount   = document.getElementById('line-count');
const analyzeBtn  = document.getElementById('analyze-btn');
const btnText     = document.getElementById('btn-text');
const btnSpinner  = document.getElementById('btn-spinner');
const clearBtn    = document.getElementById('clear-btn');
const toast       = document.getElementById('toast');

const graphEmpty  = document.getElementById('graph-empty');
const graphDot    = document.getElementById('graph-dot');
const graphStatus = document.getElementById('graph-status');

const dashDot     = document.getElementById('dash-dot');
const dashStatus  = document.getElementById('dash-status');
const timeVal     = document.getElementById('time-val');
const timeSub     = document.getElementById('time-sub');
const spaceVal    = document.getElementById('space-val');
const spaceSub    = document.getElementById('space-sub');
const tipText     = document.getElementById('tip-text');

const apiDot      = document.getElementById('api-dot');
const apiLabel    = document.getElementById('api-label');
const statusText  = document.getElementById('status-text');

// ─── LINE COUNT ───────────────────────────────────────────────────────
codeInput.addEventListener('input', () => {
  const lines = codeInput.value.split('\n').length;
  lineCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
});

// ─── CLEAR ────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  codeInput.value = '';
  lineCount.textContent = '0 lines';
  resetDashboard();
});

function resetDashboard() {
  timeVal.textContent  = '—';
  spaceVal.textContent = '—';
  timeSub.textContent  = '';
  spaceSub.textContent = '';
  tipText.textContent  = 'Run an analysis to get an AI-powered suggestion here.';
  graphDot.classList.remove('active');
  dashDot.classList.remove('active');
  graphStatus.textContent = 'Awaiting analysis';
  dashStatus.textContent  = '—';
  statusText.textContent  = 'Ready';
  const cyContainer = document.getElementById('cy-container');
  if (cyInstance) { cyInstance.destroy(); cyInstance = null; }
  if (cyContainer) cyContainer.style.display = 'none';
  graphEmpty.style.display = 'flex';
  graphEmpty.querySelector('p').textContent = 'Execution graph will render here after analysis';
}

// ─── ANALYZE BUTTON ───────────────────────────────────────────────────
analyzeBtn.addEventListener('click', handleAnalyze);

async function handleAnalyze() {
  const code = codeInput.value.trim();
  if (!code) { showToast('Please paste some code first.'); return; }

  setLoading(true);
  statusText.textContent = 'Calling Groq API…';

  try {
    const result = await callGroqAPI(code, langSelect.value);
    populateResults(result);
  } catch (err) {
    showToast('API error: ' + err.message);
    statusText.textContent = 'Error';
  } finally {
    setLoading(false);
  }
}

// ─── LOADING STATE ────────────────────────────────────────────────────
function setLoading(on) {
  analyzeBtn.disabled      = on;
  btnText.style.display    = on ? 'none' : 'flex';
  btnSpinner.style.display = on ? 'block' : 'none';
}

// ─── POPULATE RESULTS ─────────────────────────────────────────────────
function populateResults(data) {
  const c = data.complexity || {};
  timeVal.textContent  = c.time  || '—';
  spaceVal.textContent = c.space || '—';
  timeSub.textContent  = c.timeExplain  || '';
  spaceSub.textContent = c.spaceExplain || '';
  tipText.textContent  = c.tip || 'No tip provided.';

  graphDot.classList.add('active');
  dashDot.classList.add('active');
  graphStatus.textContent = `${(data.nodes||[]).length} nodes · ${(data.edges||[]).length} edges`;
  dashStatus.textContent  = 'Analysis complete';
  statusText.textContent  = '✓ Analysis complete';
  apiDot.classList.add('ready');
  apiLabel.textContent = 'Groq: Connected ✓';

  renderGraph(data.nodes || [], data.edges || []);
}

// ─── DEMO DATA ────────────────────────────────────────────────────────
function populateDemoData() {
  populateResults({
    nodes: [
      { id:'n1', label:'Entry: binarySearch', type:'entry' },
      { id:'n2', label:'while left ≤ right', type:'loop' },
      { id:'n3', label:'mid = floor((l+r)/2)', type:'assign' },
      { id:'n4', label:'if arr[mid] === target', type:'condition' },
      { id:'n5', label:'return mid', type:'return' },
      { id:'n6', label:'if arr[mid] < target', type:'condition' },
      { id:'n7', label:'left = mid + 1', type:'assign' },
      { id:'n8', label:'right = mid - 1', type:'assign' },
      { id:'n9', label:'return -1', type:'return' },
    ],
    edges: [
      {source:'n1',target:'n2'},{source:'n2',target:'n3'},
      {source:'n3',target:'n4'},{source:'n4',target:'n5'},
      {source:'n4',target:'n6'},{source:'n6',target:'n7'},
      {source:'n6',target:'n8'},{source:'n2',target:'n9'},
    ],
    complexity: {
      time: 'O(log n)',
      timeExplain: 'The search space is halved on each iteration of the while loop.',
      space: 'O(1)',
      spaceExplain: 'Only two integer pointers are maintained — no extra data structures.',
      tip: '[Demo] Consider returning the insertion index on miss to support sorted-insert use cases.',
    }
  });
  dashStatus.textContent = '⚠ Demo data — add API key for real analysis';
}

// ─── TOAST ────────────────────────────────────────────────────────────
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}