# MyFinances — Personal Finance Tracker

A simple, private, fully client-side personal finance app. Track income and
expenses, set monthly budgets per category, and see spending trends — all
without a backend or account. Your data stays in your browser
(`localStorage`) and never leaves your device.

## Features

- **Dashboard** — total balance, monthly income/expenses, savings rate,
  a category spending donut chart, and a 6-month income/expense trend chart.
- **Transactions** — add, edit, delete income and expense entries; search
  and filter by type, category, or month.
- **Budgets** — set a monthly spending limit per expense category and track
  progress with a visual bar (warns when you're close to or over budget).
- **Settings** — choose your currency, export your data as a JSON backup,
  import a backup, or reset everything.
- **Dark mode** toggle.
- **Sample data** loader so you can try the app immediately.

## Running the app

No build step or dependencies are required — it's plain HTML/CSS/JS.

1. Open `index.html` directly in your browser, **or**
2. Serve it locally for the best experience (some browsers restrict local
   file access):

   ```bash
   python3 -m http.server 8000
   # then visit http://localhost:8000
   ```

## Project structure

```
index.html      # App layout and modal markup
css/styles.css  # Styling, including light/dark theme
js/app.js       # App logic: state, rendering, charts, events
```

## Data & privacy

All data is stored in your browser's `localStorage` under the key
`myfinances_state_v1`. Nothing is sent to any server. Use **Settings →
Export Data** to back up your data as a JSON file, and **Import Data** to
restore it (e.g. on another device or browser).
