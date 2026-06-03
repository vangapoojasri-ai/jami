import React, { useState, useEffect } from 'react';

const API = 'http://localhost:4001/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f; --surface: #13131a; --border: #2a2a3a;
    --accent: #7c3aed; --accent2: #06b6d4; --text: #e8e8f0;
    --muted: #6b6b80; --success: #10b981; --warning: #f59e0b;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }
  .app { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
  .logo { font-size: 48px; font-weight: 800; letter-spacing: -2px; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; margin-bottom: 8px; }
  .tagline { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; }
  .divider { height: 1px; background: linear-gradient(90deg, var(--accent), transparent); margin: 24px 0; }
  .form-section { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin-bottom: 32px; }
  .form-title { font-size: 18px; font-weight: 700; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
  .form-title::before { content: ''; display: block; width: 4px; height: 20px; background: linear-gradient(var(--accent), var(--accent2)); border-radius: 2px; }
  .field { margin-bottom: 20px; }
  label { display: block; font-family: 'DM Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); margin-bottom: 8px; }
  input[type="text"] { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; color: var(--text); font-family: 'Syne', sans-serif; font-size: 15px; outline: none; transition: border-color 0.2s; }
  input[type="text"]:focus { border-color: var(--accent); }
  input[type="file"] { display: none; }
  .file-label { display: flex; align-items: center; gap: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; cursor: pointer; transition: border-color 0.2s; font-size: 14px; }
  .file-label:hover { border-color: var(--accent); }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border-radius: 10px; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; letter-spacing: 0.5px; }
  .btn-primary { background: linear-gradient(135deg, var(--accent), #9333ea); color: white; width: 100%; justify-content: center; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.4); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .tickets-section { margin-top: 48px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .section-title { font-size: 22px; font-weight: 700; }
  .count-badge { background: rgba(124,58,237,0.2); color: var(--accent); border: 1px solid rgba(124,58,237,0.3); border-radius: 20px; padding: 4px 12px; font-family: 'DM Mono', monospace; font-size: 12px; }
  .ticket-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; transition: border-color 0.2s; }
  .ticket-card:hover { border-color: var(--accent); }
  .ticket-client { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .ticket-meta { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); display: flex; gap: 16px; }
  .status-badge { padding: 4px 12px; border-radius: 20px; font-family: 'DM Mono', monospace; font-size: 11px; }
  .status-New { background: rgba(6,182,212,0.15); color: var(--accent2); border: 1px solid rgba(6,182,212,0.3); }
  .status-Unfinished { background: rgba(245,158,11,0.15); color: var(--warning); border: 1px solid rgba(245,158,11,0.3); }
  .status-Finished { background: rgba(16,185,129,0.15); color: var(--success); border: 1px solid rgba(16,185,129,0.3); }
  .toast { position: fixed; bottom: 24px; right: 24px; background: var(--success); color: white; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; z-index: 100; }
  .empty { text-align: center; padding: 48px; color: var(--muted); font-family: 'DM Mono', monospace; font-size: 13px; }
`;

export default function App() {
  const [clientName, setClientName] = useState('');
  const [file, setFile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { fetchTickets(); const interval = setInterval(fetchTickets, 5000); return () => clearInterval(interval); }, []);

  async function fetchTickets() {
    try {
      const res = await fetch(`${API}/tickets`);
      const data = await res.json();
      setTickets([...data].reverse());
    } catch(e) {}
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clientName || !file) return;
    setLoading(true);
    const form = new FormData();
    form.append('clientName', clientName);
    form.append('dealsheet', file);
    await fetch(`${API}/upload`, { method: 'POST', body: form });
    setClientName(''); setFile(null); setLoading(false);
    setToast('Dealsheet uploaded!'); setTimeout(() => setToast(''), 3000);
    fetchTickets();
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div style={{marginBottom: 48}}>
          <div className="logo">jami</div>
          <div className="tagline">dealsheet intake portal</div>
          <div className="divider" />
        </div>
        <div className="form-section">
          <div className="form-title">Upload Dealsheet</div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Client Name</label>
              <input type="text" placeholder="e.g. Nike, Adidas, Apple..." value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div className="field">
              <label>Dealsheet Excel</label>
              <label className="file-label" htmlFor="file-input">
                <span>📎</span><span>{file ? file.name : 'Choose .xlsx or .csv file...'}</span>
              </label>
              <input id="file-input" type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading || !clientName || !file}>
              {loading ? '⏳ Uploading...' : '🚀 Submit Dealsheet'}
            </button>
          </form>
        </div>
        <div className="tickets-section">
          <div className="section-header">
            <div className="section-title">Submitted Dealsheets</div>
            <div className="count-badge">{tickets.length} total</div>
          </div>
          {tickets.length === 0 ? <div className="empty">No dealsheets submitted yet</div> : tickets.map(t => (
            <div className="ticket-card" key={t.id}>
              <div>
                <div className="ticket-client">{t.clientName}</div>
                <div className="ticket-meta">
                  <span>📄 {t.filename}</span>
                  <span>🕒 {new Date(t.createdAt).toLocaleString()}</span>
                  <span>📊 {t.rows?.length || 0} line items</span>
                </div>
              </div>
              <div className={`status-badge status-${t.status}`}>{t.status}</div>
            </div>
          ))}
        </div>
      </div>
      {toast && <div className="toast">✅ {toast}</div>}
    </>
  );
}
