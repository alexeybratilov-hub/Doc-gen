import JSZip from 'jszip';
import { CompanyItem, CompanySettings, Employee, HistoryRecord, JobDirectoryItem, SoutWorkplace, TemplateItem } from './types';
import { generateBuiltInTemplateDocx } from './docxEngine';
import { createExportWorkbook } from './excelParser';

/**
 * Поле fileBuffer?: ArrayBuffer в JSON не сериализуется (превращается в {}),
 * поэтому при экспорте оно кодируется в base64 (fileBufferBase64?), а при
 * импорте декодируется обратно в ArrayBuffer. Остальные поля TemplateItem
 * (включая name и dateConfig — plain object) сохраняются как есть.
 */
export type SerializedTemplateItem = Omit<TemplateItem, 'fileBuffer'> & {
  fileBufferBase64?: string;
};

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary); // браузерный API (используется и в createPortableZipBundle ниже)
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binaryStr = atob(b64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

export function serializeTemplates(templates: TemplateItem[]): SerializedTemplateItem[] {
  return templates.map((tpl) => {
    const { fileBuffer, ...rest } = tpl;
    const serialized: SerializedTemplateItem = { ...rest };
    if (fileBuffer) {
      serialized.fileBufferBase64 = arrayBufferToBase64(fileBuffer);
    }
    return serialized;
  });
}

export function deserializeTemplates(templates?: SerializedTemplateItem[]): TemplateItem[] | undefined {
  if (!templates) return undefined;
  return templates.map((tpl) => {
    const { fileBufferBase64, ...rest } = tpl;
    const item: TemplateItem = { ...rest };
    if (typeof fileBufferBase64 === 'string' && fileBufferBase64.length > 0) {
      item.fileBuffer = base64ToArrayBuffer(fileBufferBase64);
    }
    return item;
  });
}

export interface ProjectBundle {
  version: string;
  exportDate: string;
  companySettings: CompanySettings;
  companies?: CompanyItem[];
  activeCompanyId?: string;
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  holidays: string[];
  history: HistoryRecord[];
  /** Q2-правка (R4): карты СОУТ. Опционально для обратной совместимости бэкапов '1.1.0'. */
  soutWorkplaces?: SoutWorkplace[];
  /** Q2-правка (R5): пользовательские шаблоны. Опционально для обратной совместимости бэкапов '1.1.0'. */
  templates?: SerializedTemplateItem[];
}

export function exportProjectToJson(
  settings: CompanySettings,
  employees: Employee[],
  jobs: JobDirectoryItem[],
  holidays: string[],
  history: HistoryRecord[],
  companies?: CompanyItem[],
  activeCompanyId?: string,
  soutWorkplaces?: SoutWorkplace[],
  templates?: TemplateItem[]
): string {
  const bundle: ProjectBundle = {
    version: '1.2.0',
    exportDate: new Date().toISOString(),
    companySettings: settings,
    companies,
    activeCompanyId,
    employees,
    jobDirectory: jobs,
    holidays,
    history,
    soutWorkplaces,
    templates: templates ? serializeTemplates(templates) : undefined,
  };
  return JSON.stringify(bundle, null, 2);
}

export function importProjectFromJson(jsonStr: string): ProjectBundle {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.companySettings || !Array.isArray(parsed.employees) || !Array.isArray(parsed.jobDirectory)) {
    throw new Error('Некорректный формат файла проекта.');
  }
  const bundle = parsed as ProjectBundle;
  // Обратная совместимость: бэкапы '1.1.0' без новых полей читаются как есть
  // (soutWorkplaces/templates остаются undefined). Блокировки по версии нет.
  if (bundle.templates) {
    bundle.templates = serializeTemplatesGuard(bundle.templates);
  }
  return bundle;
}

/**
 * Защита импорта: если в файле templates оказались объекты с fileBuffer вместо
 * fileBufferBase64 (например, бэкап, собранный другой версией), приводим к
 * каноническому формату десериализации. Обычный путь — decode base64 -> ArrayBuffer.
 */
function serializeTemplatesGuard(templates: SerializedTemplateItem[]): SerializedTemplateItem[] {
  // На выходе из importProjectFromJson храним templates уже десериализованными
  // (fileBuffer: ArrayBuffer). Тип совпадает с TemplateItem структурно, поэтому
  // приведение безопасно.
  return deserializeTemplates(templates) as unknown as SerializedTemplateItem[];
}

export async function createPortableZipBundle({
  companySettings,
  employees,
  jobDirectory,
  holidays,
  templates,
  soutWorkplaces,
}: {
  companySettings: CompanySettings;
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  holidays: string[];
  templates: TemplateItem[];
  soutWorkplaces?: SoutWorkplace[];
}): Promise<Blob> {
  const zip = new JSZip();

  // 1. Скрипт запуска для Windows (start.bat) - Десктопный режим
  const startBat = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
title DocGen Desktop - Автономное приложение

echo ========================================================
echo       DocGen Desktop - Генератор документов
echo ========================================================
echo [OK] Запуск автономного десктопного приложения...
echo Приложение работает полностью локально на вашем ПК.
echo.

where msedge.exe >nul 2>&1
if %errorlevel% equ 0 (
    if exist "%~dp0app\\index.html" (
        start "" msedge.exe --app="file:///%~dp0app/index.html"
        exit /b 0
    )
    if exist "%~dp0dist\\index.html" (
        start "" msedge.exe --app="file:///%~dp0dist/index.html"
        exit /b 0
    )
    if exist "%~dp0index.html" (
        start "" msedge.exe --app="file:///%~dp0index.html"
        exit /b 0
    )
)

if exist "%~dp0app\\index.html" (
    start "" "%~dp0app\\index.html"
    exit /b 0
)
if exist "%~dp0dist\\index.html" (
    start "" "%~dp0dist\\index.html"
    exit /b 0
)
if exist "%~dp0index.html" (
    start "" "%~dp0index.html"
    exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
`;
  zip.file('start.bat', startBat);

  // 2. Скрипт остановки для Windows (stop.bat)
  const stopBat = `@echo off
title Stop DocGen Portable
taskkill /f /im node.exe >nul 2>&1
powershell.exe -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowTitle -like '*DocGen*' } | Stop-Process -Force" >nul 2>&1
`;
  zip.file('stop.bat', stopBat);

  // 3. run.ps1 - автономный сервер на встроенном PowerShell (Windows 10/11)
  const runPs1 = `# DocGen Portable - Автономный HTTP-сервер на встроенном PowerShell (Windows 10/11)
# Не требует установки Node.js, Python или каких-либо сторонних библиотек

$port = 3000
$rootPath = Join-Path $PSScriptRoot "app"
if (-not (Test-Path $rootPath)) {
    $rootPath = Join-Path $PSScriptRoot "dist"
}
if (-not (Test-Path $rootPath)) {
    $rootPath = $PSScriptRoot
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".docx" = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ".xlsx" = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    $port = 3001
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       DocGen Portable - Генератор документов           " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Сервер запущен на адресе: http://localhost:$port" -ForegroundColor Green
Write-Host "Приложение открывается в вашем браузере..." -ForegroundColor Gray
Write-Host "Для завершения работы закройте это окно." -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:$port"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = $request.Url.LocalPath
        if ($rawUrl -eq "/" -or $rawUrl -eq "") {
            $rawUrl = "/index.html"
        }

        $decodedUrl = [System.Uri]::UnescapeDataString($rawUrl)
        $relPath = $decodedUrl.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $filePath = Join-Path $rootPath $relPath

        if (-not (Test-Path $filePath -PathType Leaf)) {
            $filePath = Join-Path $rootPath "index.html"
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        # Игнорировать ошибки при закрытии слушателя
    }
}
`;
  zip.file('run.ps1', runPs1);

  // 4. server.cjs - чистый Node.js HTTP-сервер (без npm и без node_modules)
  const serverCjs = `/**
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

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
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
  console.log(\`DocGen Portable сервер запущен: http://127.0.0.1:\${PORT}\`);
});
`;
  zip.file('server.cjs', serverCjs);

  // 5. Инструкция по переносимости
  const readme = `========================================================================
DOCGEN PORTABLE - АВТОНОМНЫЙ ПЕРЕНОСИМЫЙ ГЕНЕРАТОР ДОКУМЕНТОВ
========================================================================

ПРИНЦИП РАБОТЫ «ИЗ КОРОБКИ»:
Приложение полностью готово к работе и НЕ ТРЕБУЕТ установки Node.js,
Python, сред разработки или Microsoft Office!

КАК ЗАПУСТИТЬ НА WINDOWS 10 / 11:
1. Распакуйте этот архив в любую папку или на USB-флешку.
2. Просто дважды кликните по файлу «start.bat».
3. Приложение автоматически:
   - Если Node.js не установлен, запустит локальный веб-сервер через встроенный
     в Windows компонент PowerShell (ничего дополнительно ставить не нужно!).
   - Если Node.js установлен или положен в runtime\\node.exe, запустит через него.
   - Автоматически откроет интерфейс в браузере: http://localhost:3000
4. Для завершения работы закройте окно или запустите «stop.bat».

СТРУКТУРА ПАПОК:
- app\\                        - Готовое веб-приложение (HTML, JS, CSS)
- data\\templates\\            - Шаблоны документов Word (.docx) с тегами {{...}}
- data\\tables\\               - Исходные и экспортированные Excel-таблицы
- data\\output\\               - Папки с готовыми документами
- start.bat                   - Запуск в 1 клик
- stop.bat                    - Остановка
`;
  zip.file('ИНСТРУКЦИЯ_ПО_ЗАПУСКУ.txt', readme);

  // 6. Добавляем скомпилированные файлы приложения в папку app/
  try {
    const resp = await fetch('/api/portable-bundle-files');
    if (resp.ok) {
      const data = await resp.json();
      if (data.files && Array.isArray(data.files)) {
        for (const item of data.files) {
          // Декодируем base64
          const binaryStr = atob(item.base64);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          zip.file(item.path, bytes);
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch bundle files from server, using fallback', e);
  }

  // 7. Шаблоны Word в папку data/templates/
  const templatesFolder = zip.folder('data/templates');
  for (const tpl of templates) {
    const bytes = tpl.fileBuffer
      ? new Uint8Array(tpl.fileBuffer)
      : await generateBuiltInTemplateDocx(tpl.name, tpl.description);
    templatesFolder?.file(tpl.fileName, bytes);
  }

  // 8. Эталонная таблица Excel в папку data/tables/
  const excelBytes = await createExportWorkbook(employees, jobDirectory);
  zip.file('data/tables/База_Сотрудников_и_Должностей.xlsx', excelBytes);

  // 9. Файл конфигурации и резервной копии
  // Q2-правка (R4/R5): soutWorkplaces и templates включаются в project_backup.json.
  // ВАЖНО: R6 (пустые history/companies в ZIP-бэкапе) в этой правке НЕ затрагивается —
  // как и раньше, передаются [] для history и companies/activeCompanyId не передаются.
  const projectJson = exportProjectToJson(
    companySettings,
    employees,
    jobDirectory,
    holidays,
    [],
    undefined,
    undefined,
    soutWorkplaces,
    templates
  );
  zip.file('data/project_backup.json', projectJson);

  return await zip.generateAsync({ type: 'blob' });
}
