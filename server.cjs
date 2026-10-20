/**
 * DocGen Portable - Автономный HTTP-сервер на чистом Node.js
 * Использует ТОЛЬКО встроенные модули (http, fs, path). Не требует node_modules!
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

let baseDir = path.join(__dirname, 'app');
if (!fs.existsSync(baseDir)) {
  baseDir = path.join(__dirname, 'dist');
}
if (!fs.existsSync(baseDir)) {
  baseDir = __dirname;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// Рекурсивный сбор файлов папки dir в формате { path, base64 } (контракт как в server.ts).
// dir — источник файлов (baseDir статики: app/ → dist/ → cwd), prefix — префикс путей
// в ответе (всегда 'app', независимо от того, откуда читаем): path = prefix + '/' + relPath.
function collectBundleFiles(dir, prefix, result) {
  if (!fs.existsSync(dir)) return;
  const walk = (currentDir, relBase) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relBase ? relBase + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else {
        try {
          const buf = fs.readFileSync(fullPath);
          result.push({
            path: prefix + '/' + relPath,
            base64: buf.toString('base64'),
          });
        } catch (e) {
          // пропускаем файлы, которые не удалось прочитать, сервер падать не должен
        }
      }
    }
  };
  walk(dir, '');
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);

  // API отдачи скомпилированных файлов приложения для переносимого ZIP
  // (обрабатывается ДО fallback на index.html; формат ответа совпадает с server.ts)
  if (reqPath === '/api/portable-bundle-files') {
    try {
      const result = [];
      collectBundleFiles(baseDir, 'app', result);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ success: true, files: result }));
    } catch (err) {
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  let filePath = path.join(baseDir, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(baseDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Внутренняя ошибка сервера');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`DocGen Portable сервер запущен: http://127.0.0.1:${PORT}`);
});
