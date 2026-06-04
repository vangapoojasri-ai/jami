const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let tickets = [];

const JAMI_SHEET_ID = process.env.JAMI_SHEET_ID || '1gJV6r7BcWdkslSmjW9v6QqxHHxFirGPlM-6Ykevqnkg';

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

async function appendToSheet(ticket) {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: JAMI_SHEET_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          ticket.id,
          ticket.clientName,
          ticket.filename,
          ticket.rows.length,
          ticket.createdAt,
          'New'
        ]]
      }
    });
    console.log('✅ Written to Google Sheets!');
  } catch (err) {
    console.error('Google Sheets error:', err.message);
  }
}

async function updateTicketStatus(ticketId, status) {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: JAMI_SHEET_ID,
      range: 'Sheet1!A:F'
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === ticketId);
    if (rowIndex === -1) return;
    await sheets.spreadsheets.values.update({
      spreadsheetId: JAMI_SHEET_ID,
      range: `Sheet1!F${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[status]] }
    });
  } catch (err) {
    console.error('Google Sheets update error:', err.message);
  }
}

// ── Handle merged cells in Excel ──────────────────────────────────────────
function expandMergedCells(sheet) {
  const merges = sheet['!merges'] || [];
  merges.forEach(merge => {
    const { s, e } = merge;
    // Get value from top-left cell of merge
    const topLeftAddr = XLSX.utils.encode_cell({ r: s.r, c: s.c });
    const topLeftCell = sheet[topLeftAddr];
    if (!topLeftCell) return;
    // Copy to all cells in merge range
    for (let r = s.r; r <= e.r; r++) {
      for (let c = s.c; c <= e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!sheet[addr] || !sheet[addr].v) {
          sheet[addr] = { ...topLeftCell };
        }
      }
    }
  });
  return sheet;
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // Expand merged cells before parsing to JSON
  expandMergedCells(sheet);
  return XLSX.utils.sheet_to_json(sheet);
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/upload', upload.single('dealsheet'), async (req, res) => {
  try {
    const { clientName } = req.body;
    const file = req.file;
    if (!file || !clientName) return res.status(400).json({ error: 'Missing fields' });
    const rows = parseExcel(file.buffer);
    const ticket = { id: uuidv4(), clientName, filename: file.originalname, rows, status: 'New', createdAt: new Date().toISOString() };
    tickets.push(ticket);
    await appendToSheet(ticket);
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload-json', async (req, res) => {
  try {
    const { clientName, filename, rows } = req.body;
    if (!clientName || !rows) return res.status(400).json({ error: 'Missing fields' });
    const ticket = { id: uuidv4(), clientName, filename: filename || 'dealsheet.xlsx', rows, status: 'New', createdAt: new Date().toISOString() };
    tickets.push(ticket);
    await appendToSheet(ticket);
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload JSON with merged cell handling on client side
app.post('/api/upload-excel-json', async (req, res) => {
  try {
    const { clientName, filename, rows } = req.body;
    if (!clientName || !rows) return res.status(400).json({ error: 'Missing fields' });
    const ticket = { id: uuidv4(), clientName, filename: filename || 'dealsheet.xlsx', rows, status: 'New', createdAt: new Date().toISOString() };
    tickets.push(ticket);
    await appendToSheet(ticket);
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tickets', (req, res) => res.json(tickets));
app.get('/api/tickets/:id', (req, res) => {
  const t = tickets.find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});
app.patch('/api/tickets/:id/status', async (req, res) => {
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  tickets[idx].status = req.body.status;
  await updateTicketStatus(req.params.id, req.body.status);
  res.json(tickets[idx]);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'build', 'index.html'));
    }
  });
}

app.listen(PORT, () => console.log(`Jami running on port ${PORT}`));