---
name: html-preview
description: Serve interactive HTML as a live preview URL. Use for reports, dashboards, prototypes, visualizations, landing pages, or any content where the user should see it in a browser rather than download a file.
---

## When to use

Use this skill whenever you produce HTML that the user should **view interactively**:

- Market analysis reports with charts, tables, or rich formatting
- UI mockups and interactive prototypes
- Data visualizations and dashboards
- Landing page previews and design concepts
- Comparison matrices or feature tables
- Any content where interactivity adds value over a static PDF

## When NOT to use

- For plain text or markdown responses (just reply in chat)
- For PDFs that need to be archived (use `upload_artifact` instead)
- For code files the user needs to download

---

## Standard CDN Stack

**Always include these in every HTML preview — copy exactly as shown:**

```html
<!-- Tailwind CSS (utility classes, responsive layout) -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Chart.js (bar, line, doughnut, radar, scatter charts) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>

<!-- Lucide icons (clean SVG icons) -->
<script src="https://cdn.jsdelivr.net/npm/lucide@1.8.0/dist/umd/lucide.min.js"></script>

<!-- Inter font (clean, modern type) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## Master Template

Use this as your base. Fill in content — do not strip libraries or simplify the design:

```html
<!DOCTYPE html>
<html lang="en" class="bg-gray-950 text-gray-100">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Report Title</title>

  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lucide@1.8.0/dist/umd/lucide.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style>
    body { font-family: 'Inter', system-ui, sans-serif; }
    canvas { max-width: 100%; }
    @media print {
      .no-print { display: none; }
      body { background: white; color: black; }
    }
  </style>
</head>
<body class="min-h-screen bg-gray-950 text-gray-100">

  <!-- Header -->
  <header class="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10 no-print">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-white">Report Title</h1>
        <p class="text-sm text-gray-400 mt-0.5">Generated · April 2026</p>
      </div>
      <span class="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">Live Report</span>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

    <!-- KPI cards -->
    <section>
      <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Key Metrics</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <!-- Repeat for each KPI -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p class="text-xs text-gray-500 mb-1">Market Size</p>
          <p class="text-2xl font-bold text-white">$4.2B</p>
          <p class="text-xs text-emerald-400 mt-1">↑ 18% YoY</p>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p class="text-xs text-gray-500 mb-1">Competitors</p>
          <p class="text-2xl font-bold text-white">12</p>
          <p class="text-xs text-gray-500 mt-1">Analyzed</p>
        </div>
      </div>
    </section>

    <!-- Tabs -->
    <section>
      <div class="flex gap-1 border-b border-gray-800 mb-6 no-print">
        <button onclick="showTab('overview')" id="tab-overview"
          class="tab-btn px-4 py-2 text-sm font-medium text-indigo-400 border-b-2 border-indigo-400">
          Overview
        </button>
        <button onclick="showTab('competitors')" id="tab-competitors"
          class="tab-btn px-4 py-2 text-sm font-medium text-gray-400 border-b-2 border-transparent hover:text-white">
          Competitors
        </button>
        <button onclick="showTab('data')" id="tab-data"
          class="tab-btn px-4 py-2 text-sm font-medium text-gray-400 border-b-2 border-transparent hover:text-white">
          Data
        </button>
      </div>

      <div id="panel-overview" class="tab-panel space-y-6">
        <!-- Overview content -->
      </div>
      <div id="panel-competitors" class="tab-panel hidden space-y-6">
        <!-- Competitor content -->
      </div>
      <div id="panel-data" class="tab-panel hidden space-y-6">
        <!-- Data tables -->
      </div>
    </section>

    <!-- Chart example -->
    <section class="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 class="text-base font-semibold text-white mb-4">Market Growth</h2>
      <div class="h-64">
        <canvas id="growthChart"></canvas>
      </div>
    </section>

    <!-- Sortable table -->
    <section class="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 class="text-base font-semibold text-white mb-4">Competitor Landscape</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm" id="competitorTable">
          <thead>
            <tr class="border-b border-gray-800 text-left">
              <th class="pb-3 text-gray-400 font-medium cursor-pointer hover:text-white" onclick="sortTable('competitorTable',0)">Company ↕</th>
              <th class="pb-3 text-gray-400 font-medium cursor-pointer hover:text-white" onclick="sortTable('competitorTable',1)">ARR ↕</th>
              <th class="pb-3 text-gray-400 font-medium cursor-pointer hover:text-white" onclick="sortTable('competitorTable',2)">Score ↕</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            <tr class="hover:bg-gray-800/50 transition-colors">
              <td class="py-3 text-gray-200">Competitor A</td>
              <td class="py-3 text-gray-300">$12M</td>
              <td class="py-3">
                <span class="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">8.2/10</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Collapsible sections (for long content) -->
    <section class="space-y-3">
      <details class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group">
        <summary class="px-6 py-4 cursor-pointer font-medium text-white flex items-center justify-between list-none">
          <span>Section Title</span>
          <span class="text-gray-500 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div class="px-6 pb-5 text-gray-300 text-sm leading-relaxed border-t border-gray-800 pt-4">
          Content here…
        </div>
      </details>
    </section>

  </main>

  <script>
    // Tab switching
    function showTab(id) {
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('text-indigo-400', 'border-indigo-400');
        b.classList.add('text-gray-400', 'border-transparent');
      });
      document.getElementById('panel-' + id).classList.remove('hidden');
      const btn = document.getElementById('tab-' + id);
      btn.classList.add('text-indigo-400', 'border-indigo-400');
      btn.classList.remove('text-gray-400', 'border-transparent');
    }

    // Sortable tables
    function sortTable(tableId, col) {
      const table = document.getElementById(tableId);
      const tbody = table.tBodies[0];
      const rows = Array.from(tbody.rows);
      const asc = table.dataset.sort !== String(col);
      rows.sort((a, b) => {
        const av = a.cells[col].textContent.trim();
        const bv = b.cells[col].textContent.trim();
        return asc
          ? av.localeCompare(bv, undefined, { numeric: true })
          : bv.localeCompare(av, undefined, { numeric: true });
      });
      rows.forEach(r => tbody.appendChild(r));
      table.dataset.sort = asc ? String(col) : '';
    }

    // Chart.js example — bar chart
    new Chart(document.getElementById('growthChart'), {
      type: 'bar',
      data: {
        labels: ['2021', '2022', '2023', '2024', '2025'],
        datasets: [{
          label: 'Market Size ($B)',
          data: [1.2, 1.8, 2.4, 3.1, 4.2],
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#9ca3af' } }
        },
        scales: {
          x: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
          y: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } }
        }
      }
    });

    // Init Lucide icons
    lucide.createIcons();
  </script>
</body>
</html>
```

---

## Chart Patterns

Use these Chart.js patterns. Always set `responsive: true` and `maintainAspectRatio: false` with a fixed-height container.

**Line chart (trends over time):**
```js
new Chart(document.getElementById('myChart'), {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
      label: 'Revenue',
      data: [30, 45, 38, 60, 72],
      borderColor: 'rgba(99, 102, 241, 1)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#9ca3af' } } },
    scales: {
      x: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
      y: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } }
    }
  }
});
```

**Doughnut chart (market share / composition):**
```js
new Chart(document.getElementById('shareChart'), {
  type: 'doughnut',
  data: {
    labels: ['Segment A', 'Segment B', 'Segment C'],
    datasets: [{
      data: [45, 30, 25],
      backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)'],
      borderWidth: 0,
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#9ca3af' } }
    }
  }
});
```

**Multi-dataset bar (comparison):**
```js
new Chart(document.getElementById('compareChart'), {
  type: 'bar',
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      { label: 'Product A', data: [12, 19, 15, 22], backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 4 },
      { label: 'Product B', data: [8, 14, 18, 16],  backgroundColor: 'rgba(16,185,129,0.7)',  borderRadius: 4 }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#9ca3af' } } },
    scales: {
      x: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
      y: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } }
    }
  }
});
```

---

## Score / Badge Patterns

Use these for ratings, viability scores, and status indicators:

```html
<!-- Score badge (green/yellow/red based on value) -->
<span class="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30">8.4/10</span>
<span class="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/30">5.1/10</span>
<span class="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/30">2.3/10</span>

<!-- Progress bar -->
<div class="w-full bg-gray-800 rounded-full h-2">
  <div class="bg-indigo-500 h-2 rounded-full" style="width: 84%"></div>
</div>

<!-- Status pill -->
<span class="bg-emerald-500/10 text-emerald-400 text-xs font-medium px-3 py-1 rounded-full">High Demand</span>
<span class="bg-amber-500/10 text-amber-400 text-xs font-medium px-3 py-1 rounded-full">Moderate</span>
<span class="bg-red-500/10 text-red-400 text-xs font-medium px-3 py-1 rounded-full">Saturated</span>
```

---

## Lucide Icons

After including the Lucide CDN and calling `lucide.createIcons()`, use icons like:

```html
<i data-lucide="trending-up" class="w-4 h-4 text-emerald-400 inline-block"></i>
<i data-lucide="users" class="w-5 h-5 text-indigo-400"></i>
<i data-lucide="bar-chart-2" class="w-5 h-5 text-gray-400"></i>
<i data-lucide="alert-circle" class="w-4 h-4 text-amber-400"></i>
```

Common icons: `trending-up`, `trending-down`, `bar-chart-2`, `pie-chart`, `users`, `globe`, `zap`, `target`, `alert-circle`, `check-circle`, `x-circle`, `arrow-right`, `external-link`

---

## Design Rules

**Always:**
- Use `bg-gray-950` body + `bg-gray-900` cards + `border-gray-800` borders
- Use `text-white` for headings, `text-gray-300` for body, `text-gray-500` for labels
- Use `indigo-500` as primary accent, `emerald-500` for positive, `red-500` for negative, `amber-500` for warning
- Use `rounded-xl` for cards, `rounded-full` for badges
- Wrap charts in a `div` with fixed height: `<div class="h-64"><canvas id="..."></canvas></div>`
- Include sticky header with report title and generation date
- Make tables `overflow-x-auto` for mobile

**Never:**
- Use `#f5f5f5` or default browser styles
- Leave charts without axis label colors (they default to black on dark backgrounds)
- Use external images without a fallback
- Skip the viewport meta tag

---

## How to use

1. **Build the HTML** using the master template above
2. **Write to disk:**
```
Write({ file_path: "/data/groups/webchat/report.html", content: "..." })
```
3. **Serve as preview:**
```
mcp__pepper__preview_html({
  file_path: "/data/groups/webchat/report.html",
  title: "Market Analysis Report"
})
```
4. **Share the URL** returned by the tool
5. **Also upload as artifact** for persistence:
```
mcp__pepper__upload_artifact({
  file_path: "/data/groups/webchat/report.html",
  title: "Market Analysis (HTML)"
})
```
