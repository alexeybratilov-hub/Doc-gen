import ExcelJS from 'exceljs';
import { CompanySettings, Employee, EmployeeCategory, ExamType, JobDirectoryItem } from './types';
import { formatDateRu, parseDateRu } from './holidays';
import { formatSequenceNumber } from './docxEngine';


// Нормализация пола к строгому типу Employee.gender ('м' | 'ж')
function normalizeGender(raw: string): 'м' | 'ж' {
  const v = (raw || '').trim().toLowerCase();
  if (v.startsWith('ж') || v.includes('жен') || v.includes('female')) return 'ж';
  return 'м';
}

/**
 * Очистка строковых значений ячеек Excel
 */
export function cleanText(v: any): string {
  if (v === null || v === undefined) return '';
  let s = String(v).trim();
  s = s.replace(/[\r\n\t]/g, ' ');
  s = s.replace(/\u00A0/g, ' '); // неразрывный пробел
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

/**
 * Разбор вставленного из буфера обмена текста (Ctrl+V из Excel или блокнота)
 */
export function parsePastedData(
  text: string,
  mode: 'table' | 'column',
  targetField?: keyof Employee
): Partial<Employee>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (mode === 'column' && targetField) {
    return lines.map((val, idx) => ({
      num: String(idx + 1).padStart(2, '0'),
      [targetField]: cleanText(val),
      needGeneration: true,
      periodicity: '1 раз в год',
      disability: 'нет',
      under18: 'нет',
    }));
  }

  // Режим 'table' (табуляция между столбцами)
  return lines.map((line, idx) => {
    const cols = line.split('\t').map((c) => cleanText(c));
    const emp: Partial<Employee> = {
      num: String(idx + 1).padStart(2, '0'),
      needGeneration: true,
      periodicity: '1 раз в год',
      disability: 'нет',
      under18: 'нет',
      pso342n: 'нет',
    };

    if (cols.length === 1) {
      emp.fio = cols[0];
    } else if (cols.length >= 2) {
      let cIdx = 0;
      if (/^\d+$/.test(cols[0])) {
        emp.num = formatSequenceNumber(cols[0]);
        cIdx++;
      }
      if (cols[cIdx]) emp.fio = cols[cIdx++];
      if (cols[cIdx]) emp.dept = cols[cIdx++];
      if (cols[cIdx]) emp.post = cols[cIdx++];
      if (cols[cIdx]) {
        const d = parseDateRu(cols[cIdx]);
        emp.hireDate = d ? formatDateRu(d) : cols[cIdx];
        cIdx++;
      }
      if (cols[cIdx]) {
        const d = parseDateRu(cols[cIdx]);
        emp.birthDate = d ? formatDateRu(d) : cols[cIdx];
        cIdx++;
      }
      if (cols[cIdx]) emp.boss = cols[cIdx++];
      if (cols[cIdx]) emp.snils = cols[cIdx++];
      if (cols[cIdx]) emp.phone = cols[cIdx++];
      if (cols[cIdx]) emp.experience = cols[cIdx++];
      if (cols[cIdx]) {
        const d = parseDateRu(cols[cIdx]);
        emp.plannedMedicalDate = d ? formatDateRu(d) : cols[cIdx];
        cIdx++;
      }
      if (cols[cIdx]) {
        const d = parseDateRu(cols[cIdx]);
        emp.actualMedicalDate = d ? formatDateRu(d) : cols[cIdx];
        cIdx++;
      }
    }

    return emp;
  });
}

/**
 * Чтение книги Excel (XLSX / XLS)
 */
export async function parseExcelWorkbook(fileBuffer: ArrayBuffer): Promise<{
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  companySettings?: Partial<CompanySettings>;
  warnings: string[];
  detectedType: 'instructions' | 'directions' | 'unknown';
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const warnings: string[] = [];
  const employees: Employee[] = [];
  const jobDirectory: JobDirectoryItem[] = [];
  let companySettings: Partial<CompanySettings> = {};
  let detectedType: 'instructions' | 'directions' | 'unknown' = 'unknown';

  // 1. Поиск листов
  const wsList =
    workbook.getWorksheet('СПИСОК') ||
    workbook.worksheets.find((w) => w.name.toUpperCase().includes('СПИСОК'));
  const wsData =
    workbook.getWorksheet('ДАННЫЕ') ||
    workbook.worksheets.find((w) => w.name.toUpperCase().includes('ДАНН'));

  const wsDirections = workbook.worksheets.find(
    (w) =>
      w.name.toLowerCase().includes('осмотр') ||
      w.name.toLowerCase().includes('направлен') ||
      w.name.toLowerCase().includes('29н') ||
      (w.getCell('A21').value && String(w.getCell('A21').value).includes('№'))
  ) || workbook.worksheets[0];

  // ========================================================
  // Парсинг листа "ДАННЫЕ" (справочник должностей)
  // ========================================================
  if (wsData) {
    let colDept = 1;
    let colStatus = 2;
    let colPost = 3;
    let colElectr = 4;
    let colInstr = 5;
    let colStag = 6;
    let colHarm = 7;
    let colPsych = 8;
    let colInstrDoc = 9;
    let colSOUT = 10;
    let colClass = 11;
    let colOPR = 12;

    const row1 = wsData.getRow(1);
    row1.eachCell((cell, colNumber) => {
      const h = cleanText(cell.value).toLowerCase();
      if (h.includes('подразделение')) colDept = colNumber;
      if (h === 'статус' || h === 'категория') colStatus = colNumber;
      if (h === 'должность' || h === 'профессия') colPost = colNumber;
      if (h.includes('электробезопасн')) colElectr = colNumber;
      if (h.includes('инструктаж на рабочем месте')) colInstr = colNumber;
      if (h.includes('стажировка')) colStag = colNumber;
      if (h.includes('вредность') || h.includes('29н')) colHarm = colNumber;
      if (h.includes('психиатрия') || h.includes('342н')) colPsych = colNumber;
      if (h.includes('инструкция') || h.includes('иот')) colInstrDoc = colNumber;
      if (h === 'соут' || h.includes('карта соут')) colSOUT = colNumber;
      if (h === 'класс' || h.includes('класс соут') || h.includes('класс условий')) colClass = colNumber;
      if (h === 'опр' || h.includes('риск') || h.includes('оценка')) colOPR = colNumber;
    });

    wsData.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const postName = cleanText(row.getCell(colPost).value);
      if (!postName) return;

      let statusRaw = cleanText(row.getCell(colStatus).value);
      let status: EmployeeCategory = 'Рабочий';
      const sLower = statusRaw.toLowerCase();
      if (sLower === 'итр') status = 'ИТР';
      else if (sLower === 'офис') status = 'Офис';

      jobDirectory.push({
        id: `job-imp-${rowNumber}`,
        dept: cleanText(row.getCell(colDept).value) || 'Производственный отдел',
        status,
        post: postName,
        electricalSafety: cleanText(row.getCell(colElectr).value) || '1 группа',
        instructionProgram: cleanText(row.getCell(colInstr).value),
        internshipProgram: cleanText(row.getCell(colStag).value),
        factors: cleanText(row.getCell(colHarm).value),
        psychiatry: cleanText(row.getCell(colPsych).value),
        instructionDoc: cleanText(row.getCell(colInstrDoc).value),
        sout: cleanText(row.getCell(colSOUT).value) || 'Карта № 1',
        soutClass: cleanText(row.getCell(colClass).value) || '2',
        opr: cleanText(row.getCell(colOPR).value) || 'ОПР-01',
      });
    });
  }

  // ========================================================
  // Парсинг листа "СПИСОК" (без лишних столбцов!)
  // ========================================================
  if (wsList) {
    detectedType = 'instructions';
    let colNum = 1;
    let colFIO = 2;
    let colDept = 3;
    let colPost = 4;
    let colHire = 5;
    let colBirth = 6;
    let colBoss = 7;
    let colSnils = 8;
    let colPhone = 9;
    let colExp = 10;
    let colPlan = 11;
    let colActual = 12;

    const row1 = wsList.getRow(1);
    row1.eachCell((cell, colNumber) => {
      const h = cleanText(cell.value).toLowerCase();
      if (h === '№' || h === 'no' || h === 'n') colNum = colNumber;
      if (h.includes('сотрудник') || h.includes('фио')) colFIO = colNumber;
      if (h.includes('подразделение')) colDept = colNumber;
      if (h.includes('должность') || h.includes('профессия')) colPost = colNumber;
      if (h.includes('дата приема') || h.includes('прием')) colHire = colNumber;
      if (h.includes('дата рождения') || h.includes('рождени')) colBirth = colNumber;
      if (h.includes('руководитель')) colBoss = colNumber;
      if (h.includes('снилс')) colSnils = colNumber;
      if (h.includes('телефон')) colPhone = colNumber;
      if (h.includes('стаж')) colExp = colNumber;
      if (h.includes('план') || h.includes('плановая')) colPlan = colNumber;
      if (h.includes('факт') || h.includes('фактическая')) colActual = colNumber;
    });

    wsList.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const fio = cleanText(row.getCell(colFIO).value);
      const post = cleanText(row.getCell(colPost).value);

      if (!fio && !post) return;

      const hireRaw = row.getCell(colHire).value;
      const birthRaw = row.getCell(colBirth).value;
      const planRaw = row.getCell(colPlan).value;
      const actRaw = row.getCell(colActual).value;

      const hireParsed = parseDateRu(hireRaw instanceof Date ? hireRaw : cleanText(hireRaw));
      const birthParsed = parseDateRu(birthRaw instanceof Date ? birthRaw : cleanText(birthRaw));
      const planParsed = parseDateRu(planRaw instanceof Date ? planRaw : cleanText(planRaw));
      const actParsed = parseDateRu(actRaw instanceof Date ? actRaw : cleanText(actRaw));

      employees.push({
        id: `emp-list-${rowNumber}`,
        num: formatSequenceNumber(cleanText(row.getCell(colNum).value) || String(rowNumber - 1)),
        fio,
        dept: cleanText(row.getCell(colDept).value),
        post,
        hireDate: hireParsed ? formatDateRu(hireParsed) : cleanText(hireRaw),
        birthDate: birthParsed ? formatDateRu(birthParsed) : cleanText(birthRaw),
        boss: cleanText(row.getCell(colBoss).value),
        needGeneration: true,
        snils: cleanText(row.getCell(colSnils).value),
        phone: cleanText(row.getCell(colPhone).value),
        gender: 'м',
        experience: cleanText(row.getCell(colExp).value) || '1',
        factors29n: '',
        periodicity: '1 раз в год',
        disability: 'нет',
        under18: 'нет',
        plannedMedicalDate: planParsed ? formatDateRu(planParsed) : cleanText(planRaw),
        actualMedicalDate: actParsed ? formatDateRu(actParsed) : cleanText(actRaw),
        pso342n: 'нет',
      });
    });
  }

  // ========================================================
  // Парсинг таблицы медосмотра (29н и 342н)
  // ========================================================
  if (!wsList && wsDirections) {
    detectedType = 'directions';

    for (let r = 1; r <= 20; r++) {
      const row = wsDirections.getRow(r);
      const text = row.values ? row.values.toString() : '';

      if (text.includes('ООО') || text.includes('«') || text.includes('Катания')) {
        const match = text.match(/ООО\s*[«"']?([^«"'\r\n]+)[»"']?/i);
        if (match) {
          companySettings.companyName = `ООО «${match[1].trim()}»`;
        }
      }
      if (text.includes('ОГРН:')) {
        const match = text.match(/ОГРН:\s*(\d+)/i);
        if (match) companySettings.ogrn = match[1];
      }
      if (text.includes('ИНН:')) {
        const match = text.match(/ИНН:\s*(\d+)/i);
        if (match) companySettings.inn = match[1];
      }
      if (text.includes('ОКВЭД:')) {
        const match = text.match(/ОКВЭД:\s*([\d.]+)/i);
        if (match) companySettings.okved = match[1];
      }
      if (text.includes('Юридический адрес:')) {
        const match = text.match(/Юридический адрес:\s*([^,;]+,[^\n\r]+)/i);
        if (match) companySettings.legalAddress = match[1].trim();
      }
      if (text.includes('Фактический адрес:')) {
        const match = text.match(/Фактический адрес:\s*([^,;]+,[^\n\r]+)/i);
        if (match) companySettings.actualAddress = match[1].trim();
      }
      if (text.includes('исполнительный директор') || text.includes('Кириллов')) {
        companySettings.executivePost = 'Исполнительный директор';
        companySettings.executiveFIO = 'Кириллов П.М.';
      }
    }

    let headerRow = 21;
    let dataStartRow = 23;

    let colNum = 1;
    let colDept = 2;
    let colPost = 3;
    let colFIO = 4;
    let colGender = 5;
    let colBirth = 6;
    let colExp = 7;
    let colFactors = 8;
    let colPeriod = 9;
    let colDisab = 10;
    let colUnder18 = 11;
    let colSnils = 12;
    let colMedDate = 13;
    let col342 = 14;

    for (let r = 18; r <= 23; r++) {
      const row = wsDirections.getRow(r);
      let foundHeaders = 0;
      row.eachCell((cell, colNumber) => {
        const h = cleanText(cell.value).toLowerCase();
        if (h === '№' || h.includes('номер')) {
          colNum = colNumber;
          foundHeaders++;
        }
        if (h.includes('структурного подразделения')) {
          colDept = colNumber;
          foundHeaders++;
        }
        if (h.includes('профессии') || h.includes('должност')) {
          colPost = colNumber;
          foundHeaders++;
        }
        if (h.includes('ф.и.о') || h.includes('фио')) {
          colFIO = colNumber;
          foundHeaders++;
        }
        if (h.includes('пол')) colGender = colNumber;
        if (h.includes('дата рождения')) colBirth = colNumber;
        if (h.includes('стаж')) colExp = colNumber;
        if (h.includes('29н')) colFactors = colNumber;
        if (h.includes('периодичн')) colPeriod = colNumber;
        if (h.includes('снилс')) colSnils = colNumber;
        if (h.includes('342н')) col342 = colNumber;
      });

      if (foundHeaders >= 3) {
        headerRow = r;
        dataStartRow = r + 2;
        break;
      }
    }

    wsDirections.eachRow((row, rowNumber) => {
      if (rowNumber < dataStartRow) return;

      const fio = cleanText(row.getCell(colFIO).value);
      const post = cleanText(row.getCell(colPost).value);

      if (!fio && !post) return;

      const birthRaw = row.getCell(colBirth).value;
      const birthParsed = parseDateRu(birthRaw instanceof Date ? birthRaw : cleanText(birthRaw));

      const medDateRaw = row.getCell(colMedDate).value;
      const medDateParsed = parseDateRu(medDateRaw instanceof Date ? medDateRaw : cleanText(medDateRaw));

      employees.push({
        id: `emp-med-${rowNumber}`,
        num: formatSequenceNumber(cleanText(row.getCell(colNum).value) || String(rowNumber - dataStartRow + 1)),
        fio,
        dept: cleanText(row.getCell(colDept).value),
        post,
        hireDate: '',
        birthDate: birthParsed ? formatDateRu(birthParsed) : cleanText(birthRaw),
        boss: '',
        needGeneration: true,
        snils: cleanText(row.getCell(colSnils).value),
        phone: '',
        gender: normalizeGender(cleanText(row.getCell(colGender).value)),
        experience: cleanText(row.getCell(colExp).value) || '1',
        factors29n: cleanText(row.getCell(colFactors).value),
        periodicity: cleanText(row.getCell(colPeriod).value) || '1 раз в год',
        disability: cleanText(row.getCell(colDisab).value) || 'нет',
        under18: cleanText(row.getCell(colUnder18).value) || 'нет',
        plannedMedicalDate: medDateParsed ? formatDateRu(medDateParsed) : cleanText(medDateRaw),
        actualMedicalDate: '',
        pso342n: cleanText(row.getCell(col342).value) || 'нет',
      });
    });
  }

  return {
    employees,
    jobDirectory,
    companySettings,
    warnings,
    detectedType,
  };
}

/**
 * Создание чистого пустого шаблона Excel для заполнения пользователем
 */
export async function createBlankTemplateWorkbook(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DocGen Portable';
  workbook.created = new Date();

  // Лист "СПИСОК"
  const wsList = workbook.addWorksheet('СПИСОК');
  wsList.columns = [
    { header: '№', key: 'num', width: 6 },
    { header: 'сотрудник', key: 'fio', width: 34 },
    { header: 'подразделение', key: 'dept', width: 28 },
    { header: 'должность', key: 'post', width: 36 },
    { header: 'дата приема', key: 'hireDate', width: 14 },
    { header: 'дата рождения', key: 'birthDate', width: 14 },
    { header: 'руководитель', key: 'boss', width: 36 },
    { header: 'СНИЛС', key: 'snils', width: 18 },
    { header: 'Телефон', key: 'phone', width: 16 },
    { header: 'стаж', key: 'experience', width: 10 },
    { header: 'плановая дата МО', key: 'plannedMedicalDate', width: 18 },
    { header: 'фактическая дата МО', key: 'actualMedicalDate', width: 20 },
  ];

  const headerRow1 = wsList.getRow(1);
  headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' },
  };
  headerRow1.alignment = { vertical: 'middle', horizontal: 'center' };

  // Пример строки для заполнения
  wsList.addRow({
    num: '01',
    fio: 'Иванов Иван Иванович (пример)',
    dept: 'Производственный отдел',
    post: 'Техник по эксплуатации и ремонту оборудования',
    hireDate: '01.09.2026',
    birthDate: '15.05.1990',
    boss: 'Руководитель производственного отдела Шмаль А.А.',
    snils: '123-456-789 00',
    phone: '89991234567',
    experience: '1',
    plannedMedicalDate: '15.10.2026',
    actualMedicalDate: '',
  });

  // Лист "ДАННЫЕ"
  const wsData = workbook.addWorksheet('ДАННЫЕ');
  wsData.columns = [
    { header: 'подразделение', key: 'dept', width: 26 },
    { header: 'статус', key: 'status', width: 12 },
    { header: 'должность', key: 'post', width: 36 },
    { header: 'электробезопасность', key: 'electr', width: 20 },
    { header: 'инструктаж на рабочем месте', key: 'instr', width: 45 },
    { header: 'стажировка', key: 'stag', width: 45 },
    { header: 'Вредность', key: 'harm', width: 20 },
    { header: 'Психиатрия', key: 'psych', width: 18 },
    { header: 'инструкция', key: 'instrDoc', width: 16 },
    { header: 'СОУТ', key: 'sout', width: 16 },
    { header: 'Класс', key: 'soutClass', width: 12 },
    { header: 'ОПР', key: 'opr', width: 16 },
  ];

  const headerRow2 = wsData.getRow(1);
  headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };
  headerRow2.alignment = { vertical: 'middle', horizontal: 'center' };

  // Пример должности
  wsData.addRow({
    dept: 'Производственный отдел',
    status: 'Рабочий',
    post: 'Техник по эксплуатации и ремонту оборудования',
    electr: '2 группа',
    instr: 'Программа первичного инструктажа для техников',
    stag: 'Программа стажировки для техников',
    harm: '4.4; 5.1;',
    psych: '11',
    instrDoc: 'ИОТ-08',
    sout: 'Карта № 15',
    soutClass: '3.1',
    opr: 'ОПР-08',
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

/**
 * Генерация файла Excel (XLSX) с текущими данными базы
 */
export async function createExportWorkbook(
  employees: Employee[],
  jobDirectory: JobDirectoryItem[]
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DocGen Portable';
  workbook.created = new Date();

  // Лист "СПИСОК"
  const wsList = workbook.addWorksheet('СПИСОК');
  wsList.columns = [
    { header: '№', key: 'num', width: 6 },
    { header: 'сотрудник', key: 'fio', width: 34 },
    { header: 'подразделение', key: 'dept', width: 28 },
    { header: 'должность', key: 'post', width: 36 },
    { header: 'дата приема', key: 'hireDate', width: 14 },
    { header: 'дата рождения', key: 'birthDate', width: 14 },
    { header: 'руководитель', key: 'boss', width: 36 },
    { header: 'СНИЛС', key: 'snils', width: 18 },
    { header: 'Телефон', key: 'phone', width: 16 },
    { header: 'стаж', key: 'experience', width: 10 },
    { header: 'плановая дата МО', key: 'plannedMedicalDate', width: 18 },
    { header: 'фактическая дата МО', key: 'actualMedicalDate', width: 20 },
  ];

  const headerRow1 = wsList.getRow(1);
  headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' },
  };
  headerRow1.alignment = { vertical: 'middle', horizontal: 'center' };

  employees.forEach((emp) => {
    wsList.addRow({
      num: emp.num,
      fio: emp.fio,
      dept: emp.dept,
      post: emp.post,
      hireDate: emp.hireDate,
      birthDate: emp.birthDate,
      boss: emp.boss,
      snils: emp.snils,
      phone: emp.phone,
      experience: emp.experience || '1',
      plannedMedicalDate: emp.plannedMedicalDate || '',
      actualMedicalDate: emp.actualMedicalDate || '',
    });
  });

  // Лист "ДАННЫЕ"
  const wsData = workbook.addWorksheet('ДАННЫЕ');
  wsData.columns = [
    { header: 'подразделение', key: 'dept', width: 26 },
    { header: 'статус', key: 'status', width: 12 },
    { header: 'должность', key: 'post', width: 36 },
    { header: 'электробезопасность', key: 'electr', width: 20 },
    { header: 'инструктаж на рабочем месте', key: 'instr', width: 45 },
    { header: 'стажировка', key: 'stag', width: 45 },
    { header: 'Вредность', key: 'harm', width: 20 },
    { header: 'Психиатрия', key: 'psych', width: 18 },
    { header: 'инструкция', key: 'instrDoc', width: 16 },
    { header: 'СОУТ', key: 'sout', width: 16 },
    { header: 'Класс', key: 'soutClass', width: 12 },
    { header: 'ОПР', key: 'opr', width: 16 },
  ];

  const headerRow2 = wsData.getRow(1);
  headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };
  headerRow2.alignment = { vertical: 'middle', horizontal: 'center' };

  jobDirectory.forEach((job) => {
    wsData.addRow({
      dept: job.dept || '',
      status: job.status,
      post: job.post,
      electr: job.electricalSafety,
      instr: job.instructionProgram || 'нет',
      stag: job.internshipProgram || 'нет',
      harm: job.factors || 'нет',
      psych: job.psychiatry || 'нет',
      instrDoc: job.instructionDoc,
      sout: job.sout || 'Карта № 1',
      soutClass: job.soutClass || '2',
      opr: job.opr || 'ОПР-01',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

/**
 * Создание специализированного Excel-файла «График медосмотра»
 */
export async function createMedicalScheduleWorkbook(
  employees: Employee[],
  jobDirectory: JobDirectoryItem[],
  companySettings: CompanySettings,
  examType: ExamType | 'all' = 'периодический'
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DocGen Portable';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('График медосмотра');

  // Заголовок
  ws.mergeCells('A1:J1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'ПЛАН-ГРАФИК ПРОХОЖДЕНИЯ МЕДИЦИНСКИХ ОСМОТРОВ';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:J2');
  const orgCell = ws.getCell('A2');
  orgCell.value = `${companySettings.companyName} • Вид МО: ${examType === 'all' ? 'Все' : examType.toUpperCase()}`;
  orgCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF475569' } };
  orgCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A3:J3');
  const authCell = ws.getCell('A3');
  authCell.value = `Утверждаю: ${companySettings.executivePost} ${companySettings.executiveFIO}   «___» __________ 202_ г.`;
  authCell.font = { name: 'Calibri', size: 10, bold: true };
  authCell.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.addRow([]); // пустая строка 4

  // Заголовки колонок (строка 5)
  const headerRow = ws.getRow(5);
  headerRow.values = [
    '№ п/п',
    'Ф.И.О. сотрудника',
    'Подразделение',
    'Должность (профессия)',
    'Вредные факторы (Приказ 29н)',
    'Психиатрия (Приказ 342н)',
    'Вид МО',
    'Плановая дата МО',
    'Фактическая дата МО',
    'Статус прохождения',
  ];

  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' }, // teal-600
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 28;

  ws.columns = [
    { width: 8 },  // №
    { width: 34 }, // ФИО
    { width: 26 }, // Подразделение
    { width: 36 }, // Должность
    { width: 24 }, // Факторы 29н
    { width: 20 }, // ПСО 342н
    { width: 16 }, // Вид
    { width: 18 }, // План
    { width: 18 }, // Факт
    { width: 22 }, // Статус
  ];

  let counter = 1;
  const now = new Date();

  employees.forEach((emp) => {
    const job = jobDirectory.find(
      (j) => j.post && j.post.trim().toLowerCase() === (emp.post || '').trim().toLowerCase()
    );
    const harm = emp.factors29n || job?.factors || 'нет';
    const psych = emp.pso342n || job?.psychiatry || 'нет';

    let status = 'Не запланирован';
    if (emp.actualMedicalDate) {
      status = `Пройден (${emp.actualMedicalDate})`;
    } else if (emp.plannedMedicalDate) {
      const pDate = parseDateRu(emp.plannedMedicalDate);
      if (pDate && pDate < now) {
        status = 'Просрочен';
      } else {
        status = 'Запланирован';
      }
    }

    const row = ws.addRow([
      counter++,
      emp.fio,
      emp.dept,
      emp.post,
      harm,
      psych,
      examType === 'all' ? (companySettings.examType || 'периодический') : examType,
      emp.plannedMedicalDate || '—',
      emp.actualMedicalDate || '—',
      status,
    ]);

    row.alignment = { vertical: 'middle' };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
