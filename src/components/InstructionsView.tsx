import React, { useState, useMemo } from 'react';
import { CompanyItem, CompanySettings, Employee, GeneratedDocItem, JobDirectoryItem, TemplateItem } from '../lib/types';
import { generateDocuments, hasProgramValue } from '../lib/docxEngine';
import { formatDateRu, getNextWorkingDay, parseDateRu } from '../lib/holidays';
import { CompanySelector } from './CompanySelector';
import {
  Play,
  CheckSquare,
  Square,
  Filter,
  Search,
  FileText,
  Calendar,
  Building,
  Sparkles,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit3,
  Building2,
} from 'lucide-react';

interface InstructionsViewProps {
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  companySettings: CompanySettings;
  companies: CompanyItem[];
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  onAddNewCompany: () => void;
  onEditCompany: (company: CompanyItem) => void;
  onDeleteCompany: (companyId: string) => void;
  onNavigateToSettings: () => void;
  holidaysList: string[];
  templates: TemplateItem[];
  onUpdateEmployees: (updated: Employee[]) => void;
  onGenerationComplete: (files: GeneratedDocItem[], warnings: string[]) => void;
}

type SortField = 'num' | 'fio' | 'post' | 'dept' | 'hireDate' | 'status';
type SortOrder = 'asc' | 'desc';

export const InstructionsView: React.FC<InstructionsViewProps> = ({
  employees,
  jobDirectory,
  companySettings,
  companies,
  activeCompanyId,
  onSelectCompany,
  onAddNewCompany,
  onEditCompany,
  onDeleteCompany,
  onNavigateToSettings,
  holidaysList,
  templates,
  onUpdateEmployees,
  onGenerationComplete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [companyFilterMode, setCompanyFilterMode] = useState<'current' | 'all'>('current');
  const [isGenerating, setIsGenerating] = useState(false);

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('num');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Быстрое редактирование сотрудника
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Карта должностей для быстрого вычисления набора документов
  const jobMap = useMemo(() => {
    const map = new Map<string, JobDirectoryItem>();
    jobDirectory.forEach((j) => {
      if (j.post) map.set(j.post.trim().toLowerCase(), j);
    });
    return map;
  }, [jobDirectory]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.dept).filter(Boolean))),
    [employees]
  );

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === activeCompanyId) || companies[0];
  }, [companies, activeCompanyId]);

  const isEmployeeInCompany = (emp: Employee) => {
    if (companyFilterMode === 'all') return true;
    if (emp.companyId) {
      return emp.companyId === activeCompanyId;
    }
    const firstCompId = companies[0]?.id || 'comp-catania';
    return activeCompanyId === firstCompId;
  };

  const currentCompanyEmpCount = useMemo(() => {
    return employees.filter((e) => {
      if (e.companyId) return e.companyId === activeCompanyId;
      return activeCompanyId === (companies[0]?.id || 'comp-catania');
    }).length;
  }, [employees, activeCompanyId, companies]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesCompany = isEmployeeInCompany(emp);
      const matchesSearch =
        (emp.fio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.post || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'all' || emp.dept === selectedDept;
      return matchesCompany && matchesSearch && matchesDept;
    });
  }, [employees, searchTerm, selectedDept, companyFilterMode, activeCompanyId, companies]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let compareVal = 0;
      if (sortField === 'num') {
        compareVal = (a.num || '').localeCompare(b.num || '', undefined, { numeric: true });
      } else if (sortField === 'fio') {
        compareVal = (a.fio || '').localeCompare(b.fio || '');
      } else if (sortField === 'post') {
        compareVal = (a.post || '').localeCompare(b.post || '');
      } else if (sortField === 'dept') {
        compareVal = (a.dept || '').localeCompare(b.dept || '');
      } else if (sortField === 'hireDate') {
        const dateA = parseDateRu(a.hireDate);
        const dateB = parseDateRu(b.hireDate);
        if (!dateA && !dateB) compareVal = 0;
        else if (!dateA) compareVal = 1;
        else if (!dateB) compareVal = -1;
        else compareVal = dateA.getTime() - dateB.getTime();
      } else if (sortField === 'status') {
        const statA = a.needGeneration ? '1' : '0';
        const statB = b.needGeneration ? '1' : '0';
        compareVal = statA.localeCompare(statB);
      }

      return sortOrder === 'asc' ? compareVal : -compareVal;
    });
  }, [filteredEmployees, sortField, sortOrder]);

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
      <ArrowUp className="w-3.5 h-3.5 text-indigo-600 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-600 inline ml-1" />
    );
  };

  const selectedCount = employees.filter((e) => e.needGeneration).length;

  const toggleNeedGeneration = (id: string) => {
    onUpdateEmployees(
      employees.map((e) => (e.id === id ? { ...e, needGeneration: !e.needGeneration } : e))
    );
  };

  const selectAll = (val: boolean) => {
    onUpdateEmployees(
      employees.map((e) => {
        const inFiltered = filteredEmployees.some((fe) => fe.id === e.id);
        return inFiltered ? { ...e, needGeneration: val } : e;
      })
    );
  };

  // Расчёт списка документов, которые будут сформированы для конкретного сотрудника
  const getExpectedDocs = (emp: Employee) => {
    const docs: { name: string; folder: string; color: string }[] = [
      { name: 'Вводный', folder: 'инструктажи', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    ];

    const job = jobMap.get((emp.post || '').trim().toLowerCase());
    if (job) {
      if (hasProgramValue(job.internshipProgram)) {
        docs.push({ name: 'СЛ', folder: 'инструктажи', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' });
      }

      const s = job.status.toLowerCase();
      if (s === 'итр') {
        docs.push({ name: 'Лист_ИТР', folder: 'инструктажи', color: 'bg-purple-100 text-purple-800 border-purple-200' });
      } else if (s === 'рабочий' || s === 'рабочие') {
        docs.push({ name: 'Лист_Рабочие', folder: 'инструктажи', color: 'bg-amber-100 text-amber-800 border-amber-200' });
      } else if (s === 'офис') {
        docs.push({ name: 'Лист_Офис', folder: 'инструктажи', color: 'bg-sky-100 text-sky-800 border-sky-200' });
      }

      if (hasProgramValue(job.factors)) {
        docs.push({ name: 'МО', folder: 'Направления', color: 'bg-rose-100 text-rose-800 border-rose-200' });
      }

      if (hasProgramValue(job.psychiatry)) {
        docs.push({ name: 'ПСО', folder: 'Направления', color: 'bg-teal-100 text-teal-800 border-teal-200' });
      }
    }

    return docs;
  };

  // Суммарное количество файлов к формированию
  const totalFilesToGenerate = employees
    .filter((e) => e.needGeneration)
    .reduce((acc, e) => acc + getExpectedDocs(e).length, 0);

  const handleRunGeneration = async () => {
    if (selectedCount === 0) return;
    setIsGenerating(true);

    try {
      const templatesMap = new Map<string, ArrayBuffer>();
      for (const tpl of templates) {
        if (tpl.fileBuffer) {
          templatesMap.set(tpl.name, tpl.fileBuffer);
        }
      }

      const res = await generateDocuments({
        scenario: 'instructions',
        employees,
        jobDirectory,
        companySettings,
        holidaysList,
        templatesMap,
      });

      onUpdateEmployees(res.updatedEmployees);
      onGenerationComplete(res.files, res.warnings);
    } catch (err: any) {
      alert(`Ошибка при генерации документов: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEmpEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    onUpdateEmployees(employees.map((emp) => (emp.id === editingEmp.id ? editingEmp : emp)));
    setEditingEmp(null);
  };

  return (
    <div className="space-y-6">
      {/* Селектор и информационный блок текущего юридического лица */}
      <CompanySelector
        companies={companies}
        activeCompanyId={activeCompanyId}
        onSelectCompany={onSelectCompany}
        onAddNewCompany={onAddNewCompany}
        onEditCompany={onEditCompany}
        onDeleteCompany={onDeleteCompany}
        onNavigateToSettings={onNavigateToSettings}
        employeesCount={currentCompanyEmpCount}
        contingentCount={jobDirectory.length}
        variant="page"
      />

      {/* Верхний баннер сценария */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              Сценарий №1 • Приём на работу и инструктажи
            </div>
            <h2 className="text-xl font-extrabold">
              Пакетная генерация документов по охране труда
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Автоматически формирует комплект: журнал вводного инструктажа, стажировочный лист (СЛ),
              листы ознакомления (ИТР, Рабочие, Офис) и направления (МО, ПСО) с расчётом даты стажировки.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunGeneration}
              disabled={selectedCount === 0 || isGenerating}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              {isGenerating
                ? 'Формирование документов...'
                : `Сгенерировать (${selectedCount} чел. / ${totalFilesToGenerate} док.)`}
            </button>
          </div>
        </div>
      </div>

      {/* Панель фильтров и массового выбора */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по ФИО или должности..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white"
            >
              <option value="all">Все подразделения ({employees.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Фильтр по текущему юрлицу / всем юрлицам */}
          {companies.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setCompanyFilterMode('current')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  companyFilterMode === 'current'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`Показать только сотрудников ${activeCompany?.name || 'текущего юрлица'}`}
              >
                Только {activeCompany?.name ? activeCompany.name.split('«')[1]?.replace('»', '') || activeCompany.name : 'текущее'} ({currentCompanyEmpCount})
              </button>
              <button
                type="button"
                onClick={() => setCompanyFilterMode('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  companyFilterMode === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Показать сотрудников всех добавленных организаций"
              >
                Все ({employees.length})
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => selectAll(true)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Отметить всех
          </button>
          <button
            onClick={() => selectAll(false)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5" /> Снять выбор
          </button>
        </div>
      </div>

      {/* Таблица сотрудников с предпросмотром состава документов */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] select-none">
                <th className="py-3 px-4 w-12 text-center">Выбор</th>
                <th
                  onClick={() => handleHeaderSort('num')}
                  className="py-3 px-3 w-14 text-center cursor-pointer hover:bg-slate-100"
                >
                  № {renderSortIcon('num')}
                </th>
                <th
                  onClick={() => handleHeaderSort('fio')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Сотрудник (Ф.И.О.) {renderSortIcon('fio')}
                </th>
                <th
                  onClick={() => handleHeaderSort('post')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Должность и Подразделение {renderSortIcon('post')}
                </th>
                <th
                  onClick={() => handleHeaderSort('hireDate')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Дата приёма / Стажировка {renderSortIcon('hireDate')}
                </th>
                <th className="py-3 px-4">Формируемый пакет документов</th>
                <th
                  onClick={() => handleHeaderSort('status')}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100"
                >
                  Статус {renderSortIcon('status')}
                </th>
                <th className="py-3 px-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedEmployees.map((emp) => {
                const docs = getExpectedDocs(emp);
                const hireObj = parseDateRu(emp.hireDate);
                const nextWork = hireObj ? getNextWorkingDay(hireObj, holidaysList) : null;
                const internDate = nextWork ? formatDateRu(nextWork) : '—';
                const hasJobInDir = jobMap.has((emp.post || '').trim().toLowerCase());

                return (
                  <tr
                    key={emp.id}
                    onClick={() => toggleNeedGeneration(emp.id)}
                    className={`cursor-pointer transition hover:bg-indigo-50/50 ${
                      emp.needGeneration ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={emp.needGeneration}
                        onChange={() => toggleNeedGeneration(emp.id)}
                        className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-400 font-semibold">
                      {emp.num}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{emp.fio}</div>
                      <div className="text-[11px] text-slate-500">
                        {emp.birthDate ? `ДР: ${emp.birthDate}` : 'ДР не указан'}
                        {emp.snils ? ` • СНИЛС: ${emp.snils}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {emp.post}
                        {!hasJobInDir && (
                          <span
                            title="Должность не найдена в справочнике ДАННЫЕ"
                            className="text-amber-500"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {emp.dept || 'Подразделение не указано'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Приём: <span className="font-semibold">{emp.hireDate || '—'}</span>
                      </div>
                      <div className="text-[11px] text-indigo-700 font-medium">
                        Стажировка: {internDate}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {docs.map((d, didx) => (
                          <span
                            key={didx}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${d.color}`}
                            title={`Сохраняется в папку: ${d.folder}/`}
                          >
                            {d.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {emp.needGeneration ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          К генерации
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Не выбран</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingEmp({ ...emp })}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                        title="Редактировать сотрудника"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно быстрого редактирования сотрудника */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              Редактирование сотрудника: {editingEmp.fio}
            </h3>

            <form onSubmit={handleSaveEmpEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ФИО полностью:</label>
                <input
                  type="text"
                  value={editingEmp.fio}
                  onChange={(e) => setEditingEmp({ ...editingEmp, fio: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Должность:</label>
                  <input
                    type="text"
                    value={editingEmp.post}
                    onChange={(e) => setEditingEmp({ ...editingEmp, post: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Подразделение:</label>
                  <input
                    type="text"
                    value={editingEmp.dept}
                    onChange={(e) => setEditingEmp({ ...editingEmp, dept: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Дата приёма (ДД.ММ.ГГГГ):</label>
                  <input
                    type="text"
                    value={editingEmp.hireDate}
                    onChange={(e) => setEditingEmp({ ...editingEmp, hireDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Дата рождения (ДД.ММ.ГГГГ):</label>
                  <input
                    type="text"
                    value={editingEmp.birthDate}
                    onChange={(e) => setEditingEmp({ ...editingEmp, birthDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Руководитель:</label>
                <input
                  type="text"
                  value={editingEmp.boss}
                  onChange={(e) => setEditingEmp({ ...editingEmp, boss: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs text-slate-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold text-white shadow-xs"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
