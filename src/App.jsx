import { useState, useEffect, useCallback } from 'react'

const DEFAULT_MEDS = {
  peptizole:   { label: 'Peptizole',   cost: 18,   withdrawal: 7  },
  antibiotics: { label: 'Antibiotics', cost: 15,   withdrawal: 28 },
  antepsin:    { label: 'Antepsin',    cost: 6.25, withdrawal: 3  },
}

const STORAGE_KEY = 'ymt_state'

function today() { return new Date().toISOString().split('T')[0] }

function dateAddDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

function formatShort(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short'
  })
}

function daysUntil(dateStr) {
  return Math.round((new Date(dateStr + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000)
}

function getStopDate(raceDate, withdrawalDays) {
  return dateAddDays(raceDate, -withdrawalDays)
}

function parseDate(str) {
  if (!str) return null
  str = str.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  return null
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return {
        horses:  s.horses  || [],
        meds:    s.meds    || { ...DEFAULT_MEDS },
        records: s.records || {},
        entries: s.entries || {},
        users:   s.users   || [],
      }
    }
  } catch (e) {}
  return { horses: [], meds: { ...DEFAULT_MEDS }, records: {}, entries: {}, users: [] }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f3; color: #1a1a1a; }
  .app { max-width: 680px; margin: 0 auto; padding: 0.75rem 1rem 4rem; }
  .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px; }
  .logo { font-size: 20px; font-weight: 600; }
  .user-pill { display: flex; align-items: center; gap: 6px; background: #fff; border: 0.5px solid #ddd; border-radius: 20px; padding: 5px 12px; font-size: 13px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #639922; flex-shrink: 0; }
  .nav { display: flex; gap: 4px; margin-bottom: 1rem; overflow-x: auto; padding-bottom: 2px; }
  .nav button { flex-shrink: 0; padding: 7px 14px; border-radius: 8px; border: 0.5px solid #ccc; background: transparent; color: #666; font-size: 13px; cursor: pointer; font-family: inherit; }
  .nav button.active { background: #1a1a1a; color: #fff; border-color: transparent; font-weight: 500; }
  .card { background: #fff; border: 0.5px solid #e0e0e0; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 12px; }
  .row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 0.5px solid #eee; }
  .row:last-child { border-bottom: none; }
  .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
  .metric { background: #f5f5f3; border-radius: 8px; padding: 0.75rem 1rem; }
  .metric-label { font-size: 12px; color: #888; margin-bottom: 4px; }
  .metric-val { font-size: 22px; font-weight: 600; }
  input[type=text], input[type=number], input[type=date], select, textarea {
    padding: 8px 10px; border-radius: 8px; border: 0.5px solid #ccc;
    background: #fff; color: #1a1a1a; font-size: 14px; font-family: inherit; outline: none;
  }
  input:focus, select:focus { border-color: #999; }
  .btn { padding: 8px 16px; border-radius: 8px; border: 0.5px solid #ccc; background: transparent; color: #1a1a1a; font-size: 13px; cursor: pointer; font-family: inherit; }
  .btn:hover { background: #f5f5f3; }
  .btn-primary { background: #1a1a1a; color: #fff; border-color: transparent; }
  .btn-primary:hover { background: #333; }
  .btn-danger { color: #a32d2d; border-color: #f7c1c1; }
  .btn-danger:hover { background: #fff5f5; }
  .btn-sm { padding: 4px 10px; font-size: 12px; }
  .save-bar { position: sticky; bottom: 0; background: #fff; border-top: 0.5px solid #e0e0e0; padding: 10px 0 0; display: flex; align-items: center; gap: 8px; }
  .horse-tick { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 0.5px solid #eee; cursor: pointer; }
  .horse-tick:last-child { border-bottom: none; }
  .horse-tick:hover { background: #fafafa; margin: 0 -1.25rem; padding: 9px 1.25rem; }
  .tick-box { width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid #ccc; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .tick-box.checked { background: #1a1a1a; border-color: transparent; }
  .section-title { font-size: 11px; font-weight: 600; color: #999; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
  .chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; margin: 3px 3px 0 0; }
  .chip-red    { background: #fcebeb; color: #a32d2d; }
  .chip-amber  { background: #faeeda; color: #854f0b; }
  .chip-green  { background: #eaf3de; color: #3b6d11; }
  .chip-blue   { background: #e6f1fb; color: #185fa5; }
  .urgent { background: #fcebeb; border: 0.5px solid #f7c1c1; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; color: #a32d2d; font-weight: 500; }
  .entry-card { background: #fff; border: 0.5px solid #e0e0e0; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 10px; }
  .setup { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 6px 8px; border-bottom: 0.5px solid #ddd; font-weight: 600; font-size: 12px; color: #888; }
  td { padding: 7px 8px; border-bottom: 0.5px solid #eee; }
  tr:last-child td { border-bottom: none; }
  td:not(:first-child), th:not(:first-child) { text-align: right; }
  .input-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
  @media (max-width: 500px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } }
`

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('ymt_user') || '')
  const [userName, setUserName] = useState('')
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('log')
  const [draft, setDraft] = useState({})

  // Log tab
  const [logDate, setLogDate] = useState(today())
  const [logMed, setLogMed] = useState(() => Object.keys(DEFAULT_MEDS)[0])

  // Daily tab
  const [dailyDate, setDailyDate] = useState(today())
  const [dailyData, setDailyData] = useState(null)

  // Monthly tab
  const [monthSel, setMonthSel] = useState(() => today().slice(0, 7))
  const [monthData, setMonthData] = useState(null)

  // Horses tab
  const [newHorse, setNewHorse] = useState('')

  // Entries tab
  const [entryHorse, setEntryHorse] = useState('')
  const [entryDate, setEntryDate] = useState('')

  // Settings tab
  const [newMedName, setNewMedName] = useState('')
  const [newMedCost, setNewMedCost] = useState('')
  const [newMedWd, setNewMedWd] = useState('')

  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const persist = useCallback((newState) => {
    saveState(newState)
    setState(newState)
  }, [])

  function handleSetUser() {
    const n = userName.trim()
    if (!n) return
    localStorage.setItem('ymt_user', n)
    setUser(n)
    const newState = { ...state }
    if (!newState.users.includes(n)) {
      newState.users = [...newState.users, n]
      persist(newState)
    }
    if (state.horses.length > 0) setEntryHorse(state.horses[0])
  }

  useEffect(() => {
    if (state.horses.length > 0 && !entryHorse) setEntryHorse(state.horses[0])
  }, [state.horses])

  // ── LOG ──────────────────────────────────────────────────────────────────

  const logKey = `${logDate}__${logMed}`
  const savedForKey = state.records[logKey] || {}

  function toggleHorse(h) {
    const cur = draft[logKey] !== undefined ? { ...draft[logKey] } : { ...savedForKey }
    cur[h] = !cur[h]
    setDraft({ ...draft, [logKey]: cur })
  }

  function saveDay() {
    if (draft[logKey] === undefined) return
    const newRecords = { ...state.records, [logKey]: { ...draft[logKey], __savedBy: user } }
    const newDraft = { ...draft }
    delete newDraft[logKey]
    setDraft(newDraft)
    persist({ ...state, records: newRecords })
    showToast('Saved!')
  }

  function discardChanges() {
    const newDraft = { ...draft }
    delete newDraft[logKey]
    setDraft(newDraft)
  }

  function hasStopConflict(horse, med, date) {
    const raceDate = state.entries[horse]
    if (!raceDate) return false
    const wd = state.meds[med]?.withdrawal || 0
    if (!wd) return false
    return date >= getStopDate(raceDate, wd)
  }

  const inDraft = draft[logKey] !== undefined
  const currentTicks = inDraft ? draft[logKey] : savedForKey
  const tickCount = Object.values(currentTicks).filter(v => v === true).length

  // ── ENTRIES ───────────────────────────────────────────────────────────────

  function addEntry() {
    if (!entryHorse || !entryDate) { showToast('Select horse and date'); return }
    persist({ ...state, entries: { ...state.entries, [entryHorse]: entryDate } })
    showToast(`Entry added for ${entryHorse}`)
    setEntryDate('')
  }

  function removeEntry(horse) {
    const e = { ...state.entries }
    delete e[horse]
    persist({ ...state, entries: e })
  }

  function importEntriesCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.split(/\r?\n/)
      let added = 0
      const newEntries = { ...state.entries }
      const newHorses = [...state.horses]
      lines.forEach((line, i) => {
        const parts = line.split(',')
        if (parts.length < 2) return
        const horse = parts[0].trim()
        const date = parseDate(parts[1])
        if (!horse || !date) return
        if (i === 0 && horse.toLowerCase() === 'horse') return
        if (!newHorses.includes(horse)) newHorses.push(horse)
        newEntries[horse] = date
        added++
      })
      persist({ ...state, entries: newEntries, horses: newHorses })
      showToast(`Imported ${added} entries`)
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  const sortedEntries = Object.keys(state.entries)
    .filter(h => state.entries[h])
    .sort((a, b) => new Date(state.entries[a]) - new Date(state.entries[b]))

  const urgentToday = sortedEntries.flatMap(horse => {
    const raceDate = state.entries[horse]
    return Object.entries(state.meds)
      .filter(([, m]) => m.withdrawal)
      .filter(([, m]) => getStopDate(raceDate, m.withdrawal) === today())
      .map(([, m]) => ({ horse, med: m.label, raceDate }))
  })

  // ── DAILY ─────────────────────────────────────────────────────────────────

  function computeDaily(date) {
    let grand = 0
    const rows = []
    Object.entries(state.meds).forEach(([med, m]) => {
      const rec = state.records[`${date}__${med}`] || {}
      const horses = Object.keys(rec).filter(h => h !== '__savedBy' && rec[h])
      if (!horses.length) return
      const cost = horses.length * m.cost
      grand += cost
      rows.push({ med, m, horses, cost, savedBy: rec['__savedBy'] })
    })
    return { rows, grand, totalHorses: [...new Set(rows.flatMap(r => r.horses))].length }
  }

  // ── MONTHLY ───────────────────────────────────────────────────────────────

  function computeMonthly(month) {
    const horseTotals = {}, medTotals = {}
    Object.keys(state.meds).forEach(m => (medTotals[m] = 0))
    let grand = 0
    Object.keys(state.records).forEach(key => {
      if (!key.startsWith(month)) return
      const parts = key.split('__')
      if (parts.length < 2) return
      const med = parts[1]
      if (!state.meds[med]) return
      const rec = state.records[key]
      Object.keys(rec).filter(h => h !== '__savedBy' && rec[h]).forEach(h => {
        const c = state.meds[med].cost
        if (!horseTotals[h]) { horseTotals[h] = {}; Object.keys(state.meds).forEach(m => (horseTotals[h][m] = 0)); horseTotals[h].total = 0 }
        horseTotals[h][med] = (horseTotals[h][med] || 0) + c
        horseTotals[h].total += c
        medTotals[med] = (medTotals[med] || 0) + c
        grand += c
      })
    })
    const horses = Object.keys(horseTotals).sort((a, b) => horseTotals[b].total - horseTotals[a].total)
    return { horses, horseTotals, medTotals, grand }
  }

  // ── HORSES ────────────────────────────────────────────────────────────────

  function addHorse() {
    const name = newHorse.trim()
    if (!name || state.horses.includes(name)) { showToast(name ? 'Already in list' : 'Enter a name'); return }
    persist({ ...state, horses: [...state.horses, name] })
    setNewHorse('')
    showToast(`Added ${name}`)
  }

  function removeHorse(h) {
    persist({ ...state, horses: state.horses.filter(x => x !== h) })
    showToast(`Removed ${h}`)
  }

  function importHorseCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.split(/\r?\n/).map(l => l.split(',')[0].trim()).filter(Boolean)
      const newHorses = [...state.horses]
      let added = 0
      lines.forEach((name, i) => {
        if (i === 0 && name.toLowerCase() === 'horse') return
        if (!name || newHorses.includes(name)) return
        newHorses.push(name); added++
      })
      persist({ ...state, horses: newHorses })
      showToast(`Imported ${added} horses`)
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  // ── SETTINGS ──────────────────────────────────────────────────────────────

  function updateMed(k, field, val) {
    const meds = { ...state.meds, [k]: { ...state.meds[k], [field]: val } }
    persist({ ...state, meds })
    showToast('Saved')
  }

  function removeMed(k) {
    const meds = { ...state.meds }
    delete meds[k]
    persist({ ...state, meds })
    showToast('Removed')
  }

  function addMed() {
    const name = newMedName.trim()
    const cost = parseFloat(newMedCost)
    const wd = parseInt(newMedWd) || 0
    if (!name || isNaN(cost)) { showToast('Enter name and cost'); return }
    const k = name.toLowerCase().replace(/\s+/g, '_') + Date.now()
    persist({ ...state, meds: { ...state.meds, [k]: { label: name, cost, withdrawal: wd } } })
    setNewMedName(''); setNewMedCost(''); setNewMedWd('')
    showToast(`Added ${name}`)
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) }
  })

  if (!user) {
    return (
      <>
        <style>{css}</style>
        <div className="setup">
          <div className="card" style={{ maxWidth: 340, width: '100%' }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Yard Med Tracker</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Enter your name to continue</div>
            <input type="text" placeholder="Your name..." value={userName}
              onChange={e => setUserName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSetUser()}
              style={{ width: '100%', marginBottom: 10 }} />
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSetUser}>Continue</button>
          </div>
        </div>
      </>
    )
  }

  const daily = tab === 'daily' && dailyData ? dailyData : null
  const monthly = tab === 'monthly' && monthData ? monthData : null

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="topbar">
          <span className="logo">Yard Med Tracker</span>
          <div className="user-pill">
            <div className="dot" />
            <span style={{ color: '#888', fontSize: 13 }}>Logged in as</span>
            <span style={{ fontWeight: 600 }}>{user}</span>
            <button className="btn btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}
              onClick={() => { localStorage.removeItem('ymt_user'); setUser('') }}>Change</button>
          </div>
        </div>

        <div className="nav">
          {['log','entries','daily','monthly','horses','settings'].map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => {
              setTab(t)
              if (t === 'daily') setDailyData(computeDaily(dailyDate))
              if (t === 'monthly') setMonthData(computeMonthly(monthSel))
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── LOG TAB ── */}
        {tab === 'log' && (
          <div>
            <div className="input-row">
              <input type="date" value={logDate} onChange={e => { setLogDate(e.target.value); setDraft({}) }} style={{ flex: 1 }} />
              <select value={logMed} onChange={e => setLogMed(e.target.value)} style={{ flex: 1.4 }}>
                {Object.entries(state.meds).map(([k, m]) => (
                  <option key={k} value={k}>{m.label} — €{m.cost.toFixed(2)}/day</option>
                ))}
              </select>
            </div>
            <div className="card" style={{ padding: '0.5rem 1.25rem', maxHeight: 400, overflowY: 'auto' }}>
              {state.horses.length === 0
                ? <div style={{ padding: '1rem 0', color: '#888', fontSize: 14 }}>No horses loaded. Add in Horses tab.</div>
                : state.horses.map(h => {
                  const ticked = !!(currentTicks[h])
                  const conflict = hasStopConflict(h, logMed, logDate)
                  return (
                    <div key={h} className="horse-tick" onClick={() => toggleHorse(h)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`tick-box ${ticked ? 'checked' : ''}`}>
                          {ticked && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 14 }}>{h}</span>
                      </div>
                      {conflict && (
                        <span className="chip chip-red" style={{ fontSize: 11 }}>
                          Stop — race {formatShort(state.entries[h])}
                        </span>
                      )}
                    </div>
                  )
                })
              }
            </div>
            <div className="save-bar">
              <span style={{ fontSize: 13, color: '#888', flex: 1 }}>
                {inDraft
                  ? `${tickCount} ticked — unsaved (${user})`
                  : `${tickCount} saved for ${state.meds[logMed]?.label}`}
              </span>
              <button className="btn btn-danger btn-sm" onClick={discardChanges}>Discard</button>
              <button className="btn btn-primary btn-sm" onClick={saveDay}>Save day</button>
            </div>
          </div>
        )}

        {/* ── ENTRIES TAB ── */}
        {tab === 'entries' && (
          <div>
            {urgentToday.length > 0 && (
              <div className="urgent">
                ⚠ Stop today: {urgentToday.map(u => `${u.horse} — ${u.med} (race ${formatShort(u.raceDate)})`).join(', ')}
              </div>
            )}
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title">Add pending engagement</div>
              <div className="input-row" style={{ flexWrap: 'wrap' }}>
                <select value={entryHorse} onChange={e => setEntryHorse(e.target.value)} style={{ flex: 2, minWidth: 140 }}>
                  {state.horses.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
                <button className="btn btn-primary" onClick={addEntry}>Add</button>
              </div>
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Or import CSV (Horse, Date — DD/MM/YYYY or YYYY-MM-DD)</div>
                <input type="file" accept=".csv" onChange={importEntriesCSV} style={{ fontSize: 12 }} />
              </div>
            </div>

            {sortedEntries.length === 0
              ? <div style={{ color: '#888', fontSize: 14 }}>No pending engagements yet.</div>
              : sortedEntries.map(horse => {
                const raceDate = state.entries[horse]
                const raceDays = daysUntil(raceDate)
                return (
                  <div key={horse} className="entry-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{horse}</span>
                        {raceDays < 0 && <span className="chip chip-blue">ran {Math.abs(raceDays)}d ago</span>}
                        {raceDays === 0 && <span className="chip chip-red">Race day</span>}
                        {raceDays > 0 && raceDays <= 3 && <span className="chip chip-amber">{raceDays}d to race</span>}
                        {raceDays > 3 && <span style={{ fontSize: 12, color: '#888' }}>{raceDays} days</span>}
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => removeEntry(horse)}>Remove</button>
                    </div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Race: {formatDate(raceDate)}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                      {Object.entries(state.meds).filter(([, m]) => m.withdrawal).map(([k, m]) => {
                        const stopDate = getStopDate(raceDate, m.withdrawal)
                        const daysToStop = daysUntil(stopDate)
                        let chipClass = 'chip-blue', status = `stop ${formatShort(stopDate)}`
                        if (today() > stopDate) { chipClass = 'chip-green'; status = '✓ stopped' }
                        else if (daysToStop === 0) { chipClass = 'chip-red'; status = 'stop today' }
                        else if (daysToStop <= 2) { chipClass = 'chip-amber'; status = `stop in ${daysToStop}d` }
                        return (
                          <span key={k} className={`chip ${chipClass}`}>
                            {m.label} · {m.withdrawal}d · {status}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            }
          </div>
        )}

        {/* ── DAILY TAB ── */}
        {tab === 'daily' && (
          <div>
            <div className="input-row">
              <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => setDailyData(computeDaily(dailyDate))}>View</button>
            </div>
            {dailyData && (dailyData.rows.length === 0
              ? <div style={{ color: '#888', fontSize: 14 }}>No records for this date.</div>
              : <>
                <div className="metric-grid">
                  <div className="metric"><div className="metric-label">Day total</div><div className="metric-val">€{dailyData.grand.toFixed(2)}</div></div>
                  <div className="metric"><div className="metric-label">Horses treated</div><div className="metric-val">{dailyData.totalHorses}</div></div>
                  <div className="metric"><div className="metric-label">Meds used</div><div className="metric-val">{dailyData.rows.length}</div></div>
                </div>
                {dailyData.rows.map(({ med, m, horses, cost, savedBy }) => (
                  <div key={med} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>{m.label}</span>
                      <span style={{ fontSize: 13, color: '#888' }}>€{cost.toFixed(2)} · {horses.length} horses{savedBy ? ` · ${savedBy}` : ''}</span>
                    </div>
                    {horses.map(h => <div key={h} className="row"><span style={{ fontSize: 14 }}>{h}</span></div>)}
                  </div>
                ))}
                <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 600, paddingTop: 4 }}>Total: €{dailyData.grand.toFixed(2)}</div>
              </>
            )}
          </div>
        )}

        {/* ── MONTHLY TAB ── */}
        {tab === 'monthly' && (
          <div>
            <div className="input-row">
              <select value={monthSel} onChange={e => setMonthSel(e.target.value)} style={{ flex: 1 }}>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <button className="btn btn-primary" onClick={() => setMonthData(computeMonthly(monthSel))}>View</button>
            </div>
            {monthData && (monthData.horses.length === 0
              ? <div style={{ color: '#888', fontSize: 14 }}>No records for this month.</div>
              : <>
                <div className="metric-grid">
                  <div className="metric"><div className="metric-label">Month total</div><div className="metric-val">€{monthData.grand.toFixed(0)}</div></div>
                  <div className="metric"><div className="metric-label">Horses billed</div><div className="metric-val">{monthData.horses.length}</div></div>
                  <div className="metric"><div className="metric-label">Avg per horse</div><div className="metric-val">€{(monthData.grand / monthData.horses.length).toFixed(0)}</div></div>
                </div>
                <div className="card">
                  <div className="section-title">Per horse billing</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Horse</th>
                          {Object.values(state.meds).map(m => <th key={m.label}>{m.label}</th>)}
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthData.horses.map(h => (
                          <tr key={h}>
                            <td style={{ fontWeight: 500 }}>{h}</td>
                            {Object.keys(state.meds).map(k => (
                              <td key={k}>€{(monthData.horseTotals[h][k] || 0).toFixed(2)}</td>
                            ))}
                            <td style={{ fontWeight: 600 }}>€{monthData.horseTotals[h].total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card">
                  <div className="section-title">Medication totals</div>
                  {Object.entries(state.meds).map(([k, m]) => (
                    <div key={k} className="row">
                      <span style={{ fontSize: 14 }}>{m.label}</span>
                      <span style={{ fontWeight: 600 }}>€{(monthData.medTotals[k] || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="row" style={{ borderTop: '0.5px solid #ddd', marginTop: 4 }}>
                    <span style={{ fontWeight: 600 }}>Grand total</span>
                    <span style={{ fontWeight: 600 }}>€{monthData.grand.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── HORSES TAB ── */}
        {tab === 'horses' && (
          <div>
            <div className="input-row">
              <input type="text" placeholder="Horse name..." value={newHorse}
                onChange={e => setNewHorse(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addHorse()}
                style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={addHorse}>Add</button>
            </div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title">Import via CSV</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>One horse name per row. Header auto-skipped.</div>
              <input type="file" accept=".csv,.txt" onChange={importHorseCSV} style={{ fontSize: 13 }} />
            </div>
            <div className="card" style={{ padding: '0.25rem 1.25rem', maxHeight: 420, overflowY: 'auto' }}>
              {state.horses.length === 0
                ? <div style={{ padding: '0.5rem 0', color: '#888', fontSize: 14 }}>No horses yet.</div>
                : state.horses.map(h => (
                  <div key={h} className="row">
                    <span style={{ fontSize: 14 }}>{h}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => removeHorse(h)}>Remove</button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <div>
            <div className="card">
              <div className="section-title">Medications &amp; pricing</div>
              {Object.entries(state.meds).map(([k, m]) => (
                <div key={k} className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <input type="text" defaultValue={m.label} style={{ flex: 1, minWidth: 100 }}
                    onBlur={e => updateMed(k, 'label', e.target.value)} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, color: '#888' }}>€</span>
                    <input type="number" defaultValue={m.cost} step="0.01" style={{ width: 80 }}
                      onBlur={e => updateMed(k, 'cost', parseFloat(e.target.value))} />
                    <span style={{ fontSize: 12, color: '#888' }}>/day</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" defaultValue={m.withdrawal} style={{ width: 55 }}
                      onBlur={e => updateMed(k, 'withdrawal', parseInt(e.target.value))} />
                    <span style={{ fontSize: 12, color: '#888' }}>wd days</span>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => removeMed(k)}>Remove</button>
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid #eee' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Add medication</div>
                <div className="input-row" style={{ flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Name..." value={newMedName} onChange={e => setNewMedName(e.target.value)} style={{ flex: 1, minWidth: 100 }} />
                  <input type="number" placeholder="€/day" value={newMedCost} onChange={e => setNewMedCost(e.target.value)} step="0.01" style={{ width: 90 }} />
                  <input type="number" placeholder="Withdrawal days" value={newMedWd} onChange={e => setNewMedWd(e.target.value)} style={{ width: 140 }} />
                  <button className="btn btn-primary btn-sm" onClick={addMed}>Add</button>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="section-title">Saved users</div>
              {state.users.length === 0
                ? <div style={{ fontSize: 13, color: '#888' }}>No users yet.</div>
                : state.users.map(u => (
                  <div key={u} className="row">
                    <span style={{ fontSize: 14 }}>{u}</span>
                    {u === user && <span className="chip chip-green" style={{ fontSize: 11 }}>You</span>}
                  </div>
                ))}
            </div>
          </div>
        )}

        {toast && (
          <div style={{
            position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
            background: '#1a1a1a', color: '#fff', padding: '8px 18px',
            borderRadius: 8, fontSize: 13, zIndex: 99, pointerEvents: 'none'
          }}>{toast}</div>
        )}
      </div>
    </>
  )
}

