import React, { useState, useMemo } from 'react';
import { CompanySettings, Employee, ExamType, JobDirectoryItem } from '../lib/types';
import {
  getEmployeeMedicalEligibility,
  getEmployeeJobExperienceYears,
  filterEmployeeHarmFactors,
  isHarmfulSoutClass,
} from '../lib/docxEngine';
import { createMedicalScheduleWorkbook } from '../lib/excelParser';
import { parseDateRu, formatDateRu } from '../lib/holidays';
import {
  CalendarClock,
  CalendarCheck,
  Search,
  Filter,
  Download,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Users,
  Edit2,
  Trash2,
  ChevronRight,
  ShieldAlert,
  History,
  X,
  Check,
} from 'lucide-react';

interface MedicalScheduleViewProps {
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  companySettings: CompanySettings;
  onUpdateEmployees: (updated: Employee[]) => void;
  onNavigateToDirections?: (preselectedIds?: string[]) => void;
}

type SortField =
  | 'num'
  | 'fio'
  | 'gender'
  | 'dept'
  | 'post'
  | 'soutClass'
  | 'experience'
  | 'plannedDate'
  | 'actualDate'
  | 'status';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'scheduled' | 'completed' | 'expired' | 'pending';

export const MedicalScheduleView: React.FC<MedicalScheduleViewProps> = ({
  employees,
  jobDirectory,
  companySettings,
  onUpdateEmployees,
  onNavigateToDirections,
}) => {
  // Выбранный режим отображения медосмотра
  const [examTypeMode, setExamTypeMode] = useState<ExamType | 'all'>('периодический');

  // Поиск и фильтры
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('plannedDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Выбранные сотрудники (для группового планирования)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Поля группового планирования
  const [batchPlannedDate, setBatchPlannedDate] = useState('');
  const [batchActualDate, setBatchActualDate] = useState('');

  // Модальное / инлайн окно быстрого редактирования отдельного сотрудника
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editPlannedDate, setEditPlannedDate] = useState('');
  const [editActualDate, setEditActualDate] = useState('');

  // Модалка настройки факторов прошлого года для сотрудника
  const [historyEmp, setHistoryEmp] = useState<Employee | null>(null);

  // 1. Фильтрация сотрудников по строгим правилам:
  // - Без факторов вредности и психиатрии не попадают
  // - В периодических МО: только с факторами вредности (без одной лишь психиатрии)
  // - В профпатологию: только работники со стажем >= 5 лет во вредных условиях (подклассы 3.1, 3.2, 3.3, 3.4, 4)
  const eligibleEmployees = useMemo(() => {
    return employees
      .map((emp) => {
        const eligibility = getEmployeeMedicalEligibility(emp, jobDirectory, examTypeMode);
        return {
          employee: emp,
          eligibility,
        };
      })
      .filter((item) => item.eligibility.eligible);
  }, [employees, jobDirectory, examTypeMode]);

  // Вычисляем список уникальных подразделений среди допущенных
  const departments = useMemo(() => {
    const set = new Set<string>();
    eligibleEmployees.forEach((item) => {
      if (item.employee.dept) set.add(item.employee.dept);
    });
    return Array.from(set).sort();
  }, [eligibleEmployees]);

  // Вычисление статуса медосмотра для сотрудника
  const getEmployeeStatus = (emp: Employee): { status: StatusFilter; label: string; color: string } => {
    if (emp.actualMedicalDate && emp.actualMedicalDate.trim()) {
      return { status: 'completed', label: 'Пройден', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (emp.plannedMedicalDate && emp.plannedMedicalDate.trim()) {
      const pDate = parseDateRu(emp.plannedMedicalDate);
      if (pDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (pDate < today) {
          return { status: 'expired', label: 'Просрочен', color: 'bg-rose-100 text-rose-800 border-rose-300' };
        }
      }
      return { status: 'scheduled', label: 'Запланирован', color: 'bg-sky-100 text-sky-800 border-sky-300' };
    }
    return { status: 'pending', label: 'Не назначен', color: 'bg-amber-100 text-amber-800 border-amber-300' };
  };

  // 2. Фильтрация по поиску, подразделению и статусу
  const filteredList = useMemo(() => {
    return eligibleEmployees.filter(({ employee: emp, eligibility }) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fioMatch = (emp.fio || '').toLowerCase().includes(term);
        const postMatch = (emp.post || '').toLowerCase().includes(term);
        const deptMatch = (emp.dept || '').toLowerCase().includes(term);
        const factorsMatch = (eligibility.factors || '').toLowerCase().includes(term);
        if (!fioMatch && !postMatch && !deptMatch && !factorsMatch) return false;
      }

      if (deptFilter !== 'all' && emp.dept !== deptFilter) return false;

      if (statusFilter !== 'all') {
        const { status } = getEmployeeStatus(emp);
        if (status !== statusFilter) return false;
      }

      return true;
    });
  }, [eligibleEmployees, searchTerm, deptFilter, statusFilter]);

  // 3. Сортировка списка
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      const empA = a.employee;
      const empB = b.employee;

      let compareVal = 0;

      if (sortField === 'num') {
        compareVal = (empA.num || '').localeCompare(empB.num || '', undefined, { numeric: true });
      } else if (sortField === 'fio') {
        compareVal = (empA.fio || '').localeCompare(empB.fio || '');
      } else if (sortField === 'gender') {
        compareVal = (empA.gender || '').localeCompare(empB.gender || '');
      } else if (sortField === 'dept') {
        compareVal = (empA.dept || '').localeCompare(empB.dept || '');
      } else if (sortField === 'post') {
        compareVal = (empA.post || '').localeCompare(empB.post || '');
      } else if (sortField === 'soutClass') {
        compareVal = (a.eligibility.effectiveSoutClass || '').localeCompare(b.eligibility.effectiveSoutClass || '');
      } else if (sortField === 'experience') {
        compareVal = a.eligibility.jobYears - b.eligibility.jobYears;
      } else if (sortField === 'plannedDate') {
        const dateA = parseDateRu(empA.plannedMedicalDate);
        const dateB = parseDateRu(empB.plannedMedicalDate);
        if (!dateA && !dateB) compareVal = 0;
        else if (!dateA) compareVal = 1;
        else if (!dateB) compareVal = -1;
        else compareVal = dateA.getTime() - dateB.getTime();
      } else if (sortField === 'actualDate') {
        const dateA = parseDateRu(empA.actualMedicalDate);
        const dateB = parseDateRu(empB.actualMedicalDate);
        if (!dateA && !dateB) compareVal = 0;
        else if (!dateA) compareVal = 1;
        else if (!dateB) compareVal = -1;
        else compareVal = dateA.getTime() - dateB.getTime();
      } else if (sortField === 'status') {
        const statA = getEmployeeStatus(empA).label;
        const statB = getEmployeeStatus(empB).label;
        compareVal = statA.localeCompare(statB);
      }

      return sortOrder === 'asc' ? compareVal : -compareVal;
    });
  }, [filteredList, sortField, sortOrder]);

  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 inline ml-1" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-teal-600 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-teal-600 inline ml-1" />
    );
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(new Set(sortedList.map((item) => item.employee.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Групповое назначение плановой даты
  const handleApplyBatchPlannedDate = (dateToSet?: string) => {
    const targetDate = dateToSet || batchPlannedDate;
    if (!targetDate) {
      alert('Пожалуйста, укажите дату в формате ДД.ММ.ГГГГ');
      return;
    }
    if (selectedIds.size === 0) {
      alert('Выберите хотя бы одного сотрудника для назначения даты');
      return;
    }

    const updated = employees.map((emp) => {
      if (selectedIds.has(emp.id)) {
        return {
          ...emp,
          plannedMedicalDate: targetDate,
        };
      }
      return emp;
    });

    onUpdateEmployees(updated);
    setBatchPlannedDate('');
  };

  // Групповое назначение фактической даты
  const handleApplyBatchActualDate = (dateToSet?: string) => {
    const targetDate = dateToSet || batchActualDate;
    if (!targetDate) {
      alert('Пожалуйста, укажите дату в формате ДД.ММ.ГГГГ');
      return;
    }
    if (selectedIds.size === 0) {
      alert('Выберите хотя бы одного сотрудника для отметки факта прохождения');
      return;
    }

    const updated = employees.map((emp) => {
      if (selectedIds.has(emp.id)) {
        return {
          ...emp,
          actualMedicalDate: targetDate,
        };
      }
      return emp;
    });

    onUpdateEmployees(updated);
    setBatchActualDate('');
  };

  // Быстрое изменение пола сотрудника
  const handleQuickGenderChange = (empId: string, gender: 'м' | 'ж') => {
    onUpdateEmployees(
      employees.map((e) => (e.id === empId ? { ...e, gender } : e))
    );
  };

  // D2: быстрого изменения класса СОУТ нет — источник истины jobDirectory (контингент), read-only

  // Очистка дат у выбранных
  const handleClearSelectedDates = (which: 'all' | 'planned' | 'actual') => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Очистить даты медосмотра для ${selectedIds.size} сотрудников?`)) return;

    const updated = employees.map((emp) => {
      if (selectedIds.has(emp.id)) {
        return {
          ...emp,
          plannedMedicalDate: which === 'actual' ? emp.plannedMedicalDate : '',
          actualMedicalDate: which === 'planned' ? emp.actualMedicalDate : '',
        };
      }
      return emp;
    });

    onUpdateEmployees(updated);
  };

  // Быстрое сохранение дат
  const handleSaveIndividualDates = (empId: string) => {
    const updated = employees.map((emp) => {
      if (emp.id === empId) {
        return {
          ...emp,
          plannedMedicalDate: editPlannedDate,
          actualMedicalDate: editActualDate,
        };
      }
      return emp;
    });
    onUpdateEmployees(updated);
    setEditingEmpId(null);
  };

  // Переключение фактора прошлого года в модалке
  const toggleFactorLastYear = (code: string) => {
    if (!historyEmp) return;
    const current = historyEmp.harmFactorsCompletedLastYear || [];
    let next: string[];
    if (current.includes(code)) {
      next = current.filter((c) => c !== code);
    } else {
      next = [...current, code];
    }
    const updatedEmp = { ...historyEmp, harmFactorsCompletedLastYear: next };
    setHistoryEmp(updatedEmp);
    onUpdateEmployees(employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
  };

  // Экспорт графика в Excel
  const handleExportExcel = async () => {
    const exportEmps = sortedList.map((item) => item.employee);
    const bytes = await createMedicalScheduleWorkbook(
      exportEmps,
      jobDirectory,
      companySettings,
      examTypeMode === 'all' ? 'периодический' : examTypeMode
    );
    const blob = new Blob([bytes as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `График_медосмотра_${examTypeMode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Сводная статистика
  const totalEligible = eligibleEmployees.length;
  const countCompleted = eligibleEmployees.filter((i) => i.employee.actualMedicalDate).length;
  const countScheduled = eligibleEmployees.filter(
    (i) => i.employee.plannedMedicalDate && !i.employee.actualMedicalDate
  ).length;
  const countPending = totalEligible - countCompleted - countScheduled;

  return (
    <div className="space-y-6">
      {/* Баннер раздела График Медосмотров */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 rounded-xl p-6 text-white shadow-md border border-teal-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
              <CalendarClock className="w-4 h-4" />
              План-график медицинских осмотров
            </div>
            <h2 className="text-xl font-extrabold">
              График прохождения обязательных медосмотров (Приказ 29н / 342н)
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Планирование дат отдельно для каждого работника или для выделенной группы с фиксацией плановой и фактической даты. Учет факторов, пройденных в прошлом году (периодичность «1 раз в 2 года»).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
              title="Скачать официальный график медосмотра в Excel"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Скачать график в Excel</span>
            </button>

            {onNavigateToDirections && (
              <button
                onClick={() => onNavigateToDirections(Array.from(selectedIds))}
                className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-md transition flex items-center gap-2"
              >
                <span>К направлениям</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Сводные счётчики */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-teal-800/80">
          <div className="bg-teal-950/60 p-2.5 rounded-lg border border-teal-800/50">
            <div className="text-[11px] text-teal-300 font-medium">Подлежат медосмотру</div>
            <div className="text-xl font-black text-white">{totalEligible} чел.</div>
          </div>
          <div className="bg-teal-950/60 p-2.5 rounded-lg border border-teal-800/50">
            <div className="text-[11px] text-sky-300 font-medium">Запланированы</div>
            <div className="text-xl font-black text-sky-300">{countScheduled} чел.</div>
          </div>
          <div className="bg-teal-950/60 p-2.5 rounded-lg border border-teal-800/50">
            <div className="text-[11px] text-emerald-300 font-medium">Фактически пройдены</div>
            <div className="text-xl font-black text-emerald-300">{countCompleted} чел.</div>
          </div>
          <div className="bg-teal-950/60 p-2.5 rounded-lg border border-teal-800/50">
            <div className="text-[11px] text-amber-300 font-medium">Требуют назначения</div>
            <div className="text-xl font-black text-amber-300">{countPending} чел.</div>
          </div>
        </div>
      </div>

      {/* Панель переключения режима (Периодический / Предварительный / Профпатология / Все) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Режим графика:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 flex-wrap">
              <button
                type="button"
                onClick={() => setExamTypeMode('периодический')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  examTypeMode === 'периодический'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Периодический МО (29н)
              </button>
              <button
                type="button"
                onClick={() => setExamTypeMode('предварительный')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  examTypeMode === 'предварительный'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Предварительный МО (29н + 342н)
              </button>
              <button
                type="button"
                onClick={() => setExamTypeMode('профпатология')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
                  examTypeMode === 'профпатология'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-rose-800 hover:bg-rose-50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Профпатология (стаж 5+ лет)</span>
              </button>
              <button
                type="button"
                onClick={() => setExamTypeMode('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  examTypeMode === 'all'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Все категории
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 italic">
            {examTypeMode === 'периодический' &&
              'Отображаются только сотрудники с пунктами вредности. Психиатрия (ПСО) без вредности скрыта.'}
            {examTypeMode === 'предварительный' &&
              'Отображаются сотрудники с факторами вредности и/или психиатрическим освидетельствованием.'}
            {examTypeMode === 'профпатология' &&
              'Отображаются ТОЛЬКО работники со стажем 5+ лет во вредных условиях (подклассы 3.1–4).'}
            {examTypeMode === 'all' && 'Отображаются все сотрудники, имеющие вредность или психиатрию.'}
          </div>
        </div>

        {/* Строка поиска и выпадающих фильтров */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по ФИО, должности, вредностям..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white"
            >
              <option value="all">Все подразделения</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white"
            >
              <option value="all">Все статусы</option>
              <option value="scheduled">Запланирован</option>
              <option value="completed">Пройден</option>
              <option value="expired">Просрочен</option>
              <option value="pending">Не назначен</option>
            </select>
          </div>
        </div>
      </div>

      {/* Панель группового планирования для выделенных сотрудников */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold">
              Выделено работников: <span className="text-teal-400 font-mono text-sm">{selectedIds.size}</span>
            </span>
            <span className="text-xs text-slate-400">
              (отметьте сотрудников галочками слева в таблице)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Групповой план */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
              <span className="text-[11px] font-semibold text-slate-300 ml-1">План:</span>
              <input
                type="text"
                placeholder="ДД.ММ.ГГГГ"
                value={batchPlannedDate}
                onChange={(e) => setBatchPlannedDate(e.target.value)}
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white text-center focus:outline-hidden focus:border-teal-400"
              />
              <button
                onClick={() => handleApplyBatchPlannedDate()}
                disabled={selectedIds.size === 0 || !batchPlannedDate}
                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-bold transition"
              >
                Задать план
              </button>
            </div>

            {/* Групповой факт */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
              <span className="text-[11px] font-semibold text-slate-300 ml-1">Факт:</span>
              <input
                type="text"
                placeholder="ДД.ММ.ГГГГ"
                value={batchActualDate}
                onChange={(e) => setBatchActualDate(e.target.value)}
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white text-center focus:outline-hidden focus:border-emerald-400"
              />
              <button
                onClick={() => handleApplyBatchActualDate()}
                disabled={selectedIds.size === 0 || !batchActualDate}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-bold transition"
              >
                Задать факт
              </button>
              <button
                onClick={() => {
                  const today = formatDateRu(new Date());
                  handleApplyBatchActualDate(today);
                }}
                disabled={selectedIds.size === 0}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 rounded text-[11px] transition"
                title="Отметить факт прохождения сегодня"
              >
                Сегодня
              </button>
            </div>

            {selectedIds.size > 0 && (
              <button
                onClick={() => handleClearSelectedDates('all')}
                className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-white hover:bg-rose-900/50 rounded-lg transition"
                title="Сбросить даты медосмотра у выбранных"
              >
                Сбросить даты
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Таблица графика медосмотра */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    onClick={() => selectAll(selectedIds.size < sortedList.length)}
                    className="p-1 hover:bg-slate-200 rounded transition"
                  >
                    {selectedIds.size > 0 && selectedIds.size === sortedList.length ? (
                      <CheckSquare className="w-4 h-4 text-teal-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleHeaderSort('num')}
                  className="py-3 px-2 w-12 text-center font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  № {renderSortIcon('num')}
                </th>
                <th
                  onClick={() => handleHeaderSort('fio')}
                  className="py-3 px-3 font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  Сотрудник (ФИО) {renderSortIcon('fio')}
                </th>
                <th
                  onClick={() => handleHeaderSort('gender')}
                  className="py-3 px-2 text-center font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100 w-12"
                >
                  Пол {renderSortIcon('gender')}
                </th>
                <th
                  onClick={() => handleHeaderSort('dept')}
                  className="py-3 px-3 font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100 hidden md:table-cell"
                >
                  Подразделение {renderSortIcon('dept')}
                </th>
                <th
                  onClick={() => handleHeaderSort('post')}
                  className="py-3 px-3 font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  Должность {renderSortIcon('post')}
                </th>
                <th
                  onClick={() => handleHeaderSort('soutClass')}
                  className="py-3 px-2 text-center font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  Класс {renderSortIcon('soutClass')}
                </th>
                <th
                  onClick={() => handleHeaderSort('experience')}
                  className="py-3 px-2 text-center font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                >
                  Стаж {renderSortIcon('experience')}
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">
                  Факторы (29н) / Учет 1 раз в 2 года
                </th>
                <th
                  onClick={() => handleHeaderSort('plannedDate')}
                  className="py-3 px-3 font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100 text-center w-32"
                >
                  Плановая дата {renderSortIcon('plannedDate')}
                </th>
                <th
                  onClick={() => handleHeaderSort('actualDate')}
                  className="py-3 px-3 font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100 text-center w-32"
                >
                  Факт МО {renderSortIcon('actualDate')}
                </th>
                <th
                  onClick={() => handleHeaderSort('status')}
                  className="py-3 px-3 font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-100 text-center w-24"
                >
                  Статус {renderSortIcon('status')}
                </th>
                <th className="py-3 px-3 text-right font-bold uppercase tracking-wider w-20">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <div className="font-semibold text-sm">Сотрудники не найдены</div>
                    <div className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {examTypeMode === 'профпатология'
                        ? 'В режиме «Профпатология» отображаются только работники со стажем работы от 5 лет в должности с вредным классом условий труда (3.1, 3.2, 3.3, 3.4, 4).'
                        : 'В списке нет работников, подлежащих данному виду медосмотра'}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedList.map(({ employee: emp, eligibility }) => {
                  const isSelected = selectedIds.has(emp.id);
                  const statusInfo = getEmployeeStatus(emp);
                  const isEditing = editingEmpId === emp.id;
                  const isFemale = emp.gender === 'ж';
                  const isHarmful = isHarmfulSoutClass(eligibility.effectiveSoutClass);

                  const factorCalc = filterEmployeeHarmFactors(emp, jobDirectory);

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      {/* Чекбокс */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => toggleSelect(emp.id)}
                          className="p-1 hover:bg-slate-200/60 rounded transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* № */}
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-400">
                        {emp.num}
                      </td>

                      {/* ФИО */}
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900 text-xs">{emp.fio}</div>
                        {emp.birthDate && (
                          <div className="text-[10px] text-slate-400">ДР: {emp.birthDate}</div>
                        )}
                      </td>

                      {/* Пол */}
                      <td className="py-2.5 px-2 text-center">
                        <select
                          value={isFemale ? 'ж' : 'м'}
                          onChange={(e) =>
                            handleQuickGenderChange(emp.id, e.target.value as 'м' | 'ж')
                          }
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border cursor-pointer ${
                            isFemale
                              ? 'bg-pink-50 text-pink-700 border-pink-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <option value="м">м</option>
                          <option value="ж">ж</option>
                        </select>
                      </td>

                      {/* Подразделение */}
                      <td className="py-2.5 px-3 hidden md:table-cell text-slate-600 text-[11px]">
                        {emp.dept || '—'}
                      </td>

                      {/* Должность */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 text-xs">
                        {emp.post}
                      </td>

                      {/* Класс СОУТ — read-only из контингента (jobDirectory), D2 */}
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-sm border ${
                            isHarmful
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                          title="Класс условий труда берётся из карты СОУТ должности (контингент) и не редактируется здесь"
                        >
                          {eligibility.effectiveSoutClass}
                        </span>
                      </td>

                      {/* Стаж */}
                      <td className="py-2.5 px-2 text-center text-slate-700 font-medium">
                        <span className={eligibility.jobYears >= 5 ? 'font-bold text-rose-700' : ''}>
                          {eligibility.jobYears} г.
                        </span>
                      </td>

                      {/* Факторы вредности и периодичность */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          {eligibility.hasHarmFactors && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-mono text-slate-700 truncate max-w-xs" title={eligibility.factors}>
                                {factorCalc.effectiveFactorsText || eligibility.factors}
                              </span>
                              <button
                                type="button"
                                onClick={() => setHistoryEmp(emp)}
                                className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 flex items-center gap-1 shrink-0"
                                title="Отметить факторы прошлого года (1 раз в 2 года)"
                              >
                                <History className="w-3 h-3 text-amber-600" />
                                <span>Прошлый год</span>
                              </button>
                            </div>
                          )}
                          {factorCalc.excluded2YearCodes.length > 0 && (
                            <div className="text-[10px] text-amber-700 italic">
                              Пропуск: {factorCalc.excluded2YearCodes.join(', ')} (пройдены в прошлом году)
                            </div>
                          )}
                          {eligibility.hasPsychiatry && (
                            <div className="text-[10px] text-purple-700 font-medium">
                              ПСО 342н: п. {eligibility.psychiatry}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Плановая дата */}
                      <td className="py-2.5 px-3 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="ДД.ММ.ГГГГ"
                            value={editPlannedDate}
                            onChange={(e) => setEditPlannedDate(e.target.value)}
                            className="w-24 px-1.5 py-1 text-xs border border-teal-500 rounded text-center focus:outline-hidden"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingEmpId(emp.id);
                              setEditPlannedDate(emp.plannedMedicalDate || '');
                              setEditActualDate(emp.actualMedicalDate || '');
                            }}
                            className="cursor-pointer font-mono text-xs hover:text-teal-700 hover:underline"
                            title="Нажмите для изменения"
                          >
                            {emp.plannedMedicalDate || (
                              <span className="text-slate-300 italic">не задана</span>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Фактическая дата */}
                      <td className="py-2.5 px-3 text-center">
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="ДД.ММ.ГГГГ"
                            value={editActualDate}
                            onChange={(e) => setEditActualDate(e.target.value)}
                            className="w-24 px-1.5 py-1 text-xs border border-emerald-500 rounded text-center focus:outline-hidden"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingEmpId(emp.id);
                              setEditPlannedDate(emp.plannedMedicalDate || '');
                              setEditActualDate(emp.actualMedicalDate || '');
                            }}
                            className="cursor-pointer font-mono text-xs hover:text-emerald-700 hover:underline"
                            title="Нажмите для изменения"
                          >
                            {emp.actualMedicalDate || (
                              <span className="text-slate-300 italic">не пройдено</span>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Статус */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Действия */}
                      <td className="py-2.5 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSaveIndividualDates(emp.id)}
                              className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold transition"
                            >
                              ОК
                            </button>
                            <button
                              onClick={() => setEditingEmpId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] transition"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingEmpId(emp.id);
                                setEditPlannedDate(emp.plannedMedicalDate || '');
                                setEditActualDate(emp.actualMedicalDate || '');
                              }}
                              className="p-1 text-slate-400 hover:text-teal-600 rounded transition"
                              title="Редактировать даты"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ОТМЕТКИ ФАКТОРОВ ПРОШЛОГО ГОДА */}
      {historyEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                Факторы прошлого года: {historyEmp.fio}
              </h3>
              <button onClick={() => setHistoryEmp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Отметьте факторы с периодичностью «1 раз в 2 года», которые работник прошел в прошлом году. Согласно нормативу Минздрава, такие факторы будут пропущены в текущем периодическом направлении.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800">Все установленные факторы должности:</div>
                <div className="flex flex-wrap gap-2">
                  {(historyEmp.factors29n || jobDirectory.find((j) => j.post === historyEmp.post)?.factors || '')
                    .split(';')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((code) => {
                      const isCompleted = (historyEmp.harmFactorsCompletedLastYear || []).includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => toggleFactorLastYear(code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-2 ${
                            isCompleted
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-mono font-bold">{code}</span>
                          <span>{isCompleted ? '✓ Пройден в прошлом году' : '+ Пройти в этом году'}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setHistoryEmp(null)}
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
