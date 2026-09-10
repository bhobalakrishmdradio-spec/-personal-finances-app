'use strict';

/* =========================================================
   MyFinances — a fully client-side personal finance tracker
   All data lives in localStorage. No backend, no build step.
   ========================================================= */

/* ---------- Category catalog ---------- */
const CATEGORIES = {
  income: [
    { key: 'salary', label: 'Salary', icon: '💼', color: '#16a34a' },
    { key: 'freelance', label: 'Freelance', icon: '🧑‍💻', color: '#22c55e' },
    { key: 'investment', label: 'Investment', icon: '📈', color: '#059669' },
    { key: 'gift', label: 'Gift', icon: '🎁', color: '#10b981' },
    { key: 'other_income', label: 'Other Income', icon: '➕', color: '#34d399' },
  ],
  expense: [
    { key: 'food', label: 'Food & Dining', icon: '🍔', color: '#f97316' },
    { key: 'rent', label: 'Rent & Housing', icon: '🏠', color: '#6366f1' },
    { key: 'utilities', label: 'Utilities', icon: '💡', color: '#eab308' },
    { key: 'transportation', label: 'Transportation', icon: '🚗', color: '#0ea5e9' },
    { key: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#ec4899' },
    { key: 'shopping', label: 'Shopping', icon: '🛍️', color: '#a855f7' },
    { key: 'health', label: 'Health & Fitness', icon: '💊', color: '#ef4444' },
    { key: 'education', label: 'Education', icon: '📚', color: '#14b8a6' },
    { key: 'insurance', label: 'Insurance', icon: '🛡️', color: '#64748b' },
    { key: 'other_expense', label: 'Other', icon: '📦', color: '#9ca3af' },
  ],
};

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: '$', AUD: '$' };

const STORAGE_KEY = 'myfinances_state_v1';

/* ---------- State ---------- */
let state = loadState();

function defaultState() {
  return {
    transactions: [],
    budgets: {},           // { categoryKey: monthlyLimit }
    settings: { currency: 'USD', theme: 'light' },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      budgets: parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : {},
      settings: Object.assign(defaultState().settings, parsed.settings || {}),
    };
  } catch (e) {
    console.error('Failed to load saved data, starting fresh.', e);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------- Helpers ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatCurrency(amount) {
  const symbol = CURRENCY_SYMBOLS[state.settings.currency] || '$';
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(amount).toFixed(2)}`;
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  return todayStr().slice(0, 7);
}

function categoryInfo(key) {
  return (
    CATEGORIES.income.find((c) => c.key === key) ||
    CATEGORIES.expense.find((c) => c.key === key) ||
    { key, label: key, icon: '❓', color: '#9ca3af' }
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2200);
}

/* ---------- Navigation ---------- */
const views = ['dashboard', 'transactions', 'budgets', 'settings'];
const viewTitles = { dashboard: 'Dashboard', transactions: 'Transactions', budgets: 'Budgets', settings: 'Settings' };

function switchView(view) {
  views.forEach((v) => {
    document.getElementById(`view-${v}`).classList.toggle('active', v === view);
  });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  document.getElementById('viewTitle').textContent = viewTitles[view];
  if (view === 'dashboard') renderDashboard();
  if (view === 'transactions') renderTransactionsView();
  if (view === 'budgets') renderBudgetsView();
}

/* ---------- Dashboard rendering ---------- */
function renderDashboard() {
  const month = document.getElementById('chartMonthSelect').value || currentMonthKey();
  renderStatCards();
  renderCategoryChart(month);
  renderTrendChart();
  renderRecentTransactions();
  populateMonthSelect();
}

function renderStatCards() {
  const mKey = currentMonthKey();
  const monthTxns = state.transactions.filter((t) => monthKey(t.date) === mKey);
  const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalBalance = state.transactions.reduce(
    (s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0
  );
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  document.getElementById('statBalance').textContent = formatCurrency(totalBalance);
  document.getElementById('statIncome').textContent = formatCurrency(income);
  document.getElementById('statExpense').textContent = formatCurrency(expense);
  document.getElementById('statSavingsRate').textContent = `${savingsRate}%`;
}

function populateMonthSelect() {
  const select = document.getElementById('chartMonthSelect');
  const months = Array.from(new Set(state.transactions.map((t) => monthKey(t.date)))).sort().reverse();
  if (!months.includes(currentMonthKey())) months.unshift(currentMonthKey());
  const prevValue = select.value;
  select.innerHTML = months.map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join('');
  select.value = months.includes(prevValue) ? prevValue : currentMonthKey();
}

/* ---------- Canvas: category pie chart ---------- */
function renderCategoryChart(mKey) {
  const canvas = document.getElementById('categoryChart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const expenses = state.transactions.filter((t) => t.type === 'expense' && monthKey(t.date) === mKey);
  const totals = {};
  expenses.forEach((t) => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const legend = document.getElementById('chartLegend');

  if (entries.length === 0) {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted');
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No expenses this month', canvas.width / 2, canvas.height / 2);
    legend.innerHTML = '';
    return;
  }

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(cx, cy) - 20;
  let startAngle = -Math.PI / 2;

  entries.forEach(([catKey, val]) => {
    const info = categoryInfo(catKey);
    const sliceAngle = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = info.color;
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Donut hole
  const bg = getComputedStyle(document.body).getPropertyValue('--surface').trim() || '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text');
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatCurrency(total), cx, cy);

  legend.innerHTML = entries.map(([catKey, val]) => {
    const info = categoryInfo(catKey);
    const pct = ((val / total) * 100).toFixed(1);
    return `<li>
      <span class="legend-name"><span class="swatch" style="background:${info.color}"></span>${info.icon} ${info.label}</span>
      <span>${formatCurrency(val)} (${pct}%)</span>
    </li>`;
  }).join('');
}

/* ---------- Canvas: monthly trend (last 6 months) ---------- */
function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const data = months.map((mKey) => {
    const txns = state.transactions.filter((t) => monthKey(t.date) === mKey);
    return {
      mKey,
      income: txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  });

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const padding = 36;
  const chartW = canvas.width - padding * 2;
  const chartH = canvas.height - padding * 2;
  const groupW = chartW / months.length;
  const barW = groupW * 0.32;

  const incomeColor = getComputedStyle(document.body).getPropertyValue('--income') || '#16a34a';
  const expenseColor = getComputedStyle(document.body).getPropertyValue('--expense') || '#dc2626';
  const mutedColor = (getComputedStyle(document.body).getPropertyValue('--text-muted') || '#666').trim();
  const borderColor = (getComputedStyle(document.body).getPropertyValue('--border') || '#ddd').trim();

  // Baseline
  ctx.strokeStyle = borderColor;
  ctx.beginPath();
  ctx.moveTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  data.forEach((d, i) => {
    const groupX = padding + i * groupW;
    const incomeH = (d.income / maxVal) * chartH;
    const expenseH = (d.expense / maxVal) * chartH;
    const baseY = canvas.height - padding;

    ctx.fillStyle = incomeColor.trim();
    ctx.fillRect(groupX + groupW * 0.12, baseY - incomeH, barW, incomeH);

    ctx.fillStyle = expenseColor.trim();
    ctx.fillRect(groupX + groupW * 0.12 + barW + 4, baseY - expenseH, barW, expenseH);

    ctx.fillStyle = mutedColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const [, m] = d.mKey.split('-');
    const label = new Date(2000, Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
    ctx.fillText(label, groupX + groupW / 2, canvas.height - padding + 16);
  });
}

/* ---------- Recent transactions (dashboard) ---------- */
function renderRecentTransactions() {
  const container = document.getElementById('recentList');
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 6);
  if (recent.length === 0) {
    container.innerHTML = '<p class="empty-state">No transactions yet. Click "Add Transaction" to get started.</p>';
    return;
  }
  container.innerHTML = recent.map(txnRowHTML).join('');
  wireRowActions(container);
}

function txnRowHTML(t) {
  const info = categoryInfo(t.category);
  const sign = t.type === 'income' ? '+' : '−';
  return `<div class="txn-row" data-id="${t.id}">
    <div class="txn-info">
      <span class="txn-desc">${info.icon} ${escapeHTML(t.description)}</span>
      <span class="txn-meta">${info.label} · ${formatDate(t.date)}</span>
    </div>
    <div class="txn-amount ${t.type}">${sign} ${formatCurrency(t.amount)}</div>
  </div>`;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Transactions view (full table) ---------- */
function populateCategoryFilter() {
  const select = document.getElementById('filterCategory');
  const options = ['<option value="all">All Categories</option>'];
  options.push('<optgroup label="Income">');
  CATEGORIES.income.forEach((c) => options.push(`<option value="${c.key}">${c.icon} ${c.label}</option>`));
  options.push('</optgroup><optgroup label="Expense">');
  CATEGORIES.expense.forEach((c) => options.push(`<option value="${c.key}">${c.icon} ${c.label}</option>`));
  options.push('</optgroup>');
  select.innerHTML = options.join('');
}

function getFilteredTransactions() {
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const type = document.getElementById('filterType').value;
  const category = document.getElementById('filterCategory').value;
  const month = document.getElementById('filterMonth').value;

  return state.transactions
    .filter((t) => (search ? t.description.toLowerCase().includes(search) : true))
    .filter((t) => (type === 'all' ? true : t.type === type))
    .filter((t) => (category === 'all' ? true : t.category === category))
    .filter((t) => (month ? monthKey(t.date) === month : true))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function renderTransactionsView() {
  const tbody = document.getElementById('txnTableBody');
  const list = getFilteredTransactions();
  const emptyState = document.getElementById('emptyState');

  emptyState.hidden = list.length !== 0;
  tbody.innerHTML = list.map((t) => {
    const info = categoryInfo(t.category);
    const sign = t.type === 'income' ? '+' : '−';
    return `<tr data-id="${t.id}">
      <td>${formatDate(t.date)}</td>
      <td>${escapeHTML(t.description)}${t.notes ? `<div class="txn-meta">${escapeHTML(t.notes)}</div>` : ''}</td>
      <td><span class="cat-badge">${info.icon} ${info.label}</span></td>
      <td>${t.type === 'income' ? 'Income' : 'Expense'}</td>
      <td class="right ${t.type === 'income' ? 'txn-amount income' : 'txn-amount expense'}">${sign} ${formatCurrency(t.amount)}</td>
      <td>
        <div class="row-actions">
          <button data-action="edit" title="Edit">✏️</button>
          <button data-action="delete" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  wireRowActions(tbody);
}

function wireRowActions(container) {
  container.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('[data-id]').dataset.id;
      openTransactionModal(state.transactions.find((t) => t.id === id));
    });
  });
  container.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('[data-id]').dataset.id;
      if (confirm('Delete this transaction?')) {
        state.transactions = state.transactions.filter((t) => t.id !== id);
        saveState();
        refreshCurrentView();
        showToast('Transaction deleted');
      }
    });
  });
  // Clicking a dashboard txn-row opens edit too
  container.querySelectorAll('.txn-row').forEach((row) => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      openTransactionModal(state.transactions.find((t) => t.id === id));
    });
  });
}

/* ---------- Budgets view ---------- */
function renderBudgetsView() {
  document.getElementById('budgetMonthLabel').textContent = monthLabel(currentMonthKey());
  const container = document.getElementById('budgetList');
  const mKey = currentMonthKey();
  const spentByCategory = {};
  state.transactions
    .filter((t) => t.type === 'expense' && monthKey(t.date) === mKey)
    .forEach((t) => { spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount; });

  container.innerHTML = CATEGORIES.expense.map((cat) => {
    const spent = spentByCategory[cat.key] || 0;
    const budget = state.budgets[cat.key] || 0;
    const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    const barClass = budget > 0 && spent > budget ? 'over' : (pct >= 80 ? 'warn' : '');
    return `<div class="budget-item" data-cat="${cat.key}">
      <div class="budget-item-top">
        <span class="cat">${cat.icon} ${cat.label}</span>
        <span>
          ${formatCurrency(spent)} /
          <input type="number" class="budget-input" min="0" step="1" value="${budget || ''}" placeholder="No limit" data-cat="${cat.key}" />
        </span>
      </div>
      <div class="budget-bar-track">
        <div class="budget-bar-fill ${barClass}" style="width:${budget > 0 ? pct : 0}%"></div>
      </div>
      ${budget > 0 && spent > budget ? `<div class="muted" style="color:var(--expense)">Over budget by ${formatCurrency(spent - budget)}</div>` : ''}
    </div>`;
  }).join('');

  container.querySelectorAll('.budget-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const cat = e.target.dataset.cat;
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        state.budgets[cat] = val;
      } else {
        delete state.budgets[cat];
      }
      saveState();
      renderBudgetsView();
      showToast('Budget updated');
    });
  });
}

/* ---------- Modal: add/edit transaction ---------- */
let currentTxnType = 'expense';

function populateCategorySelect(type) {
  const select = document.getElementById('txnCategory');
  select.innerHTML = CATEGORIES[type].map((c) => `<option value="${c.key}">${c.icon} ${c.label}</option>`).join('');
}

function openTransactionModal(txn) {
  const overlay = document.getElementById('modalOverlay');
  const form = document.getElementById('txnForm');
  form.reset();

  currentTxnType = txn ? txn.type : 'expense';
  setTypeButtons(currentTxnType);
  populateCategorySelect(currentTxnType);

  document.getElementById('modalTitle').textContent = txn ? 'Edit Transaction' : 'Add Transaction';
  document.getElementById('txnId').value = txn ? txn.id : '';
  document.getElementById('txnDescription').value = txn ? txn.description : '';
  document.getElementById('txnAmount').value = txn ? txn.amount : '';
  document.getElementById('txnDate').value = txn ? txn.date : todayStr();
  document.getElementById('txnNotes').value = txn ? (txn.notes || '') : '';
  if (txn) document.getElementById('txnCategory').value = txn.category;

  overlay.hidden = false;
  document.getElementById('txnDescription').focus();
}

function closeTransactionModal() {
  document.getElementById('modalOverlay').hidden = true;
}

function setTypeButtons(type) {
  currentTxnType = type;
  document.getElementById('typeExpenseBtn').classList.toggle('active', type === 'expense');
  document.getElementById('typeIncomeBtn').classList.toggle('active', type === 'income');
  populateCategorySelect(type);
}

function handleTransactionSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('txnId').value;
  const description = document.getElementById('txnDescription').value.trim();
  const amount = parseFloat(document.getElementById('txnAmount').value);
  const date = document.getElementById('txnDate').value;
  const category = document.getElementById('txnCategory').value;
  const notes = document.getElementById('txnNotes').value.trim();

  if (!description || isNaN(amount) || amount <= 0 || !date || !category) {
    showToast('Please fill in all required fields');
    return;
  }

  if (id) {
    const txn = state.transactions.find((t) => t.id === id);
    Object.assign(txn, { description, amount, date, category, notes, type: currentTxnType });
    showToast('Transaction updated');
  } else {
    state.transactions.push({
      id: uid(),
      type: currentTxnType,
      description, amount, date, category, notes,
      createdAt: Date.now(),
    });
    showToast('Transaction added');
  }

  saveState();
  closeTransactionModal();
  refreshCurrentView();
}

function refreshCurrentView() {
  const activeBtn = document.querySelector('.nav-btn.active');
  const view = activeBtn ? activeBtn.dataset.view : 'dashboard';
  switchView(view);
}

/* ---------- Import / Export / Reset / Sample data ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `myfinances-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Data exported');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.transactions)) throw new Error('Invalid file format');
      state = {
        transactions: parsed.transactions,
        budgets: parsed.budgets || {},
        settings: Object.assign(defaultState().settings, parsed.settings || {}),
      };
      saveState();
      applyTheme(state.settings.theme);
      document.getElementById('currencySelect').value = state.settings.currency;
      refreshCurrentView();
      showToast('Data imported successfully');
    } catch (err) {
      alert('Could not import file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (!confirm('This will permanently delete all transactions and budgets. Continue?')) return;
  state = defaultState();
  saveState();
  refreshCurrentView();
  showToast('All data cleared');
}

function loadSampleData() {
  const mKey = currentMonthKey();
  const [y, m] = mKey.split('-').map(Number);
  const d = (day) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const samples = [
    { type: 'income', category: 'salary', description: 'Monthly Salary', amount: 4200, date: d(1) },
    { type: 'expense', category: 'rent', description: 'Apartment Rent', amount: 1400, date: d(2) },
    { type: 'expense', category: 'food', description: 'Grocery Shopping', amount: 95.4, date: d(3) },
    { type: 'expense', category: 'utilities', description: 'Electricity Bill', amount: 62.1, date: d(5) },
    { type: 'expense', category: 'transportation', description: 'Gas Fill-up', amount: 48, date: d(6) },
    { type: 'expense', category: 'entertainment', description: 'Movie Night', amount: 32, date: d(8) },
    { type: 'income', category: 'freelance', description: 'Freelance Web Project', amount: 650, date: d(9) },
    { type: 'expense', category: 'food', description: 'Restaurant Dinner', amount: 54.75, date: d(10) },
    { type: 'expense', category: 'shopping', description: 'New Shoes', amount: 89.99, date: d(12) },
    { type: 'expense', category: 'health', description: 'Gym Membership', amount: 40, date: d(13) },
  ];
  samples.forEach((s) => state.transactions.push({ id: uid(), notes: '', createdAt: Date.now(), ...s }));
  state.budgets = { food: 400, entertainment: 100, shopping: 150, transportation: 120 };
  saveState();
  refreshCurrentView();
  showToast('Sample data loaded');
}

/* ---------- Theme ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.settings.theme);
  saveState();
  refreshCurrentView(); // charts read CSS colors, so redraw
}

/* ---------- Wire up events ---------- */
function init() {
  applyTheme(state.settings.theme);
  document.getElementById('currencySelect').value = state.settings.currency;
  populateCategoryFilter();
  document.getElementById('txnDate').value = todayStr();

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.goto));
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('quickAddBtn').addEventListener('click', () => openTransactionModal(null));
  document.getElementById('modalClose').addEventListener('click', closeTransactionModal);
  document.getElementById('modalCancel').addEventListener('click', closeTransactionModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeTransactionModal();
  });
  document.getElementById('txnForm').addEventListener('submit', handleTransactionSubmit);
  document.getElementById('typeExpenseBtn').addEventListener('click', () => setTypeButtons('expense'));
  document.getElementById('typeIncomeBtn').addEventListener('click', () => setTypeButtons('income'));

  ['searchInput', 'filterType', 'filterCategory', 'filterMonth'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderTransactionsView);
  });
  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterType').value = 'all';
    document.getElementById('filterCategory').value = 'all';
    document.getElementById('filterMonth').value = '';
    renderTransactionsView();
  });

  document.getElementById('chartMonthSelect').addEventListener('change', () => {
    renderCategoryChart(document.getElementById('chartMonthSelect').value);
  });

  document.getElementById('currencySelect').addEventListener('change', (e) => {
    state.settings.currency = e.target.value;
    saveState();
    refreshCurrentView();
  });

  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importInput').addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', resetAllData);
  document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('modalOverlay').hidden) closeTransactionModal();
  });

  switchView('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
