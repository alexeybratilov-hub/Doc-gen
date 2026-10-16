import React, { useState, useMemo } from 'react';
import { EmployeeCategory, HarmFactorConfig, JobDirectoryItem, SoutClassType } from '../lib/types';
import { FACTORS_29N_LIST, PSYCHIATRY_342N_LIST } from '../lib/normative29n342n';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  Stethoscope,
  Brain,
  Building,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface ContingentViewProps {
  jobDirectory: JobDirectoryItem[];
  onUpdateJobDirectory: (updated: JobDirectoryItem[]) => void;
  availableDepartments?: string[];
}

type SubTab = 'all' | 'medical' | 'psychiatry';
type SortField = 'post' | 'status' | 'dept' | 'electricalSafety' | 'factors' | 'psychiatry' | 'sout' | 'soutClass';
type SortOrder = 'asc' | 'desc';

export const ContingentView: React.FC<ContingentViewProps> = ({
  jobDirectory,
  onUpdateJobDirectory,
  availableDepartments = [],
}) => {
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | EmployeeCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Модальное окно редактирования
  const [editingJob, setEditingJob] = useState<JobDirectoryItem | null>(null);
  const [activeModalSection, setActiveModalSection] = useState<'general' | 'factors29n' | 'psych342n'>('general');

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('post');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Уникальный список подразделений
  const departments = useMemo(() => {
    const set = new Set<string>();
    jobDirectory.forEach((j) => {
      if (j.dept && j.dept.trim()) set.add(j.dept.trim());
    });
    availableDepartments.forEach((d) => {
      if (d && d.trim()) set.add(d.trim());
    });
    return Array.from(set).sort();
  }, [jobDirectory, availableDepartments]);

  // Фильтрация
  const filteredJobs = useMemo(() => {
    return jobDirectory.filter((job) => {
      const matchesCat = filterCategory === 'all' ? true : job.status === filterCategory;
      const matchesDept = selectedDeptFilter === 'all' ? true : job.dept === selectedDeptFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (job.post || '').toLowerCase().includes(term) ||
        (job.dept || '').toLowerCase().includes(term) ||
        (job.factors || '').toLowerCase().includes(term) ||
        (job.psychiatry || '').toLowerCase().includes(term) ||
        (job.sout || '').toLowerCase().includes(term);

      if (subTab === 'medical') {
        // Подвкладка медосмотра: только те, у кого есть вредности/факторы или подлежат МО
        const hasFactors = (job.factors && job.factors.trim().toLowerCase() !== 'нет' && job.factors.trim() !== '') ||
          (job.factorsConfig && job.factorsConfig.length > 0);
        return matchesCat && matchesDept && matchesSearch && hasFactors;
      }

      if (subTab === 'psychiatry') {
        // Подвкладка психиатрии: только те, у кого есть пункты 342н
        const hasPsych = (job.psychiatry && job.psychiatry.trim().toLowerCase() !== 'нет' && job.psychiatry.trim() !== '') ||
          (job.psychiatryPoints && job.psychiatryPoints.length > 0);
        return matchesCat && matchesDept && matchesSearch && hasPsych;
      }

      return matchesCat && matchesDept && matchesSearch;
    });
  }, [jobDirectory, filterCategory, selectedDeptFilter, searchTerm, subTab]);

  // Сортировка
  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      let compareVal = 0;
      if (sortField === 'post') compareVal = (a.post || '').localeCompare(b.post || '');
      else if (sortField === 'status') compareVal = (a.status || '').localeCompare(b.status || '');
      else if (sortField === 'dept') compareVal = (a.dept || '').localeCompare(b.dept || '');
      else if (sortField === 'electricalSafety') compareVal = (a.electricalSafety || '').localeCompare(b.electricalSafety || '');
      else if (sortField === 'factors') compareVal = (a.factors || '').localeCompare(b.factors || '');
      else if (sortField === 'psychiatry') compareVal = (a.psychiatry || '').localeCompare(b.psychiatry || '');
      else if (sortField === 'sout') compareVal = (a.sout || '').localeCompare(b.sout || '');
      else if (sortField === 'soutClass') compareVal = (a.soutClass || '').localeCompare(b.soutClass || '');
      return sortOrder === 'asc' ? compareVal : -compareVal;
    });
  }, [filteredJobs, sortField, sortOrder]);

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

  const handleAddNew = () => {
    const defaultDept = departments[0] || 'Производственный отдел';
    const newJob: JobDirectoryItem = {
      id: `job-${Date.now()}`,
      dept: defaultDept,
      status: 'Рабочий',
      post: 'Новая профессия',
      electricalSafety: '1 группа',
      instructionProgram: '',
      internshipProgram: '',
      factors: '',
      psychiatry: '',
      instructionDoc: 'ИОТ-01',
      sout: `Карта № ${jobDirectory.length + 1}`,
      soutClass: '2',
      opr: `ОПР-${jobDirectory.length + 1}`,
      factorsConfig: [],
      psychiatryPoints: [],
    };
    onUpdateJobDirectory([...jobDirectory, newJob]);
    setEditingJob(newJob);
    setActiveModalSection('general');
  };

  const handleDelete = (id: string, post: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить профессию «${post}» из контингента?`)) {
      onUpdateJobDirectory(jobDirectory.filter((j) => j.id !== id));
      if (editingJob?.id === id) setEditingJob(null);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    // Синхронизируем строковые поля factors и psychiatry с массивами конфигов
    const updated = { ...editingJob };
    if (updated.factorsConfig && updated.factorsConfig.length > 0) {
      updated.factors = updated.factorsConfig.map((f) => f.code).join('; ') + ';';
    }
    if (updated.psychiatryPoints && updated.psychiatryPoints.length > 0) {
      updated.psychiatry = updated.psychiatryPoints.join(', ');
    }

    onUpdateJobDirectory(jobDirectory.map((j) => (j.id === updated.id ? updated : j)));
    setEditingJob(null);
  };

  // Переключение фактора 29н в редактируемой профессии
  const toggleFactor29n = (item: typeof FACTORS_29N_LIST[0]) => {
    if (!editingJob) return;
    const current = editingJob.factorsConfig || [];
    const exists = current.find((c) => c.code === item.code);
    let next: HarmFactorConfig[];
    if (exists) {
      next = current.filter((c) => c.code !== item.code);
    } else {
      next = [
        ...current,
        {
          code: item.code,
          name: item.name,
          periodicity: item.defaultPeriodicity,
        },
      ];
    }
    setEditingJob({
      ...editingJob,
      factorsConfig: next,
      factors: next.map((f) => f.code).join('; ') + (next.length > 0 ? ';' : ''),
    });
  };

  // Изменение периодичности конкретного фактора у профессии
  const changeFactorPeriodicity = (code: string, periodicity: '1 раз в год' | '1 раз в 2 года') => {
    if (!editingJob) return;
    const next = (editingJob.factorsConfig || []).map((f) =>
      f.code === code ? { ...f, periodicity } : f
    );
    setEditingJob({ ...editingJob, factorsConfig: next });
  };

  // Переключение пункта 342н
  const togglePsychiatryPoint = (point: string) => {
    if (!editingJob) return;
    const current = editingJob.psychiatryPoints || [];
    let next: string[];
    if (current.includes(point)) {
      next = current.filter((p) => p !== point);
    } else {
      next = [...current, point].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }
    setEditingJob({
      ...editingJob,
      psychiatryPoints: next,
      psychiatry: next.join(', '),
    });
  };

  return (
    <div className="space-y-6">
      {/* Шапка контингента */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            Контингент работников предприятия
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Нормативная матрица профессий, вредностей и медосмотров
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Централизованный список должностей и профессий по подразделениям. Определяет факторы вредности по приказу 29н (с индивидуальной периодичностью 1 год / 2 года), виды деятельности по приказу 342н, карты СОУТ, классы условий труда (1–4) и программы инструктажей.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          Добавить должность
        </button>
      </div>

      {/* Переключатель 3 подвкладок */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-xs">
        <button
          onClick={() => setSubTab('all')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
            subTab === 'all'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          Все категории ({jobDirectory.length})
        </button>

        <button
          onClick={() => setSubTab('medical')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
            subTab === 'medical'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          Медосмотры (Приказ 29н)
          <span className="ml-1 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">
            {jobDirectory.filter((j) => (j.factors && j.factors.trim().toLowerCase() !== 'нет' && j.factors.trim() !== '') || (j.factorsConfig && j.factorsConfig.length > 0)).length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('psychiatry')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 ${
            subTab === 'psychiatry'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Brain className="w-4 h-4" />
          Психиатрическое освидетельствование (Приказ 342н)
          <span className="ml-1 text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-bold">
            {jobDirectory.filter((j) => (j.psychiatry && j.psychiatry.trim().toLowerCase() !== 'нет' && j.psychiatry.trim() !== '') || (j.psychiatryPoints && j.psychiatryPoints.length > 0)).length}
          </span>
        </button>
      </div>

      {/* Панель фильтрации и поиска */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Фильтр по категории */}
          {(['all', 'ИТР', 'Рабочий', 'Офис'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                filterCategory === cat
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat === 'all' ? 'Все статусы' : cat}
            </button>
          ))}

          {/* Фильтр по подразделению */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 ml-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Все подразделения</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по профессии, подразделению, факторам..."
            className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ТАБЛИЦА: ПОДВКЛАДКА 1 — ВСЕ КАТЕГОРИИ */}
      {subTab === 'all' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th onClick={() => handleHeaderSort('status')} className="py-3 px-3 w-16 cursor-pointer hover:bg-slate-100">
                    Статус {renderSortIcon('status')}
                  </th>
                  <th onClick={() => handleHeaderSort('post')} className="py-3 px-4 cursor-pointer hover:bg-slate-100">
                    Должность / Профессия {renderSortIcon('post')}
                  </th>
                  <th onClick={() => handleHeaderSort('dept')} className="py-3 px-3 cursor-pointer hover:bg-slate-100">
                    Подразделение {renderSortIcon('dept')}
                  </th>
                  <th onClick={() => handleHeaderSort('soutClass')} className="py-3 px-3 cursor-pointer hover:bg-slate-100">
                    Класс СОУТ {renderSortIcon('soutClass')}
                  </th>
                  <th onClick={() => handleHeaderSort('sout')} className="py-3 px-3 cursor-pointer hover:bg-slate-100">
                    Карта СОУТ {renderSortIcon('sout')}
                  </th>
                  <th onClick={() => handleHeaderSort('electricalSafety')} className="py-3 px-3 cursor-pointer hover:bg-slate-100">
                    Электробез. {renderSortIcon('electricalSafety')}
                  </th>
                  <th className="py-3 px-3">Инструктаж на РМ</th>
                  <th className="py-3 px-3">Стажировка</th>
                  <th onClick={() => handleHeaderSort('factors')} className="py-3 px-3 cursor-pointer hover:bg-slate-100">
                    Вредность (29н) {renderSortIcon('factors')}
                  </th>
                  <th onClick={() => handleHeaderSort('psychiatry')} className="py-3 px-3 cursor-pointer hover:bg-slate-100">
                    Психиатрия (342н) {renderSortIcon('psychiatry')}
                  </th>
                  <th className="py-3 px-3 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 select-text">
                {sortedJobs.map((job) => {
                  const hasHarm = job.factors && job.factors.trim().toLowerCase() !== 'нет' && job.factors.trim() !== '';
                  const hasPsych = job.psychiatry && job.psychiatry.trim().toLowerCase() !== 'нет' && job.psychiatry.trim() !== '';
                  const isHarmfulClass = ['3.1', '3.2', '3.3', '3.4', '4'].includes(String(job.soutClass || ''));

                  return (
                    <tr key={job.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                            job.status === 'ИТР'
                              ? 'bg-purple-100 text-purple-800'
                              : job.status === 'Офис'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 font-bold text-slate-900">{job.post}</td>

                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {job.dept || <span className="text-rose-500 font-normal">Не указано</span>}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-sm font-bold text-[11px] ${
                            isHarmfulClass
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {job.soutClass || '2'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{job.sout || '—'}</td>

                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{job.electricalSafety || '1 группа'}</td>

                      <td className="py-2.5 px-3 max-w-[180px] truncate text-slate-600" title={job.instructionProgram}>
                        {job.instructionProgram ? (
                          <span className="text-slate-700">{job.instructionProgram}</span>
                        ) : (
                          <span className="text-slate-400">нет</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 max-w-[160px] truncate" title={job.internshipProgram}>
                        {job.internshipProgram && job.internshipProgram.toLowerCase() !== 'нет' ? (
                          <span className="text-emerald-700 font-medium">{job.internshipProgram}</span>
                        ) : (
                          <span className="text-slate-400">нет</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        {hasHarm ? (
                          <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-sm border border-rose-200">
                            {job.factors}
                          </span>
                        ) : (
                          <span className="text-slate-400">нет</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        {hasPsych ? (
                          <span className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-sm border border-teal-200">
                            п. {job.psychiatry}
                          </span>
                        ) : (
                          <span className="text-slate-400">нет</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingJob(job);
                              setActiveModalSection('general');
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition rounded-md hover:bg-slate-100"
                            title="Редактировать"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(job.id, job.post)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition rounded-md hover:bg-slate-100"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ТАБЛИЦА: ПОДВКЛАДКА 2 — МЕДОСМОТРЫ (29н) */}
      {subTab === 'medical' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-start gap-3">
            <Stethoscope className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Регламент медосмотров по Приказу Минздрава № 29н:</p>
              <p>
                Здесь отображаются должности, для которых установлены вредные производственные факторы (разделы I–V) или виды работ (раздел VI). Для каждого фактора настраивается индивидуальная периодичность: <strong>«1 раз в год»</strong> либо <strong>«1 раз в 2 года»</strong>. При генерации периодических медосмотров факторы с периодичностью 2 года автоматически пропускаются, если работник уже прошел их в прошлом году.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Должность / Профессия</th>
                    <th className="py-3 px-3">Подразделение</th>
                    <th className="py-3 px-3">Класс СОУТ</th>
                    <th className="py-3 px-4">Вредные факторы (29н) и периодичность</th>
                    <th className="py-3 px-4">Виды выполняемых работ (29н)</th>
                    <th className="py-3 px-3 text-center">Настройка факторов</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 select-text">
                  {sortedJobs.map((job) => {
                    // Разделим на факторы и работы
                    const configs = job.factorsConfig || [];
                    const workItems = configs.filter((c) => c.code.toLowerCase().startsWith('п.') || parseInt(c.code, 10) >= 6);
                    const factorItems = configs.filter((c) => !c.code.toLowerCase().startsWith('п.') && (isNaN(parseInt(c.code, 10)) || parseInt(c.code, 10) < 6));

                    return (
                      <tr key={job.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {job.post}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Карта СОУТ: {job.sout || '—'}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600 font-medium">{job.dept || '—'}</td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-sm font-bold text-[11px] ${
                              ['3.1', '3.2', '3.3', '3.4', '4'].includes(String(job.soutClass))
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {job.soutClass || '2'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {factorItems.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {factorItems.map((f) => (
                                <span
                                  key={f.code}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-md text-[11px]"
                                >
                                  <span className="font-bold">{f.code}</span>
                                  <span className="text-[9px] px-1 bg-white border border-rose-200 rounded-sm font-semibold">
                                    {f.periodicity}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : job.factors ? (
                            <span className="font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded-sm border border-rose-200">
                              {job.factors}
                            </span>
                          ) : (
                            <span className="text-slate-400">Нет</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {workItems.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {workItems.map((w) => (
                                <span
                                  key={w.code}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md text-[11px]"
                                >
                                  <span className="font-bold">{w.code}</span>
                                  <span className="text-[9px] px-1 bg-white border border-indigo-200 rounded-sm font-semibold">
                                    {w.periodicity}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Не установлены</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setEditingJob(job);
                              setActiveModalSection('factors29n');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md border border-indigo-200 transition"
                          >
                            Выбрать факторы
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ТАБЛИЦА: ПОДВКЛАДКА 3 — ПСИХИАТРИЧЕСКОЕ ОСВИДЕТЕЛЬСТВОВАНИЕ (342н) */}
      {subTab === 'psychiatry' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl text-xs text-teal-900 flex items-start gap-3">
            <Brain className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Регламент по Приказу Минздрава № 342н (Приложение № 2):</p>
              <p>
                Обязательное психиатрическое освидетельствование (ПСО) проходят работники, осуществляющие отдельные виды деятельности. <strong>Периодичность не требуется</strong>: согласно приказу 342н, освидетельствование проводится только при трудоустройстве (предварительный МО) либо по решению врачебной комиссии при выявлении признаков расстройства.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Должность / Профессия</th>
                    <th className="py-3 px-3">Подразделение</th>
                    <th className="py-3 px-4">Пункты приказа 342н</th>
                    <th className="py-3 px-4">Виды деятельности по приказу</th>
                    <th className="py-3 px-3 text-center">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 select-text">
                  {sortedJobs.map((job) => {
                    const points = job.psychiatryPoints && job.psychiatryPoints.length > 0
                      ? job.psychiatryPoints
                      : job.psychiatry
                      ? job.psychiatry.split(/[,; ]+/).filter(Boolean)
                      : [];

                    return (
                      <tr key={job.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{job.post}</td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{job.dept || '—'}</td>

                        <td className="py-3 px-4">
                          {points.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {points.map((p) => (
                                <span
                                  key={p}
                                  className="px-2 py-0.5 bg-teal-100 text-teal-800 font-mono font-bold rounded-md border border-teal-200 text-[11px]"
                                >
                                  п. {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Нет</span>
                          )}
                        </td>

                        <td className="py-3 px-4 max-w-md">
                          <div className="space-y-1">
                            {points.map((p) => {
                              const found = PSYCHIATRY_342N_LIST.find((item) => item.point === p);
                              return (
                                <div key={p} className="text-[11px] text-slate-700 flex items-start gap-1">
                                  <span className="text-teal-600 font-bold shrink-0">•</span>
                                  <span>{found ? found.shortName : `Пункт ${p}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setEditingJob(job);
                              setActiveModalSection('psych342n');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-md border border-teal-200 transition"
                          >
                            Выбрать пункты
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО: РЕДАКТИРОВАНИЕ ДОЛЖНОСТИ И НАСТРОЙКА ВРЕДНОСТЕЙ */}
      {editingJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Заголовок модалки */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Карточка должности: {editingJob.post}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Подразделение: {editingJob.dept} • Статус: {editingJob.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingJob(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Вкладки внутри модалки */}
            <div className="flex border-b border-slate-200 bg-white px-6">
              <button
                type="button"
                onClick={() => setActiveModalSection('general')}
                className={`py-3 px-4 font-bold text-xs border-b-2 transition ${
                  activeModalSection === 'general'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Основные параметры и СОУТ
              </button>
              <button
                type="button"
                onClick={() => setActiveModalSection('factors29n')}
                className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
                  activeModalSection === 'factors29n'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Факторы вредности (29н)
                <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 rounded-full font-bold">
                  {(editingJob.factorsConfig || []).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalSection('psych342n')}
                className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
                  activeModalSection === 'psych342n'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                Психиатрия (342н)
                <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 rounded-full font-bold">
                  {(editingJob.psychiatryPoints || []).length}
                </span>
              </button>
            </div>

            {/* Тело модалки */}
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* РАЗДЕЛ 1: ОСНОВНЫЕ ПАРАМЕТРЫ */}
              {activeModalSection === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Должность / Профессия *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingJob.post}
                        onChange={(e) => setEditingJob({ ...editingJob, post: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Подразделение компании *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          list="dept-options"
                          value={editingJob.dept}
                          onChange={(e) => setEditingJob({ ...editingJob, dept: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                        />
                        <datalist id="dept-options">
                          {departments.map((d) => (
                            <option key={d} value={d} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Категория персонала
                      </label>
                      <select
                        value={editingJob.status}
                        onChange={(e) =>
                          setEditingJob({
                            ...editingJob,
                            status: e.target.value as EmployeeCategory,
                          })
                        }
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="ИТР">ИТР</option>
                        <option value="Рабочий">Рабочий</option>
                        <option value="Офис">Офис</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Электробезопасность
                      </label>
                      <select
                        value={editingJob.electricalSafety}
                        onChange={(e) =>
                          setEditingJob({ ...editingJob, electricalSafety: e.target.value })
                        }
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="1 группа">1 группа</option>
                        <option value="2 группа">2 группа</option>
                        <option value="3 группа">3 группа</option>
                        <option value="4 группа">4 группа</option>
                        <option value="5 группа">5 группа</option>
                        <option value="нет">нет</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Класс условий труда по СОУТ *
                      </label>
                      <select
                        value={editingJob.soutClass || '2'}
                        onChange={(e) =>
                          setEditingJob({
                            ...editingJob,
                            soutClass: e.target.value as SoutClassType,
                          })
                        }
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                      >
                        <option value="1">1 (Оптимальный)</option>
                        <option value="2">2 (Допустимый)</option>
                        <option value="3.1">3.1 (Вредный 1 степени)</option>
                        <option value="3.2">3.2 (Вредный 2 степени)</option>
                        <option value="3.3">3.3 (Вредный 3 степени)</option>
                        <option value="3.4">3.4 (Вредный 4 степени)</option>
                        <option value="4">4 (Опасный)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Номер карты СОУТ
                      </label>
                      <input
                        type="text"
                        value={editingJob.sout}
                        onChange={(e) => setEditingJob({ ...editingJob, sout: e.target.value })}
                        placeholder="Карта № 12"
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Карта ОПР (оценка проф. рисков)
                      </label>
                      <input
                        type="text"
                        value={editingJob.opr}
                        onChange={(e) => setEditingJob({ ...editingJob, opr: e.target.value })}
                        placeholder="ОПР-08"
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Инструкция по охране труда
                      </label>
                      <input
                        type="text"
                        value={editingJob.instructionDoc}
                        onChange={(e) => setEditingJob({ ...editingJob, instructionDoc: e.target.value })}
                        placeholder="ИОТ-08"
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Программа проведения первичного инструктажа на РМ
                    </label>
                    <textarea
                      rows={2}
                      value={editingJob.instructionProgram}
                      onChange={(e) =>
                        setEditingJob({ ...editingJob, instructionProgram: e.target.value })
                      }
                      placeholder="Оставьте пустым или напишите 'нет', если освобожден"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Программа стажировки на рабочем месте (Стажировочный лист)
                    </label>
                    <textarea
                      rows={2}
                      value={editingJob.internshipProgram}
                      onChange={(e) =>
                        setEditingJob({ ...editingJob, internshipProgram: e.target.value })
                      }
                      placeholder="Оставьте пустым или напишите 'нет', если стажировка не требуется"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* РАЗДЕЛ 2: ФАКТОРЫ 29н С ИНДИВИДУАЛЬНОЙ ПЕРИОДИЧНОСТЬЮ */}
              {activeModalSection === 'factors29n' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-1">
                      Выбранные факторы для «{editingJob.post}»:
                    </p>
                    {(editingJob.factorsConfig || []).length === 0 ? (
                      <p className="text-xs text-slate-400">Факторы не выбраны (МО не требуется)</p>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {editingJob.factorsConfig?.map((f) => (
                          <div
                            key={f.code}
                            className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-xs"
                          >
                            <div className="flex-1">
                              <span className="font-bold text-rose-700 mr-2">{f.code}</span>
                              <span className="text-slate-700">{f.name || f.code}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={f.periodicity}
                                onChange={(e) =>
                                  changeFactorPeriodicity(
                                    f.code,
                                    e.target.value as '1 раз в год' | '1 раз в 2 года'
                                  )
                                }
                                className="text-xs py-1 px-2 border border-slate-300 rounded-md bg-slate-50 font-semibold"
                              >
                                <option value="1 раз в год">1 раз в год</option>
                                <option value="1 раз в 2 года">1 раз в 2 года</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const item = FACTORS_29N_LIST.find((x) => x.code === f.code) || {
                                    code: f.code,
                                    name: f.name || f.code,
                                    section: 'work',
                                    sectionTitle: '',
                                    defaultPeriodicity: f.periodicity,
                                  };
                                  toggleFactor29n(item as any);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-slate-500 mb-2">
                      Каталог факторов и видов работ по Приказу 29н (кликните для выбора):
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                      {FACTORS_29N_LIST.map((item) => {
                        const isSelected = (editingJob.factorsConfig || []).some((c) => c.code === item.code);
                        return (
                          <div
                            key={item.code}
                            onClick={() => toggleFactor29n(item)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-0.5 rounded-sm text-indigo-600 focus:ring-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-bold text-rose-700 text-[11px]">
                                  {item.code}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {item.defaultPeriodicity}
                                </span>
                              </div>
                              <p className="line-clamp-2 text-[11px] leading-tight text-slate-800 mt-0.5">
                                {item.name}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* РАЗДЕЛ 3: ПСИХИАТРИЯ 342н */}
              {activeModalSection === 'psych342n' && (
                <div className="space-y-4">
                  <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 text-xs text-teal-900">
                    <p className="font-bold">Выбранные пункты Приказа 342н для «{editingJob.post}»:</p>
                    <p className="text-[11px] mt-1">
                      {(editingJob.psychiatryPoints || []).length > 0
                        ? `Пункты: ${editingJob.psychiatryPoints?.join(', ')}`
                        : 'Психиатрическое освидетельствование не требуется'}
                    </p>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {PSYCHIATRY_342N_LIST.map((item) => {
                      const isSelected = (editingJob.psychiatryPoints || []).includes(item.point);
                      return (
                        <div
                          key={item.point}
                          onClick={() => togglePsychiatryPoint(item.point)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 ${
                            isSelected
                              ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 rounded-sm text-teal-600 focus:ring-0"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-slate-900 mb-0.5">{item.shortName}</div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{item.name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Кнопки сохранения */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
