const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const ticketsFile = path.join(__dirname, 'tickets.json');
if (!fs.existsSync(ticketsFile)) fs.writeFileSync(ticketsFile, '[]');

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ storage });

function getTickets() { return JSON.parse(fs.readFileSync(ticketsFile)); }
function saveTickets(t) { fs.writeFileSync(ticketsFile, JSON.stringify(t, null, 2)); }

app.post('/api/upload', upload.single('dealsheet'), (req, res) => {
  const { clientName } = req.body;
  const file = req.file;
  if (!file || !clientName) return res.status(400).json({ error: 'Missing fields' });
  const workbook = XLSX.readFile(file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  const ticket = { id: uuidv4(), clientName, filename: file.originalname, filepath: file.path, rows, status: 'New', createdAt: new Date().toISOString() };
  const tickets = getTickets();
  tickets.push(ticket);
  saveTickets(tickets);
  res.json({ success: true, ticket });
});

app.get('/api/tickets', (req, res) => res.json(getTickets()));
app.get('/api/tickets/:id', (req, res) => {
  const t = getTickets().find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});
app.patch('/api/tickets/:id/status', (req, res) => {
  const tickets = getTickets();
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  tickets[idx].status = req.body.status;
  saveTickets(tickets);
  res.json(tickets[idx]);
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'build', 'index.html'));
    }
  });
}

app.listen(PORT, () => console.log(`Jami running on port ${PORT}`));
