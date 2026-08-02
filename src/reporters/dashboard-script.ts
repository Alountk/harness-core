export const DASHBOARD_CLIENT_SCRIPT = `
document.addEventListener('DOMContentLoaded', () => {
  const rawData = JSON.parse(document.getElementById('benchmark-data').textContent);
  document.getElementById('genDate').innerText = new Date().toLocaleString();

  const total = rawData.length;
  const passed = rawData.filter(r => r.status === 'PASSED').length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  const totalDuration = rawData.reduce((acc, r) => acc + r.durationMs, 0);
  const avgLatency = total > 0 ? Math.round(totalDuration / total) : 0;

  // Calcular métricas agregadas de tokens
  let totalCompletionTokens = 0;
  let totalPromptTokens = 0;
  let totalTokensCount = 0;

  rawData.forEach(r => {
    if (r.evalResult?.details?.usage) {
      // Si el evaluador o metadata guarda el usage
    }
  });

  document.getElementById('statTotal').innerText = total;
  document.getElementById('statPassRate').innerText = passRate + '%';
  document.getElementById('statAvgLatency').innerText = avgLatency.toLocaleString() + ' ms';

  const modelStats = {};
  const testCasesSet = new Set();
  const testCaseNames = {};

  rawData.forEach(r => {
    let modelName = 'Default Model';
    let cleanTestId = r.testId;

    const match = r.testId.match(/^(.*?)\\s*\\[(.*?)\\]$/);
    if (match) {
      cleanTestId = match[1].trim();
      modelName = match[2].trim();
    } else if (r.testId.includes(' [')) {
      const parts = r.testId.split(' [');
      cleanTestId = parts[0].trim();
      modelName = parts[1].replace(']', '').trim();
    }

    testCaseNames[cleanTestId] = r.name || cleanTestId;
    testCasesSet.add(cleanTestId);

    if (!modelStats[modelName]) {
      modelStats[modelName] = { totalMs: 0, count: 0, scores: [], tests: {}, totalTokens: 0, completionTokens: 0 };
    }
    modelStats[modelName].totalMs += r.durationMs;
    modelStats[modelName].count += 1;

    // Extraer tokens si el runner los guardó en el resultado (añadiremos soporte en el engine si es necesario)
    const compTokens = r.evalResult?.details?.usage?.completionTokens || 0;
    modelStats[modelName].completionTokens += compTokens;

    const scoreVal = r.evalResult?.score !== undefined ? r.evalResult.score * 100 : (r.status === 'PASSED' ? 100 : 0);
    modelStats[modelName].scores.push(scoreVal);
    modelStats[modelName].tests[cleanTestId] = { 
      durationMs: r.durationMs, 
      score: scoreVal, 
      status: r.status,
      completionTokens: compTokens
    };
  });

  let fastestModel = '-';
  let minAvgLatency = Infinity;
  Object.keys(modelStats).forEach(m => {
    if (m === 'Unknown' || m === 'undefined') return;
    const avg = modelStats[m].totalMs / modelStats[m].count;
    if (avg < minAvgLatency) {
      minAvgLatency = avg;
      fastestModel = m;
    }
  });
  document.getElementById('statFastestModel').innerText = fastestModel;

  const modelsList = Object.keys(modelStats).filter(m => m !== 'Unknown' && m !== 'undefined');
  const testCasesList = Array.from(testCasesSet).sort();
  const testCaseLabels = testCasesList.map(t => \`\${t}: \${testCaseNames[t] || t}\`);

  const colors = ['#38bdf8', '#818cf8', '#34d399', '#f43f5e', '#fbbf24'];
  const datasetsLatency = modelsList.map((model, idx) => ({
    label: model,
    data: testCasesList.map(t => modelStats[model].tests[t]?.durationMs || 0),
    backgroundColor: colors[idx % colors.length],
    borderRadius: 6
  }));

  new Chart(document.getElementById('latencyChart'), {
    type: 'bar',
    data: { labels: testCaseLabels, datasets: datasetsLatency },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#334155' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' }, title: { display: true, text: 'ms', color: '#94a3b8' } }
      }
    }
  });

  const avgScores = modelsList.map(m => {
    const arr = modelStats[m].scores;
    return arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
  });

  new Chart(document.getElementById('scoreChart'), {
    type: 'bar',
    data: {
      labels: modelsList,
      datasets: [{
        label: 'Average Score (%)',
        data: avgScores,
        backgroundColor: '#34d399',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
        y: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
      }
    }
  });

  const tbody = document.getElementById('resultsTableBody');
  rawData.forEach(res => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-700/30 transition-colors';

    const statusBadge = res.status === 'PASSED'
      ? '<span class="px-2 py-1 text-xs font-semibold rounded-md bg-emerald-500/25 text-emerald-400 border border-emerald-500/30">PASSED</span>'
      : res.status === 'TIMEOUT'
      ? '<span class="px-2 py-1 text-xs font-semibold rounded-md bg-amber-500/25 text-amber-400 border border-amber-500/30">TIMEOUT</span>'
      : '<span class="px-2 py-1 text-xs font-semibold rounded-md bg-rose-500/25 text-rose-400 border border-rose-500/30">FAILED</span>';

    const scoreText = res.evalResult?.score !== undefined ? (res.evalResult.score * 100).toFixed(0) + '%' : 'N/A';
    
    // Obtener uso de tokens y calcular velocidad (tokens/segundo) si existe
    const usage = res.evalResult?.details?.usage || {};
    const compTokens = usage.completionTokens || '-';
    const totalTokens = usage.totalTokens || '-';
    
    let tokensPerSec = '-';
    if (usage.completionTokens && res.durationMs > 0) {
      const sec = res.durationMs / 1000;
      tokensPerSec = (usage.completionTokens / sec).toFixed(1) + ' t/s';
    }

    const reason = res.evalResult?.reason || res.error?.message || '-';

    tr.innerHTML = \`
      <td class="py-3 px-4 font-mono text-xs text-slate-200">\${res.testId}</td>
      <td class="py-3 px-4">\${statusBadge}</td>
      <td class="py-3 px-4 font-mono text-xs text-sky-400">\${res.durationMs} ms</td>
      <td class="py-3 px-4 font-mono text-xs text-indigo-300">\${compTokens}</td>
      <td class="py-3 px-4 font-mono text-xs text-emerald-300">\${tokensPerSec}</td>
      <td class="py-3 px-4 font-semibold text-xs text-emerald-400">\${scoreText}</td>
      <td class="py-3 px-4 text-xs text-slate-400 max-w-xs truncate" title="\${reason}">\${reason}</td>
    \`;
    tbody.appendChild(tr);
  });
});
`;
