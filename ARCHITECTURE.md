# ARCHITECTURE.md — фактическая архитектура DocGen Portable

> **Дата подготовки:** 19.10.2026
> **Ветка:** `qwen-code-74d5d29f-30a0-4149-a023-bf3896a6c4ac` · **HEAD:** `e3afc42` («merge remote docgen-portable-project-context-6c4ac to align history»)
> **Основано на:** прямом чтении исходников (`src/App.tsx`, `src/lib/*.ts`, все вкладки `src/components/*.tsx`, `server.ts`, `server.cjs`, `public/sw.js`, `index.html`, `vite.config.ts`, `package.json`, скрипты запуска). сверка с `PROJECT_CONTEXT.md`.
> **Назначение:** техническая карта для безопасного внесения изменений новым ИИ-/человек-разработчиком. Описывает только подтверждённое кодом; предположения помечены явно.

---

## 1. Общая схема приложения

**Клиентское SPA** без роутера и **без обязательного прикладного бэкенда**: вся бизнес-логика, хранение и генерация файлов выполняются в браузере. Единственный «маршрут» — переключение вкладок через state `activeTab` в `App.tsx` (значения: `instructions | directions | schedule | employees | contingent | sout | excel | templates | company | backup`). При этом в репозитории существует **вспомогательный локальный сервер** с HTTP API (`server.ts`, `server.cjs`) — он нужен только для раздачи статики и сборки ZIP-дистрибутива, прикладных вычислений на сервере нет.

**Слои:**

| Слой | Файлы | Где выполняется |
|---|---|---|
| UI-вкладки | `src/components/*View.tsx`, модалки | браузер |
| Оркестратор состояния | `src/App.tsx` (все useState + localStorage-эффекты) | браузер |
| Бизнес-логика ОТ | `src/lib/docxEngine.ts`, `normative29n342n.ts`, `holidays.ts` | браузер |
| Генерация файлов | `docxEngine.ts` (docxtemplater+pizzip), `excelParser.ts` (exceljs), `portableManager.ts` (jszip) | браузер |
| Хранилище | `localStorage` (ключ `docgen_portable_state_v1*`) | браузер |
| Локальный сервер (опционально) | `server.ts` (dev, Express+Vite SSR-middleware), `server.cjs` (production-статика без node_modules) | Node.js на ПК пользователя |

**Что работает БЕЗ сервера** (подтверждено grep по `fetch(`): весь UI, редактирование данных, localStorage, генерация DOCX/XLSX/JSON/ZIP и скачивание через `URL.createObjectURL`. В `src/` ровно один `fetch` — `/api/portable-bundle-files` в `portableManager.ts:311`, и он обёрнут в try/catch с fallback. То есть приложение функционально автономно; сервер нужен только для (а) раздачи собранной статики при запуске через localhost, (б) включения готового `app/`-бандла внутри ZIP-дистрибутива.

⚠️ **Подтверждено кодом:** API `POST /api/save-local-files` (server.ts:26) и `GET /api/status` (server.ts:16) реализованы на сервере, но **никогда не вызываются из `src/`** (подтверждено grep). Запись документов напрямую в папки `data/output\инструктажи\` и т.п. декларирована в README_PORTABLE.md, но клиентский код для неё отсутствует — файлы сохраняются только через диалог загрузки браузера. Это документированный разрыв «документация ↔ код».

---

## 2. Структура каталогов и ключевых файлов

```
/workspace
├── index.html              # точка входа Vite, регистрация SW, lang="ru"
├── package.json            # зависимости и скрипты (dev = tsx server.ts)
├── vite.config.ts          # base:'./' (переносимость!), plugin-react, tailwindcss-vite
├── tsconfig.json           # ES2022, jsx react-jsx, noEmit, alias '@/' → корень
├── server.ts               # Express: dev-middleware Vite / прод-статика dist/, API save-local-files, portable-bundle-files
├── server.cjs              # автономный http-сервер на встроенных модулях Node (без node_modules), отдаёт app/ или dist/
├── start.bat / run.ps1 / stop.bat  # Windows-запуск: msedge --app file:// → fallback PowerShell HTTP-сервер
├── public/                 # sw.js (cache-first офлайн), manifest.json (PWA), icon.svg
├── app/                    # СТАРАЯ сборка (в git — 3 файла, последний коммит 16.10; НЕ в .gitignore) — потенциально рассинхронизирована с src/
├── dist/                   # сборка Vite (в .gitignore: только node_modules/ и *.log — dist НЕ игнорируется, но в git не отслеживается)
└── src/
    ├── main.tsx            # createRoot(<App/>)
    ├── App.tsx             # ЕДИНСТВЕННЫЙ владелец состояния + localStorage + вкладки + мастер компании
    ├── index.css           # @import tailwindcss
    ├── lib/
    │   ├── types.ts        # все модели предметной области (+@deprecated поля)
    │   ├── defaultData.ts  # DEFAULT_* демо-данные ООО «Катания», DEFAULT_TEMPLATES
    │   ├── docxEngine.ts   # бизнес-правила ОТ + рендер DOCX + generateBuiltInTemplateDocx
    │   ├── holidays.ts     # DEFAULT_HOLIDAYS_RU, parseDateRu/formatDateRu/getNextWorkingDay
    │   ├── normative29n342n.ts # FACTORS_29N_LIST, PSYCHIATRY_342N_LIST (справочники приказов)
    │   ├── excelParser.ts  # parseExcelWorkbook, createExportWorkbook, createBlankTemplateWorkbook, createMedicalScheduleWorkbook, normalizeGender
    │   └── portableManager.ts  # ProjectBundle JSON, importProjectFromJson, createPortableZipBundle
    └── components/         # 10 вкладок + 7 модалок (см. карту модулей ниже)
```

Файл `JobDirectoryView.tsx` удалён — его функциональность живёт в `ContingentView.tsx` (подтверждено: импортов нигде нет).

---

## 3. Карта основных модулей

| Модуль / файл | Назначение | Входные данные | Результат | Связанные модули |
|---|---|---|---|---|
| `src/App.tsx` | Владение всем состоянием, persistence, вкладки, мастер новой компании | localStorage / DEFAULT_* | рендер вкладок, запись в LS | все компоненты, defaultData, holidays, excelParser |
| `lib/types.ts` | Модели: Employee, JobDirectoryItem, SoutWorkplace, HarmFactorConfig, Company*, TemplateItem, GeneratedDocItem, HistoryRecord | — | типы | импортируется везде |
| `lib/defaultData.ts` | Демо-база Катании (25 jobs, 9 emp, 25 sout, компании, шаблоны) | — | константы DEFAULT_* | App.tsx |
| `lib/docxEngine.ts` | Правила 29н/342н/СОУТ, eligibility, фильтрация факторов, renderDocx, встроенные шаблоны | Employee[], JobDirectoryItem[], CompanySettings, templatesMap | `{files: GeneratedDocItem[], warnings, updatedEmployees}`, Uint8Array DOCX | holidays.ts, types, InstructionsView, DirectionsView, MedicalScheduleView, TemplatesView, portableManager |
| `lib/holidays.ts` | Производственный календарь, парсинг/формат DD.MM.YYYY | Date/string | Date/string | docxEngine, App, Employees/Sout/MedicalSchedule views |
| `lib/normative29n342n.ts` | Справочники формулировок приказа 29н и 342н | — | массивы списков | ContingentView (редактор факторов) |
| `lib/excelParser.ts` | Чтение/парсинг XLSX (листы СПИСОК/ДАННЫЕ), экспорт, normalizeGender | ArrayBuffer | {employees, jobDirectory, warnings} / Uint8Array XLSX | ExcelTransferView, BatchPasteModal (parsePastedData), App (createExportWorkbook), MedicalScheduleView, portableManager |
| `lib/portableManager.ts` | JSON-бэкапы проекта (version '1.1.0'), ZIP-distribution со скриптами и app/ | всё состояние | JSON-строка / Blob ZIP | HistoryAndBackupView, docxEngine, excelParser |
| `components/InstructionsView.tsx` | Сценарий «Инструктажи»: выбор сотрудников, needGeneration, запуск генерации | employees, jobs, templates | вызов generateDocuments('instructions') | docxEngine, App (result modal) |
| `components/DirectionsView.tsx` | Сценарий «Направления МО/ПСО», read-only класс СОУТ и factorsConfig | employees, jobs, companySettings | generateDocuments('directions') | docxEngine |
| `components/MedicalScheduleView.tsx` | График медосмотров: eligibility по examTypeMode, планирование дат, экспорт XLSX графика, переход в Направления | employees, jobs | onUpdateEmployees, XLSX | docxEngine (getEmployeeMedicalEligibility, filterEmployeeHarmFactors), excelParser, holidays |
| `components/EmployeesView.tsx` | CRUD сотрудников, фильтр по компании, Ctrl+V batch-paste | employees, jobs, companies | setEmployees | BatchPasteModal, excelParser.parsePastedData, holidays |
| `components/ContingentView.tsx` | **Материнская вкладка**: справочник должностей + подвкладки «Медосмотры 29н» / «Психиатрия 342н», редактор factorsConfig/psychiatryPoints | jobDirectory | setJobDirectory | normative29n342n |
| `components/SoutView.tsx` | Реестр карт СОУТ, фильтр по activeCompanyId | soutWorkplaces | setSoutWorkplaces | holidays |
| `components/TemplatesView.tsx` | Загрузка пользовательских .docx-шаблонов (fileBuffer в памяти), сброс к встроенным, скачивание эталона, справочник тегов | templates | setTemplates | docxEngine.generateBuiltInTemplateDocx |
| `components/ExcelTransferView.tsx` | Импорт/экспорт XLSX с простановкой companyId активному импорту | activeCompanyId | onImportSuccess→App setters | excelParser |
| `components/CompanySetupWizard.tsx` | D3-мастер: шаг1 штатка → шаг2 люди → шаг3 карты СОУТ; всё создаётся с новым companyId | companyId новой компании | CompanySetupResult{jobs, employees, soutCards} | App.handleCompanySetupComplete |
| `components/CompanySelector.tsx` / `CompanyModal.tsx` / `CompanySettingsView.tsx` | Выбор/создание/реквизиты юрлиц | companies, activeCompanyId | onSelectCompany и пр. | App |
| `components/HistoryAndBackupView.tsx` | Экспорт/импорт JSON, сборка ZIP-дистрибутива, история генераций | всё состояние | onImportProject | portableManager |
| `components/GenerationResultModal.tsx` | Список сгенерированных файлов, скачивание по одному / ZIP | GeneratedDocItem[] | download | jszip |
| `server.ts` / `server.cjs` | Раздача статики, PORT 3000; доп. API (см. §1 — не используется клиентом) | dist//app/ | HTTP | вне браузера |

---

## 4. Поток данных

1. **Загрузка начального состояния.** Каждый стейт в `App.tsx` инициализируется лениво: `localStorage.getItem(\`${STORAGE_KEY}_xxx\`)` → `JSON.parse`, при ошибке/отсутствии — константа `DEFAULT_*` из `defaultData.ts`. Ключи: `_emp`, `_jobs`, `_sout`, `_comp`, `_companies`, `_active_comp_id`, `_hist` (общий префикс `docgen_portable_state_v1`).
2. **Сохранение.** Отдельные `useEffect([state])` сериализуют каждый срез обратно в LS после любого изменения; ошибки глотаются с `console.warn` (**квота localStorage не обрабатывается** — см. риски).
3. **Отображение.** App передаёт вниз полные массивы (`employees`, `jobDirectory`, `soutWorkplaces`) + `activeCompanyId`; каждая вкладка сама фильтрует (см. п. 6).
4. **Изменение.** Вкладки не имеют своего хранилища — колбэки `onUpdateEmployees/onUpdateJobDirectory/onUpdateWorkplaces` = сеттеры App → эффект пересохраняет в LS.
5. **Переключение компании.** `handleSelectCompany(id)` меняет `activeCompanyId` и подтягивает `settings` компании в `companySettings`. Данные не перезагружаются — только меняется фильтр.
6. **Изоляция по companyId — НЕЕДИНА, проверено по коду:**
   - Сотрудники (`EmployeesView`, `InstructionsView`): `e.companyId ? e.companyId === activeCompanyId : activeCompanyId === companies[0]?.id` — записи **без companyId легаси считаются принадлежащими первой компании**.
   - СОУТ (`SoutView:88`): строгое `(w.companyId || '') !== activeCompanyId → false`.
   - **Все три вкладки — `ContingentView`, `DirectionsView` и `MedicalScheduleView` — пропс `activeCompanyId` НЕ получают** (нет в интерфейсах props: ContingentView.tsx:24–28, DirectionsView.tsx:33–42, MedicalScheduleView.tsx:37–42; нет при рендере в App.tsx:683–695, 698–708, 721–725). DirectionsView работает только с переданными ему сотрудниками (выбор id / строки таблицы), но сам идентификатор компании не видит. Должности по companyId нигде в этих вкладках не отсекаются — они работают со всем `jobDirectory`. Изоляция достигается косвенно: сотрудники отфильтрованы на уровне App/EmployeesView, а должности matched по post. Для СибТрансСервиса (пустая) это выглядит корректно, но если у двух компаний есть одинаковые названия должностей с разными факторами — будет подмешивание. Подтверждённый архитектурный нюанс.
   - В `src/components/` активный companyId используют только 7 файлов: CompanySelector, CompanySettingsView, EmployeesView, ExcelTransferView, HistoryAndBackupView, InstructionsView, SoutView (grep-подсчёт).
7. **Импорт.** Excel: `parseExcelWorkbook` возвращает сырые массивы → `ExcelTransferView` штамует `companyId: activeCompanyId` (строки 73–74) → `onImportSuccess` заменяет списки целиком (⚠️ REPLACE-all, не merge). JSON-бэкап: `importProjectFromJson` → `onImportProject` в App заменяет settings/emp/jobs/holidays/history/companies/activeId.
8. **Генерация.** View собирает `templatesMap` из `tpl.fileBuffer` → `generateDocuments()` → App складывает результат в `history` (LS `_hist`) и открывает `GenerationResultModal` → скачивание blob/ZIP.

---

## 5. Модель данных и связи сущностей (`src/lib/types.ts`)

**Сущности:** `CompanyItem{id,name,inn,ogrn,settings}` · `JobDirectoryItem` (должность, материнская) · `Employee` · `SoutWorkplace` (карта СОУТ) · `HarmFactorConfig{code, periodicity:'1 раз в год'|'1 раз в 2 года'}` · `TemplateItem{name, fileBuffer?, dateConfig?}` · `GeneratedDocItem`, `HistoryRecord`.

**Связи (все — по строке post, нормализованной `trim().toLowerCase()`, ID-связи между сущностями отсутствуют):**
- `Employee.post ↔ JobDirectoryItem.post` — единственный способ получить класс СОУТ, факторы, психиатрию. Поиск: `jobDirectory.find(j => j.post.trim().toLowerCase() === emp.post.trim().toLowerCase())` (docxEngine:342, 428; DirectionsView:691…). ⚠️ `MedicalScheduleView:977` сравнивает `j.post === historyEmp.post` **без нормализации** — расхождение стиля.
- `SoutWorkplace.post ↔ JobDirectoryItem.post` — автоматическая привязка карт при завершении мастера (`App.handleCompanySetupComplete`: копирует `card.soutClass` и `cardDocNumber` в job).
- `companyId` — слабая link-метка на CompanyItem.id у Employee/JobDirectory/SoutWorkplace (поле опционально `?: string` — легаси-записи могут не иметь).

**Источники истины (закреплены типами и комментариями):**
- Класс СОУТ: `JobDirectoryItem.soutClass` (тип `SoutClassType|'string'`) и `SoutWorkplace.soutClass`. В docxEngine оба места генерации вычисляют `effectiveSoutClass = String(job?.soutClass || '2')` — Employee.soutClass игнорируется.
- Факторы + периодичность: `JobDirectoryItem.factorsConfig: HarmFactorConfig[]` (источник); legacy-строка `factors` синхронизируется из него при сохранении в ContingentView (`factors = codes.join('; ')+';'`).
- Психиатрия: `JobDirectoryItem.psychiatryPoints: string[]` (пункты 342н); legacy `psychiatry` — зеркало.
- Прошлогодовые прохождения: `Employee.harmFactorsCompletedLastYear: string[]` — используется в `filterEmployeeHarmFactors` для исключения факторов «1 раз в 2 года».

**@deprecated поля Employee** (сохранены для читаемости старых снимков LS, новыми данными не заполняются): `factors29n`, `periodicity`, `pso342n`, `soutClass`, `soutCardNumber`. ⚠️ Но `getEmployeeMedicalEligibility` и `generateDocuments(scenario='directions')` всё ещё читают `emp.factors29n || job?.factors` как fallback — полное удаление полей из типа сломает компиляцию этих мест.

**Прочее:** `gender: 'м' | 'ж'` (strict union); даты во всех моделях — строки `DD.MM.YYYY`; `templates` и `holidaysList` **не персистятся** (см. риски).

---

## 6. Архитектура генерации документов

Путь действия пользователя (сценарии `instructions` и `directions`, функция `generateDocuments`, docxEngine.ts:503–751):

1. View формирует `templatesMap: Map<name, ArrayBuffer>` из `TemplateItem.fileBuffer` (пользовательские шаблоны, загруженные в TemplatesView) и вызывает `generateDocuments({scenario, employees, jobDirectory, companySettings, holidaysList, templatesMap, templateDateConfigs})`.
2. Строится `jobMap: Map<post.toLowerCase(), JobDirectoryItem>`.
3. По каждому сотруднику (в instructions — только `needGeneration===true`) определяются целевые шаблоны по правилам: `Вводный` всегда; `СЛ` — если заполнена программа стажировки; `Лист_ИТР/Рабочие/Офис` — по `job.status`; `МО`/`ПСО` — при непустых legacy-строках `job.factors` / `job.psychiatry` (`hasProgramValue`, docxEngine:588–589). ⚠️ **Разное покрытие правилом ПСО (подтверждено кодом):** ограничение «ПСО только при предварительном МО» действует **только в сценарии `directions`** (docxEngine:711–716); в сценарии `instructions` шаблон `ПСО` добавляется в папку `Направления` без проверки типа осмотра (docxEngine:603).
4. `replacements: Record<'{{тег}>', string>` собирается из emp/job/companySettings; даты: `computeDocDate(dateConfig)` (current/custom/open), дата стажировки = `getNextWorkingDay(hireDate, holidaysList)`.
5. Если шаблона нет в templatesMap — `generateBuiltInTemplateDocx(name, description)` собирает минимальный .docx из XML-строк прямо в коде (fallback-эталон).
6. `renderDocx(buffer, replacements)`: PizZip → Docxtemplater (delimiters `{{}}`, nullGetter='') → при исключении парсера — **fallbackXmlReplace** (прямая замена тегов в `word/*.xml` с escapeXml).
7. Результат: `GeneratedDocItem{blob, folder: инструктажи|Направления|готовые_направления}` → GenerationResultModal → скачивание blob или ZIP (jszip). После успешной генерации `emp.needGeneration=false` (мутация копии `updatedEmployees`, возвращается в вызывающий код).

**Технический механизм (пп. 5–7) отделён от предметной логики (пп. 3–4): правила ОТ живут в generateDocuments/getEmployeeMedicalEligibility/filterEmployeeHarmFactors, формат DOCX — в renderDocx/generateBuiltInTemplateDocx.**

Сервер для генерации **не требуется** (всё в браузере). Ограничения при добавлении нового типа документа: теги жёстко заданы литералами `'{{...}}'` в двух местах; имена шаблонов захардкожены в `targetTemplates` и `DEFAULT_TEMPLATES`; папка выхода ограничена union-типом `GeneratedDocItem.folder`; обязательна проверка, что шаблон содержит теги ровно одной строкой (docxtemplater ломает теги между runs — для этого и существует fallbackXmlReplace).

---

## 7. Импорт, экспорт и резервное копирование

- **Чтение XLSX** (`excelParser.parseExcelWorkbook`): листы `СПИСОК` (+ эвристический поиск «осмотр/направлен/29н») и `ДАННЫЕ`; автоопределение колонок по заголовкам 1-й строки; нормализация: `cleanText`, `normalizeGender → 'м'|'ж'`, категории ИТР/Рабочий/Офис. Проверка: предупреждения в массиве `warnings`, критических валидаторов нет.
- **Назначение companyId при импорте — в UI-слое, не в парсере. Проверенные пути штамповки:** `ExcelTransferView:73–74` (employees и jobs → `activeCompanyId`), `EmployeesView:188` (batch-paste) и `:222` (форма «добавить сотрудника»), мастер компании (`CompanySetupWizard` создаёт записи с id новой компании; привязка карт к должностям в `App.handleCompanySetupComplete:350–357`). **Не подтверждено:** наличие гарантированной штамповки в иных/будущих путях создания записей (поле в типе опционально `?: string`, принудительной проверки нет). **Риск:** запись без companyId по легаси-правилу фильтрации считается принадлежащей первой компании → утечка между юрлицами.
- **Экспорт XLSX**: `createExportWorkbook(employees, jobs)` (базы), `createMedicalScheduleWorkbook` (график), `createBlankTemplateWorkbook` (пустой бланк). Всё — blob → download в браузере.
- **JSON-бэкап** (`portableManager`): `ProjectBundle{version:'1.1.0', exportDate, companySettings, companies?, activeCompanyId?, employees, jobDirectory, holidays, history}` — **шаблоны и soutWorkplaces в бэкап НЕ включены** (подтверждено типом `ProjectBundle`, portableManager.ts:6–16). В ZIP-бандл (`createPortableZipBundle`) бэкап вложен как `data/project_backup.json` и формируется вызовом с пустыми массивами history/companies (portableManager.ts:345) — состав ещё неполнее пользовательского экспорта из HistoryAndBackupView (там передаются history, companies, activeCompanyId). `importProjectFromJson` проверяет только presence companySettings/employees/jobDirectory.
- **ZIP-дистрибутив** (`createPortableZipBundle`): start.bat/run.ps1/stop.bat (тексты генерируются в коде), `ИНСТРУКЦИЯ_ПО_ЗАПУСКУ.txt`, шаблоны в `data/templates/`, эталонный XLSX в `data/tables/`, `data/project_backup.json`, плюс attempt-fetch `/api/portable-bundle-files` для вложения собранного приложения. ⚠️ Уточнение по коду: эндпоинт собирает файлы из **`dist/`** (server.ts:52–54) и кладёт их в ZIP под путями без префикса папки; чтобы сгенерированный start.bat нашёл `app\index.html`, эндпоинт должен вызываться из прод-сервера (`NODE_ENV=production`), где база статики — `dist/`. Без сервера блок молча пропускается — ZIP выйдет без самой программы. ⚠️ Уточнено аудитом 20.10.2026: эндпоинт /api/portable-bundle-files реализован только в server.ts:52. В автономном server.cjs его нет: на неизвестные пути server.cjs возвращает index.html, поэтому fetch в portableManager.ts:311 падает при разборе JSON, а ZIP собирается без файлов приложения. В реальном Windows-сценарии (server.cjs) переносимый бандл неполный — это дефект R17 (TASK_STATUS.md).

---

## 8. Локальный сервер и переносимость

- **Dev:** `npm run dev` = `tsx server.ts` → Express + Vite middleware (SSR-режим), порт 3000 (`PORT` env). `NODE_ENV=production` в server.ts → раздача `dist/` + SPA-fallback. Скрипты package.json: `dev` (tsx server.ts), `start` (node server.ts — требует tsx-loader, фактическая работоспособность не проверялась), `build` (vite build), `preview` (vite preview), `clean` (rm -rf dist server.js), `lint` (= `tsc --noEmit`, стороннего линтера нет).
- **server.cjs:** чистый Node http, MIME-таблица, база выбора папки: `app/`, если существует, иначе `dist/`, иначе cwd (server.cjs:11–16) — отсюда приоритет старой сборки `app/`; слушает 127.0.0.1:3000. Не требует node_modules. server.cjs не реализует /api/portable-bundle-files (в отличие от server.ts) — см. §7 и R17 в TASK_STATUS.md.
- **start.bat (корневой и генерируемый в ZIP):** приоритет — `msedge.exe --app=file:///.../app/index.html` (app-режим без сервера); далее обычный открытие файла; в самом конце — `run.ps1`.
- **run.ps1:** ищет `runtime\node.exe` или системный node → `node server.cjs`; иначе встроенный PowerShell HttpListener (читается далее по файлу).
- **Service Worker** (`public/sw.js`): cache-first для GET, кэш `docgen-cache-v1`, offline-fallback на `/`. Работает только при http(s)-источнике; при открытии через `file://` (сценарий start.bat) SW не регистрируется.
- **Vite `base:'./'`** — относительные пути ассетов, обязательны для file://-режима.
- **Ограничение FS:** браузер не пишет в произвольные папки; серверные эндпоинты записи существуют, но клиентски не задействованы (§1). Реальная работоспособность bat/ps1 на Windows-машине **не проверялась** (нет доступа к ОС).

---

## 9. Критические архитектурные инварианты

**Подтверждённые кодом (нарушение = поломка данных/логики):**
1. Схема LS-JSON обратимо совместима: новые поля опциональны, @deprecated поля остаются в типе и частично читаются как fallback. Удаление поля из `types.ts` без миграции читателей ломает сборку.
2. Каждой новой записи Employee/JobDirectory/SoutWorkplace должен проставляться активный `companyId`. **Подтверждено кодом для проверенных путей создания** (перечислены в §7: Excel-импорт, batch-paste, форма добавления сотрудника, мастер компании); принудительной проверки на уровне типов/парсера нет — для новых путей это обязанность разработчика.
3. Класс СОУТ берётся только из `jobDirectory`/`soutWorkplaces`; `effectiveSoutClass = job?.soutClass || '2'` в обоих сценариях docxEngine.
4. Периодичность факторов — только `HarmFactorConfig.periodicity`; фильтрация «1 раз в 2 года» ↔ `emp.harmFactorsCompletedLastYear`.
5. `gender: 'м'|'ж'`; отображение/подстановка в DOCX — «женский/мужской»; вход из Excel через `normalizeGender`.
6. Даты — строки `DD.MM.YYYY`; формат закреплён функциями `holidays.ts` (parseDateRu/formatDateRu) и соглашениями в комментариях типов (автотестов формата не существует — см. §11.1).
7. Связь emp↔job по нормализованному `post.toLowerCase()` — переименование должности разрывает связь (никаких FK!).
8. `base:'./'` в vite.config.ts не менять — ломает file://-переносимость.
9. Правило «ПСО только при предварительном МО» (`examType==='предварительный'`) — бизнес-правило заказчика, зафиксировано комментарием и кодом **только для сценария `directions`** (docxEngine.ts:711–716). В сценарии `instructions` оно НЕ применяется (docxEngine.ts:603) — расхождение подтверждено кодом; является ли оно дефектом или осознанным решением — требует уточнения у владельца проекта.

**Рекомендации (не железные правила):**
- После правок docxEngine/шаблонов — ручная проверка DOCX на демо-данных.
- Не расширять набор magic-строк папок без обновления `GeneratedDocItem.folder`.

---

## 10. Карта безопасных изменений

| Что меняете | Обязательная проверка |
|---|---|
| `types.ts` (поля) | все читатели grep’ом; defaultData.ts; @deprecated-fallback в docxEngine/excelParser; старые снимки LS должны парситься |
| `defaultData.ts` | счётчики companyId/factorsConfig/soutClass (grep), изоляция СибТрансСервиса |
| `docxEngine.ts` | tsc + build + ручная генерация Инструктаж/Направление/МО/ПСО на Катании; проверить ветку fallbackXmlReplace |
| Фильтрация по компаниям | все 4 места с разным стилем проверки (Employees/Instructions — легаси-правило «первая компания», Sout — строгое, Contingent/Directions/Schedule — без фильтра) |
| Импорт Excel | normalizeGender, штамповка companyId в ExcelTransferView/BatchPasteModal→EmployeesView/Wizard |
| Storage/backup | версии ProjectBundle ('1.1.0'), состав бандла (sout/templates отсутствуют), импорт старого JSON |
| Шаблоны/TemplatesView | имена targetTemplates совпадают с DEFAULT_TEMPLATES.name; fileBuffer не персистится — предупреждать пользователя |
| Сервер/скрипты | не завязывать новый клиентский код на /api/* без явного решения (сейчас src от сервера независим) |
| Любое изменение | `npm run lint` (tsc --noEmit) && `npm run build`; обновить PROJECT_CONTEXT.md/этот файл |

---

## 11. Известные архитектурные риски (подтверждённые статически)

1. **Нет автотестов/CI/линтера** (lint = tsc). Любая регрессия ловится только вручную.
2. **QuotaExceededError не обрабатывается** — эффекты пишут в LS с `console.warn`; при переполнении изменения исчезают после перезагрузки.
3. **Шаблоны (.docx fileBuffer) и holidaysList не сохраняются** никуда кроме памяти вкладки (в App.tsx нет localStorage-эффектов для templates/holidays) → после F5 пользовательские шаблоны сбрасываются к встроенным. Также `soutWorkplaces` присутствуют в LS, но **отсутствуют в JSON-бэкапе** (`ProjectBundle`) → восстановление из бэкапа теряет реестр СОУТ; ZIP-вложенный `project_backup.json` дополнительно теряет companies/history (см. §7).
4. **Разнобой фильтрации companyId** (§4.6) — потенциальное смешивание одноимённых должностей разных компаний.
5. **Большой chunk >500 kB** (docxtemplater+exceljs+jszip+lucide в одном бандле) — предупреждение сборки.
6. **`app/` отслеживается git (3 файла, последний коммит 16.10) и отсутствует в .gitignore** (в ignore только `node_modules/` и `*.log`), тогда как `dist/` пересобирается из src — start.bat и server.cjs отдают именно `app/`, если он существует → риск запуска устаревшей сборки. Фактическое содержание app/ vs dist/ не сравнивалось.
7. **Нормативные справочники FACTORS_29N_LIST/PSYCHIATRY_342N_LIST используются только в редакторе ContingentView**; в docxEngine правила перечислены литералами независимо.
8. Незакрытые функции (план, не баг): PDF-сканы карт СОУТ, предпросмотр/редактор шаблонов (Tiptap **отсутствует** в package.json), print-to-PDF, адаптивность.
9. Следы AI Studio в зависимостях (`@google/genai`, `dotenv` — не импортируются из src) — мёртвый код в бандле не участвует (tree-shaking), но засоряет lock.

---

## 12. Связанные документы

- `PROJECT_CONTEXT.md` — ✅ паспорт проекта (читать первым).
- `README_PORTABLE.md` — ✅ инструкция запуска (часть утверждений о записи в ФС не подтверждена кодом, см. §1).
- `TASK_STATUS.md` — ✅ создан.
- `TESTING.md` — ✅ создан.
- `AI_HANDOFF.md` — ✅ создан.

Актуальный HEAD и состояние рабочего дерева — см. TASK_STATUS.md §1.
