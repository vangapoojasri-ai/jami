const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

let tickets = [];

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', upload.single('dealsheet'), (req, res) => {
  try {
    const { clientName } = req.body;
    const file = req.file;
    if (!file || !clientName) return res.status(400).json({ error: 'Missing fields' });
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const ticket = { id: uuidv4(), clientName, filename: file.originalname, rows, status: 'New', createdAt: new Date().toISOString() };
    tickets.push(ticket);
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
app.patch('/api/tickets/:id/status', (req, res) => {
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  tickets[idx].status = req.body.status;
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