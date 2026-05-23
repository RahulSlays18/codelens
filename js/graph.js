// ─── CYTOSCAPE GRAPH RENDERER ────────────────────────────────────────
let cyInstance = null;

const NODE_COLORS = {
  entry:     { bg: '#00e5c3', border: '#00c9aa', text: '#0a0c10' },
  return:    { bg: '#ff4d6d', border: '#e0334f', text: '#fff' },
  condition: { bg: '#7c6fcd', border: '#6357b5', text: '#fff' },
  loop:      { bg: '#ff6b35', border: '#e05520', text: '#fff' },
  call:      { bg: '#3b9eff', border: '#1e7fe0', text: '#fff' },
  assign:    { bg: '#1f2430', border: '#2e3650', text: '#9ab' },
};

function renderGraph(nodes, edges) {
  const container = document.getElementById('cy-container');
  const empty     = document.getElementById('graph-empty');

  // Hide empty state, show canvas
  empty.style.display     = 'none';
  container.style.display = 'block';

  // Destroy previous instance
  if (cyInstance) { cyInstance.destroy(); cyInstance = null; }

  // Build Cytoscape elements
  const elements = [
    ...nodes.map(n => ({
      data: { id: n.id, label: n.label || n.id, type: n.type || 'assign' }
    })),
    ...edges.map((e, i) => ({
      data: { id: `e${i}`, source: e.source, target: e.target }
    }))
  ];

  cyInstance = cytoscape({
    container,
    elements,
    layout: {
      name: 'breadthfirst',
      directed: true,
      padding: 24,
      spacingFactor: 1.3,
      avoidOverlap: true,
    },
    style: [
      {
        selector: 'node',
        style: {
          'label':              'data(label)',
          'text-valign':        'center',
          'text-halign':        'center',
          'text-wrap':          'wrap',
          'text-max-width':     '110px',
          'font-family':        'JetBrains Mono, monospace',
          'font-size':          '10px',
          'font-weight':        '600',
          'padding':            '10px',
          'width':              'label',
          'height':             'label',
          'shape':              'roundrectangle',
          'background-color':   '#1f2430',
          'border-width':       '1.5px',
          'border-color':       '#2e3650',
          'color':              '#9ab',
          'transition-property':'background-color border-color',
          'transition-duration':'0.2s',
        }
      },
      // Per-type colours
      ...Object.entries(NODE_COLORS).map(([type, c]) => ({
        selector: `node[type = "${type}"]`,
        style: {
          'background-color': c.bg,
          'border-color':     c.border,
          'color':            c.text,
        }
      })),
      {
        selector: 'node:selected',
        style: {
          'border-width': '3px',
          'border-color': '#00e5c3',
        }
      },
      {
        selector: 'edge',
        style: {
          'width':              2,
          'line-color':         '#2e3650',
          'target-arrow-color': '#2e3650',
          'target-arrow-shape': 'triangle',
          'curve-style':        'bezier',
          'arrow-scale':        1.1,
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color':         '#00e5c3',
          'target-arrow-color': '#00e5c3',
        }
      }
    ],
    userZoomingEnabled:   true,
    userPanningEnabled:   true,
    boxSelectionEnabled:  false,
    autoungrabify:        false,
  });

  // Fit after layout
  cyInstance.on('layoutstop', () => cyInstance.fit(undefined, 20));
}
