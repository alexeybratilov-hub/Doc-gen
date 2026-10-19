import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import JSZip from 'jszip';
import { CompanySettings, DateConfig, Employee, ExamType, GeneratedDocItem, JobDirectoryItem, TemplateItem } from './types';
import { formatDateRu, getNextWorkingDay, parseDateRu } from './holidays';

export function sanitizeFileName(name: string): string {
  let s = String(name || '').trim();
  const badChars = ['\\', '/', ':', '*', '?', '"', '<', '>', '|', '\r', '\n', '\t'];
  for (const c of badChars) {
    s = s.split(c).join('_');
  }
  s = s.replace(/\s+/g, '_');
  s = s.replace(/_+/g, '_');
  s = s.replace(/^_+|_+$/g, '');
  return s || 'Документ';
}

export function formatSequenceNumber(num: string | number): string {
  if (!num) return '00';
  const s = String(num).trim();
  if (/^\d+$/.test(s)) {
    return s.padStart(2, '0');
  }
  return sanitizeFileName(s);
}

/**
 * Создаёт стандартный DOCX-файл для любого шаблона «с нуля»,
 * если пользователь ещё не загрузил собственный файл .docx
 */
export async function generateBuiltInTemplateDocx(templateName: string, description: string): Promise<Uint8Array> {
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // word/_rels/document.xml.rels
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // word/styles.xml
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:lang w:val="ru-RU"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`
  );

  // Формируем красивый документ с разметкой тегов
  let bodyXml = '';

  if (templateName === 'Вводный') {
    bodyXml = `
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>ЖУРНАЛ РЕГИСТРАЦИИ ВВОДНОГО ИНСТРУКТАЖА</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>{{организация}}</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Запись № {{№}} от {{дата}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>1. Фамилия, имя, отчество инструктируемого: </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>{{ФИО}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>2. Дата рождения: {{ДР}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>3. Структурное подразделение: {{подразделение}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>4. Профессия, должность: </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>{{должность}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>5. Дата приёма на работу: {{прием}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>6. Непосредственный руководитель: {{руководитель}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>7. Проверка знаний: {{проверка знаний}}</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:t>Подпись инструктируемого: _________________ ({{ФИО}})</w:t></w:r></w:p>
      <w:p><w:r><w:t>Подпись инструктирующего: _________________</w:t></w:r></w:p>
    `;
  } else if (templateName === 'СЛ') {
    bodyXml = `
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>СТАЖИРОВОЧНЫЙ ЛИСТ № {{№}}</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>{{организация}}</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:t>Сотрудник: </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>{{ФИО}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Должность: {{должность}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Подразделение: {{подразделение}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Дата приёма: {{прием}}</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Дата начала стажировки: {{дата_стажировки}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Программа стажировки: {{программа стажировки}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Руководитель стажировки: {{руководитель}}</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:t>Стажировку прошёл. Допуск к самостоятельной работе разрешён.</w:t></w:r></w:p>
      <w:p><w:r><w:t>Подпись работника: _________________</w:t></w:r></w:p>
      <w:p><w:r><w:t>Подпись руководителя стажировки: _________________</w:t></w:r></w:p>
    `;
  } else if (templateName.startsWith('Лист_')) {
    bodyXml = `
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>ЛИСТ ОЗНАКОМЛЕНИЯ С ЛОКАЛЬНЫМИ НОРМАТИВНЫМИ АКТАМИ И ИНСТРУКЦИЯМИ</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Категория персонала: ${templateName.replace('Лист_', '')}</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>{{организация}}</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:t>Дата: {{дата}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Сотрудник: </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>{{ФИО}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Подразделение: {{подразделение}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Должность: {{должность}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Программа инструктажа: {{программа инструктажа}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Инструкция по ОТ: {{Инструкция}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Специальная оценка условий труда (СОУТ): {{СОУТ}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Инструктаж провёл: {{руководитель}}</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:t>Со всеми локальными нормативными актами предприятия и инструкциями по охране труда ознакомлен(а).</w:t></w:r></w:p>
      <w:p><w:r><w:t>Подпись работника: _________________</w:t></w:r></w:p>
    `;
  } else if (templateName === 'МО') {
    bodyXml = `
      <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Приложение № 1 к Порядку проведения обязательных МО,</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>утв. приказом Минздрава России от 28.01.2021 № 29н</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>НАПРАВЛЕНИЕ НА МЕДИЦИНСКИЙ ОСМОТР № {{№}}</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:i/></w:rPr><w:t>(Вид медицинского осмотра: {{вид_медосмотра}})</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>1. Работодатель: </w:t></w:r><w:r><w:t>{{организация}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>2. Работник (Ф.И.О.): </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>{{ФИО}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>3. Дата рождения: {{ДР}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>4. СНИЛС: {{СНИЛС}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>5. Структурное подразделение: {{подразделение}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>6. Профессия (должность): {{должность}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>7. Стаж работы в организации: {{СТАЖ}}</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>8. Вредные и (или) опасные производственные факторы (п. 29н): </w:t></w:r><w:r><w:t>{{ФАКТОРЫ}}</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:t>Уполномоченный представитель работодателя: {{руководитель_организации}} _________</w:t></w:r></w:p>
      <w:p><w:r><w:t>Дата выдачи направления: {{дата}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Направление получил: _________________ ({{ФИО}})</w:t></w:r></w:p>
    `;
  } else if (templateName === 'ПСО') {
    bodyXml = `
      <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Приложение к приказу Минздрава РФ от 20.05.2022 № 342н</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>НАПРАВЛЕНИЕ НА ОБЯЗАТЕЛЬНОЕ ПСИХИАТРИЧЕСКОЕ ОСВИДЕТЕЛЬСТВОВАНИЕ № {{№}}</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:i/></w:rPr><w:t>(Вид медицинского осмотра: {{вид_медосмотра}})</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>1. Работодатель: </w:t></w:r><w:r><w:t>{{организация}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>2. Работник (Ф.И.О.): </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>{{ФИО}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>3. Дата рождения: {{ДР}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>4. СНИЛС: {{СНИЛС}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>5. Структурное подразделение: {{подразделение}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>6. Профессия (должность): {{должность}}</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>7. Вид профессиональной деятельности (приказ 342н): </w:t></w:r><w:r><w:t>{{ФАКТОРЫ}}</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:t>Уполномоченный представитель работодателя: {{руководитель_организации}} _________</w:t></w:r></w:p>
      <w:p><w:r><w:t>Дата выдачи: {{дата}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Направление получил: _________________ ({{ФИО}})</w:t></w:r></w:p>
    `;
  } else {
    bodyXml = `
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${templateName}</w:t></w:r></w:p>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>{{организация}}</w:t></w:r></w:p>
      <w:p/>
      <w:p><w:r><w:t>Сотрудник: {{ФИО}} ({{должность}})</w:t></w:r></w:p>
      <w:p><w:r><w:t>Подразделение: {{подразделение}}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Дата: {{дата}}</w:t></w:r></w:p>
    `;
  }

  // word/document.xml
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/>
    </w:sectPr>
  </w:body>
</w:document>`
  );

  return await zip.generateAsync({ type: 'uint8array' });
}

/**
 * Подставляет теги в переданный файл шаблона (или встроенный)
 */
export async function renderDocx(
  templateBuffer: ArrayBuffer | Uint8Array,
  replacements: Record<string, string>
): Promise<Uint8Array> {
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch (e) {
    throw new Error('Не удалось прочитать файл шаблона DOCX (возможно, повреждённый архив или некорректный формат).');
  }

  // Создаем объект замены без фигурных скобок, если docxtemplater использует delimiters {{ }}
  const cleanData: Record<string, string> = {};
  for (const [k, v] of Object.entries(replacements)) {
    const rawKey = k.replace(/^\{\{|\}\}$/g, '');
    cleanData[rawKey] = v || '';
  }

  try {
    const doc = new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    doc.render(cleanData);
    const out = doc.getZip().generate({
      type: 'uint8array',
      compression: 'DEFLATE',
    });
    return out;
  } catch (err: any) {
    // В случае ошибок парсинга синтаксиса docxtemplater делаем fallback на прямое замещение тегов в XML
    console.warn('Docxtemplater warning, using direct XML tag replacement fallback:', err);
    return fallbackXmlReplace(zip, replacements);
  }
}

function fallbackXmlReplace(zip: PizZip, replacements: Record<string, string>): Uint8Array {
  // Список файлов внутри zip, где может быть текст
  const xmlFiles = Object.keys(zip.files).filter(
    (name) => name.startsWith('word/') && name.endsWith('.xml')
  );

  for (const xmlFile of xmlFiles) {
    let content = zip.files[xmlFile].asText();
    for (const [tag, value] of Object.entries(replacements)) {
      if (content.includes(tag)) {
        content = content.split(tag).join(escapeXml(value));
      }
    }
    zip.file(xmlFile, content);
  }

  return zip.generate({
    type: 'uint8array',
    compression: 'DEFLATE',
  });
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Проверяет, заполнена ли программа/вредность (не пустая и не "нет")
 */
export function hasProgramValue(val: string | null | undefined): boolean {
  if (!val) return false;
  const s = String(val).trim().toLowerCase();
  return s.length > 0 && s !== 'нет';
}

/**
 * Расчет стажа работы в текущей должности (в полных годах)
 * Согласно ТЗ: стаж 5 лет считается с даты приема на конкретную должность с вредными факторами.
 */
export function getEmployeeJobExperienceYears(emp: Employee): number {
  if (emp.hireDate) {
    const d = parseDateRu(emp.hireDate);
    if (d && !isNaN(d.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
        years--;
      }
      return Math.max(0, years);
    }
  }
  const parsedExp = parseInt(emp.experience || '0', 10);
  return isNaN(parsedExp) ? 0 : parsedExp;
}

/**
 * Проверка, является ли класс условий труда по СОУТ вредным (подклассы 3.1, 3.2, 3.3, 3.4 или 4)
 */
export function isHarmfulSoutClass(soutClass: string | undefined): boolean {
  if (!soutClass) return false;
  const s = String(soutClass).trim();
  return ['3.1', '3.2', '3.3', '3.4', '4'].includes(s);
}

/**
 * Фильтрация вредных факторов сотрудника для периодического медосмотра
 * с учетом периодичности «1 раз в 2 года» и факторов, пройденных в прошлом году.
 */
export function filterEmployeeHarmFactors(
  emp: Employee,
  jobDirectory: JobDirectoryItem[]
): {
  effectiveFactorsText: string;
  includedCodes: string[];
  excluded2YearCodes: string[];
} {
  const job = jobDirectory.find(
    (j) => j.post && j.post.trim().toLowerCase() === (emp.post || '').trim().toLowerCase()
  );
  // Если у должности задан детальный конфиг факторов — это источник истины (контингент)
  if (job?.factorsConfig && job.factorsConfig.length > 0) {
    const completedLastYear = emp.harmFactorsCompletedLastYear || [];
    const included: string[] = [];
    const excluded: string[] = [];

    job.factorsConfig.forEach((fc) => {
      if (fc.periodicity === '1 раз в 2 года' && completedLastYear.includes(fc.code)) {
        excluded.push(fc.code);
      } else {
        included.push(fc.code);
      }
    });

    return {
      effectiveFactorsText: included.join('; ') + (included.length > 0 ? ';' : ''),
      includedCodes: included,
      excluded2YearCodes: excluded,
    };
  }

  // TODO: fallback для legacy-данных без factorsConfig (emp.factors29n / job.factors).
  // После полной миграции данных на factorsConfig этот блок будет удалён.
  const rawFactors = (emp.factors29n || job?.factors || '').trim();
  if (!rawFactors || rawFactors.toLowerCase() === 'нет') {
    return { effectiveFactorsText: '', includedCodes: [], excluded2YearCodes: [] };
  }

  const parts = rawFactors.split(';').map((s) => s.trim()).filter(Boolean);
  const completedLastYear = emp.harmFactorsCompletedLastYear || [];
  const included: string[] = [];
  const excluded: string[] = [];

  parts.forEach((p) => {
    // Если этот фактор был пройден в прошлом году и помечен как раз в 2 года
    if (completedLastYear.includes(p)) {
      excluded.push(p);
    } else {
      included.push(p);
    }
  });

  return {
    effectiveFactorsText: included.join('; ') + (included.length > 0 ? ';' : ''),
    includedCodes: included,
    excluded2YearCodes: excluded,
  };
}

/**
 * Определение права сотрудника на медосмотр по правилам Минздрава и ТЗ:
 * 1) В медосмотры не попадают сотрудники без вредных факторов (29н) и психиатрии (342н)
 * 2) В периодические медосмотры не попадают с одной лишь психиатрией - только с факторами вредности
 * 3) В профпатологию попадают ТОЛЬКО работники со стажем >= 5 лет во вредных условиях (подклассы 3.1, 3.2, 3.3, 3.4, 4)
 */
export function getEmployeeMedicalEligibility(
  emp: Employee,
  jobDirectory: JobDirectoryItem[],
  examType: ExamType | 'all' = 'all'
): {
  eligible: boolean;
  hasHarmFactors: boolean;
  hasPsychiatry: boolean;
  factors: string;
  psychiatry: string;
  isProfpathologyEligible: boolean;
  profpathologyReason?: string;
  jobYears: number;
  effectiveSoutClass: string;
} {
  const job = jobDirectory.find(
    (j) => j.post && j.post.trim().toLowerCase() === (emp.post || '').trim().toLowerCase()
  );
  const factors = (emp.factors29n || job?.factors || '').trim();
  const psychiatry = (emp.pso342n || job?.psychiatry || '').trim();
  // Класс СОУТ берётся ТОЛЬКО из контингента (jobDirectory) — переопределение в карточке сотрудника запрещено
  const effectiveSoutClass = String(job?.soutClass || '2').trim();
  const jobYears = getEmployeeJobExperienceYears(emp);

  const hasHarmFactors = hasProgramValue(factors);
  const hasPsychiatry = hasProgramValue(psychiatry);
  const isHarmful = isHarmfulSoutClass(effectiveSoutClass);
  const has5Years = jobYears >= 5;

  const isProfpathologyEligible = hasHarmFactors && isHarmful && has5Years;
  let profpathologyReason = '';
  if (!hasHarmFactors) {
    profpathologyReason = 'Отсутствуют вредные производственные факторы (29н)';
  } else if (!isHarmful) {
    profpathologyReason = `Класс условий труда ${effectiveSoutClass} не относится к вредным (требуется 3.1 - 4)`;
  } else if (!has5Years) {
    profpathologyReason = `Стаж в должности менее 5 лет (текущий стаж: ${jobYears} г.)`;
  }

  // Общее правило: в медосмотры не попадают люди без факторов вредности и психиатрии
  if (!hasHarmFactors && !hasPsychiatry) {
    return {
      eligible: false,
      hasHarmFactors: false,
      hasPsychiatry: false,
      factors,
      psychiatry,
      isProfpathologyEligible: false,
      profpathologyReason,
      jobYears,
      effectiveSoutClass,
    };
  }

  // Во вкладке периодических медосмотров: только с факторами вредности (без чисто психиатрии)
  if (examType === 'периодический') {
    if (!hasHarmFactors) {
      return {
        eligible: false,
        hasHarmFactors: false,
        hasPsychiatry,
        factors,
        psychiatry,
        isProfpathologyEligible: false,
        profpathologyReason,
        jobYears,
        effectiveSoutClass,
      };
    }
  }

  // В профпатологию: ТОЛЬКО те, у кого стаж >= 5 лет и вредный класс 3.1 - 4
  if (examType === 'профпатология') {
    return {
      eligible: isProfpathologyEligible,
      hasHarmFactors,
      hasPsychiatry,
      factors,
      psychiatry,
      isProfpathologyEligible,
      profpathologyReason,
      jobYears,
      effectiveSoutClass,
    };
  }

  return {
    eligible: true,
    hasHarmFactors,
    hasPsychiatry,
    factors,
    psychiatry,
    isProfpathologyEligible,
    profpathologyReason,
    jobYears,
    effectiveSoutClass,
  };
}

export function computeDocDate(config?: DateConfig): string {
  if (!config || config.mode === 'current') {
    return formatDateRu(new Date());
  }
  if (config.mode === 'custom') {
    return config.customDate ? config.customDate.trim() : formatDateRu(new Date());
  }
  if (config.mode === 'open') {
    return '«___» ____________ 202_ г.';
  }
  return formatDateRu(new Date());
}

/**
 * Основная функция генерации комплекта документов
 */
export async function generateDocuments({
  scenario,
  employees,
  jobDirectory,
  companySettings,
  holidaysList,
  templatesMap,
  templateDateConfigs,
}: {
  scenario: 'instructions' | 'directions';
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  companySettings: CompanySettings;
  holidaysList?: string[];
  templatesMap?: Map<string, ArrayBuffer | Uint8Array>;
  templateDateConfigs?: Record<string, DateConfig>;
}): Promise<{
  files: GeneratedDocItem[];
  warnings: string[];
  updatedEmployees: Employee[];
}> {
  const files: GeneratedDocItem[] = [];
  const warnings: string[] = [];
  const updatedEmployees = employees.map((emp) => ({ ...emp }));

  // Создаем карту должностей в нижнем регистре
  const jobMap = new Map<string, JobDirectoryItem>();
  for (const job of jobDirectory) {
    if (job.post) {
      jobMap.set(job.post.trim().toLowerCase(), job);
    }
  }

  const currentYear = new Date().getFullYear();

  for (let i = 0; i < updatedEmployees.length; i++) {
    const emp = updatedEmployees[i];
    const rowNum = i + 1;

    // В сценарии инструктажей проверяем флаг needGeneration
    if (scenario === 'instructions' && !emp.needGeneration) {
      continue;
    }

    if (!emp.fio || !emp.fio.trim()) {
      warnings.push(`Строка ${rowNum}: Не заполнено Ф.И.О. сотрудника, пропущена.`);
      continue;
    }

    const numFormatted = formatSequenceNumber(emp.num || String(rowNum));
    const fioClean = emp.fio.trim();
    const fioFile = sanitizeFileName(fioClean);
    const postClean = (emp.post || '').trim();
    const postFile = sanitizeFileName(postClean) || 'БезДолжности';

    // Поиск по должности в справочнике
    const jobKey = postClean.toLowerCase();
    const jobInfo = jobMap.get(jobKey);

    // ==========================================================
    // СЦЕНАРИЙ 1: ИНСТРУКТАЖИ ПО ОХРАНЕ ТРУДА
    // ==========================================================
    if (scenario === 'instructions') {
      if (!jobInfo) {
        warnings.push(`Строка ${rowNum} (${fioClean}): Должность «${postClean}» не найдена в листе «ДАННЫЕ». Документы, зависящие от справочника, созданы не будут.`);
      }

      // Дата стажировки = следующий рабочий день после даты приёма
      let internshipDateText = '';
      const hireDateObj = parseDateRu(emp.hireDate);
      if (hireDateObj) {
        const nextWorkDay = getNextWorkingDay(hireDateObj, holidaysList);
        internshipDateText = formatDateRu(nextWorkDay);
      } else if (emp.hireDate) {
        warnings.push(`Строка ${rowNum} (${fioClean}): Не удалось распознать дату приёма «${emp.hireDate}». Тег {{дата_стажировки}} оставлен пустым.`);
      }

      const statusLower = (jobInfo?.status || '').toLowerCase();
      const instrProgramRaw = jobInfo?.instructionProgram || '';
      const stagProgramRaw = jobInfo?.internshipProgram || '';
      const harmRaw = jobInfo?.factors || '';
      const psychRaw = jobInfo?.psychiatry || '';

      const allowSL = hasProgramValue(stagProgramRaw);
      const allowITR = statusLower === 'итр';
      const allowWorker = statusLower === 'рабочий' || statusLower === 'рабочие';
      const allowOffice = statusLower === 'офис';
      const allowMO = hasProgramValue(harmRaw);
      const allowPSO = hasProgramValue(psychRaw);

      // Список шаблонов для генерации
      const targetTemplates: { name: string; folder: 'инструктажи' | 'Направления' }[] = [
        { name: 'Вводный', folder: 'инструктажи' },
      ];

      if (allowSL) targetTemplates.push({ name: 'СЛ', folder: 'инструктажи' });
      if (allowITR) targetTemplates.push({ name: 'Лист_ИТР', folder: 'инструктажи' });
      if (allowWorker) targetTemplates.push({ name: 'Лист_Рабочие', folder: 'инструктажи' });
      if (allowOffice) targetTemplates.push({ name: 'Лист_Офис', folder: 'инструктажи' });
      if (allowMO) targetTemplates.push({ name: 'МО', folder: 'Направления' });
      if (allowPSO) targetTemplates.push({ name: 'ПСО', folder: 'Направления' });

      let generatedInRow = 0;

      for (const tpl of targetTemplates) {
        const dateConfig = templateDateConfigs?.[tpl.name];
        const docDate = computeDocDate(dateConfig);

        const replacements: Record<string, string> = {
          '{{№}}': numFormatted,
          '{{ФИО}}': fioClean,
          '{{подразделение}}': emp.dept || jobInfo?.dept || '',
          '{{должность}}': postClean,
          '{{прием}}': emp.hireDate || '',
          '{{ДР}}': emp.birthDate || '',
          '{{руководитель}}': emp.boss || '',
          '{{дата}}': docDate,
          '{{дата_стажировки}}': internshipDateText,
          '{{программа инструктажа}}': hasProgramValue(instrProgramRaw) ? instrProgramRaw : '',
          '{{программа стажировки}}': allowSL ? stagProgramRaw : '',
          '{{ФАКТОРЫ}}': harmRaw,
          '{{Инструкция}}': jobInfo?.instructionDoc || '',
          '{{СОУТ}}': jobInfo?.sout || '',
          '{{класс_соут}}': jobInfo?.soutClass || '',
          '{{ОПР}}': jobInfo?.opr || '',
          '{{СТАЖ}}': emp.experience || '1',
          '{{СНИЛС}}': emp.snils || '',
          '{{организация}}': companySettings.companyName,
          '{{вид_медосмотра}}': companySettings.examType,
          '{{руководитель_организации}}': `${companySettings.executivePost} ${companySettings.executiveFIO}`,
        };

        let tplBuffer = templatesMap?.get(tpl.name);
        if (!tplBuffer) {
          tplBuffer = await generateBuiltInTemplateDocx(tpl.name, `Шаблон ${tpl.name}`);
        }

        try {
          const renderedBytes = await renderDocx(tplBuffer, replacements);
          const outFileName = `${numFormatted}_${sanitizeFileName(tpl.name)}_${fioFile}_${postFile}_${currentYear}.docx`;

          files.push({
            name: outFileName,
            folder: tpl.folder,
            templateName: tpl.name,
            employeeFio: fioClean,
            blob: new Blob([renderedBytes as any], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            }),
            size: renderedBytes.byteLength,
          });
          generatedInRow++;
        } catch (err: any) {
          warnings.push(`Ошибка генерации шаблона «${tpl.name}» для строки ${rowNum} (${fioClean}): ${err.message}`);
        }
      }

      if (generatedInRow > 0) {
        emp.needGeneration = false;
      }
    }

    // ==========================================================
    // СЦЕНАРИЙ 2: НАПРАВЛЕНИЯ НА МЕДОСМОТР (29н и 342н)
    // ==========================================================
    if (scenario === 'directions') {
      let harmFactors = emp.factors29n || jobInfo?.factors || '';
      if (companySettings.examType !== 'предварительный') {
        const filtered = filterEmployeeHarmFactors(emp, jobDirectory);
        harmFactors = filtered.effectiveFactorsText || harmFactors;
      }
      const psoValue = emp.pso342n || jobInfo?.psychiatry || '';
      const currentDateText = formatDateRu(new Date());

      const genderText = emp.gender === 'ж' ? 'женский' : 'мужской';
      // Класс СОУТ берётся ТОЛЬКО из контингента (jobDirectory) — переопределение в карточке сотрудника запрещено
      const effectiveSoutClass = String(jobInfo?.soutClass || '2').trim();

      const examTypeText =
        companySettings.examType === 'профпатология'
          ? 'периодический медицинский осмотр в центре профпатологии'
          : companySettings.examType === 'предварительный'
          ? 'предварительный медицинский осмотр при поступлении на работу'
          : 'периодический медицинский осмотр';

      const replacements: Record<string, string> = {
        '{{№}}': numFormatted,
        '{{организация}}': `${companySettings.companyName}\nЮр. адрес: ${companySettings.legalAddress}\nОГРН: ${companySettings.ogrn}, ИНН: ${companySettings.inn}, ОКВЭД: ${companySettings.okved}`,
        '{{вид_медосмотра}}': examTypeText,
        '{{подразделение}}': emp.dept || jobInfo?.dept || '',
        '{{должность}}': postClean,
        '{{ФИО}}': fioClean,
        '{{пол}}': genderText,
        '{{класс_соут}}': effectiveSoutClass,
        '{{СОУТ}}': jobInfo?.sout || '',
        '{{ДР}}': emp.birthDate || '',
        '{{СТАЖ}}': String(getEmployeeJobExperienceYears(emp) || emp.experience || '1'),
        '{{ФАКТОРЫ}}': harmFactors,
        '{{СНИЛС}}': emp.snils || '',
        '{{дата}}': currentDateText,
        '{{руководитель_организации}}': `${companySettings.executivePost} ${companySettings.executiveFIO}`,
      };

      const targetTemplates: { name: string; folder: 'готовые_направления' }[] = [
        { name: 'МО', folder: 'готовые_направления' },
      ];

      // Важнейшее правило из ответов пользователя:
      // "ПСО шаблон нужно использовать только при предварительном МО"
      const isPreliminary = companySettings.examType === 'предварительный';
      const shouldGeneratePSO = isPreliminary && hasProgramValue(psoValue);

      if (shouldGeneratePSO) {
        targetTemplates.push({ name: 'ПСО', folder: 'готовые_направления' });
      }

      for (const tpl of targetTemplates) {
        let tplBuffer = templatesMap?.get(tpl.name);
        if (!tplBuffer) {
          tplBuffer = await generateBuiltInTemplateDocx(tpl.name, `Шаблон ${tpl.name}`);
        }

        try {
          const renderedBytes = await renderDocx(tplBuffer, replacements);
          const outFileName = `${numFormatted}_${sanitizeFileName(tpl.name)}_${fioFile}_${postFile}_${currentYear}.docx`;

          files.push({
            name: outFileName,
            folder: tpl.folder,
            templateName: tpl.name,
            employeeFio: fioClean,
            blob: new Blob([renderedBytes as any], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            }),
            size: renderedBytes.byteLength,
          });
        } catch (err: any) {
          warnings.push(`Ошибка генерации направления «${tpl.name}» для ${fioClean}: ${err.message}`);
        }
      }
    }
  }

  return {
    files,
    warnings,
    updatedEmployees,
  };
}
