import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API статус
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'portable-local',
    platform: process.platform,
    timestamp: new Date().toISOString(),
  });
});

// API сохранения сгенерированных файлов в локальную файловую систему
app.post('/api/save-local-files', async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files)) {
      return res.status(400).json({ error: 'files must be an array' });
    }

    const outputBase = path.join(__dirname, 'data', 'output');

    for (const f of files) {
      const folderPath = path.join(outputBase, f.folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const filePath = path.join(folderPath, f.name);
      const buffer = Buffer.from(f.base64, 'base64');
      fs.writeFileSync(filePath, buffer);
    }

    res.json({ success: true, savedCount: files.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API отдачи скомпилированных файлов веб-приложения для переносимого ZIP
app.get('/api/portable-bundle-files', (req, res) => {
  try {
    const distPath = path.join(__dirname, 'dist');
    const result: { path: string; base64: string }[] = [];

    function collectFiles(dir: string, prefix: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(prefix, entry.name);
        if (entry.isDirectory()) {
          collectFiles(fullPath, relPath);
        } else {
          const buf = fs.readFileSync(fullPath);
          result.push({
            path: relPath.replace(/\\/g, '/'),
            base64: buf.toString('base64'),
          });
        }
      }
    }

    collectFiles(distPath, 'app');
    res.json({ success: true, files: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Запуск Vite middlewares в dev-режиме или раздача static в продакшене
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DocGen Portable server running on http://localhost:${PORT}`);
  });
}

startServer();
