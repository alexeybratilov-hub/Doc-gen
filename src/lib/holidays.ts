/**
 * Модуль производственного календаря РФ и расчёта даты стажировки
 * Точная репликация алгоритма GetNextWorkingDay из исходного макроса VBA
 */

// Официальные нерабочие праздничные дни РФ (2024-2027)
export const DEFAULT_HOLIDAYS_RU: string[] = [
  // 2024
  '01.01.2024', '02.01.2024', '03.01.2024', '04.01.2024', '05.01.2024', '06.01.2024', '07.01.2024', '08.01.2024',
  '23.02.2024', '08.03.2024', '29.04.2024', '30.04.2024', '01.05.2024', '09.05.2024', '10.05.2024', '12.06.2024',
  '04.11.2024', '30.12.2024', '31.12.2024',
  // 2025
  '01.01.2025', '02.01.2025', '03.01.2025', '04.01.2025', '05.01.2025', '06.01.2025', '07.01.2025', '08.01.2025',
  '23.02.2025', '08.03.2025', '01.05.2025', '02.05.2025', '08.05.2025', '09.05.2025', '12.06.2025', '13.06.2025',
  '03.11.2025', '04.11.2025', '31.12.2025',
  // 2026
  '01.01.2026', '02.01.2026', '03.01.2026', '04.01.2026', '05.01.2026', '06.01.2026', '07.01.2026', '08.01.2026',
  '23.02.2026', '09.03.2026', '01.05.2026', '09.05.2026', '11.05.2026', '12.06.2026', '04.11.2026', '31.12.2026',
  // 2027
  '01.01.2027', '02.01.2027', '03.01.2027', '04.01.2027', '05.01.2027', '06.01.2027', '07.01.2027', '08.01.2027',
  '23.02.2027', '08.03.2027', '01.05.2027', '09.05.2027', '12.06.2027', '04.11.2027'
];

export function formatDateRu(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

export function parseDateRu(val: string | number | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }

  // Если число (Excel serial number)
  if (typeof val === 'number') {
    if (val >= 1) {
      // Excel base date: 1899-12-30 (due to leap year bug in Lotus 1-2-3/Excel)
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const ms = val * 86400000;
      const d = new Date(epoch.getTime() + ms);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  const s = String(val).trim();
  if (!s) return null;

  // Разбор формата DD.MM.YYYY или DD/MM/YYYY или YYYY-MM-DD
  const partsDots = s.split(/[./-]/);
  if (partsDots.length === 3) {
    let day = 0;
    let month = 0;
    let year = 0;

    if (partsDots[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(partsDots[0], 10);
      month = parseInt(partsDots[1], 10) - 1;
      day = parseInt(partsDots[2], 10);
    } else {
      // DD.MM.YYYY
      day = parseInt(partsDots[0], 10);
      month = parseInt(partsDots[1], 10) - 1;
      year = parseInt(partsDots[2], 10);
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && year < 2100) {
      const d = new Date(year, month, day);
      if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
        return d;
      }
    }
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Расчет следующего рабочего дня (понедельник-пятница, пропуск праздников)
 */
export function getNextWorkingDay(baseDate: Date, holidaysList: string[] = DEFAULT_HOLIDAYS_RU): Date {
  const holidaySet = new Set(holidaysList);
  const cur = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  let safety = 0;

  while (safety < 1000) {
    safety++;
    cur.setDate(cur.getDate() + 1);
    const dayOfWeek = cur.getDay(); // 0 = вс, 6 = сб

    // Только пн-пт (1..5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dateStr = formatDateRu(cur);
      if (!holidaySet.has(dateStr)) {
        return cur;
      }
    }
  }

  return cur;
}
