import React, { useState, useMemo } from 'react';
import { EmployeeCategory, JobDirectoryItem } from '../lib/types';
import {
  BookOpen,
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
} from 'lucide-react';

interface JobDirectoryViewProps {
  jobDirectory: JobDirectoryItem[];
  onUpdateJobDirectory: (updated: JobDirectoryItem[]) => void;
}

type SortField = 'post' | 'status' | 'dept' | 'electricalSafety' | 'factors' | 'psychiatry' | 'sout';
type SortOrder = 'asc' | 'desc';

export const JobDirectoryView: React.FC<JobDirectoryViewProps> = ({
  jobDirectory,
  onUpdateJobDirectory,
}) => {
  const [editingJob, setEditingJob] = useState<JobDirectoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | EmployeeCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('post');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const filteredJobs = useMemo(() => {
    return jobDirectory.filter((job) => {
      const matchesCat = filterCategory === 'all' ? true : job.status === filterCategory;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (job.post || '').toLowerCase().includes(term) ||
        (job.dept || '').toLowerCase().includes(term) ||
        (job.instructionProgram || '').toLowerCase().includes(term) ||
        (job.internshipProgram || '').toLowerCase().includes(term) ||
        (job.factors || '').toLowerCase().includes(term) ||
        (job.psychiatry || '').toLowerCase().includes(term);
      return matchesCat && matchesSearch;
    });
  }, [jobDirectory, filterCategory, searchTerm]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      let compareVal = 0;
      if (sortField === 'post') {
        compareVal = (a.post || '').localeCompare(b.post || '');
      } else if (sortField === 'status') {
        compareVal = (a.status || '').localeCompare(b.status || '');
      } else if (sortField === 'dept') {
        compareVal = (a.dept || '').localeCompare(b.dept || '');
      } else if (sortField === 'electricalSafety') {
        compareVal = (a.electricalSafety || '').localeCompare(b.electricalSafety || '');
      } else if (sortField === 'factors') {
        compareVal = (a.factors || '').localeCompare(b.factors || '');
      } else if (sortField === 'psychiatry') {
        compareVal = (a.psychiatry || '').localeCompare(b.psychiatry || '');
      } else if (sortField === 'sout') {
        compareVal = (a.sout || '').localeCompare(b.sout || '');
      }
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
    const newJob: JobDirectoryItem = {
      id: `job-${Date.now()}`,
      dept: 'Производственный отдел',
      status: 'Рабочий',
      post: 'Новая профессия',
      electricalSafety: '1 группа',
      instructionProgram: 'Программа проведения первичного инструктажа по охране труда',
      internshipProgram: 'Программа стажировки на рабочем месте',
      factors: '4.4;',
      psychiatry: 'нет',
      instructionDoc: 'ИОТ-01',
      sout: 'Карта № 1',
      soutClass: '2',
      opr: 'ОПР-01',
    };
    onUpdateJobDirectory([...jobDirectory, newJob]);
    setEditingJob(newJob);
  };

  const handleDelete = (id: string) => {
    if (confirm('Удалить эту должность из справочника ДАННЫЕ?')) {
      onUpdateJobDirectory(jobDirectory.filter((j) => j.id !== id));
      if (editingJob?.id === id) setEditingJob(null);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    onUpdateJobDirectory(
      jobDirectory.map((j) => (j.id === editingJob.id ? editingJob : j))
    );
    setEditingJob(null);
  };

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            Справочник должностей • Лист «ДАННЫЕ»
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Нормативная матрица программ и факторов
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Определяет, какие документы (стажировочный лист, листы ИТР/Рабочие/Офис, МО, ПСО)
            формируются для каждой конкретной профессии. Кликайте по колонкам для сортировки.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Добавить должность
        </button>
      </div>

      {/* Фильтр и поиск */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
              {cat === 'all' ? 'Все категории' : cat} (
              {cat === 'all'
                ? jobDirectory.length
                : jobDirectory.filter((j) => j.status === cat).length}
              )
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по профессии, факторам..."
            className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleHeaderSort('status')}
                  className="py-3 px-3 w-16 cursor-pointer hover:bg-slate-100"
                >
                  Статус {renderSortIcon('status')}
                </th>
                <th
                  onClick={() => handleHeaderSort('post')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Должность / Профессия {renderSortIcon('post')}
                </th>
                <th
                  onClick={() => handleHeaderSort('dept')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 hidden md:table-cell"
                >
                  Подразделение {renderSortIcon('dept')}
                </th>
                <th
                  onClick={() => handleHeaderSort('electricalSafety')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Электробез. {renderSortIcon('electricalSafety')}
                </th>
                <th className="py-3 px-4">Программа инструктажа на РМ</th>
                <th className="py-3 px-4">Стажировка (СЛ)</th>
                <th
                  onClick={() => handleHeaderSort('factors')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Вредность (29н) {renderSortIcon('factors')}
                </th>
                <th
                  onClick={() => handleHeaderSort('psychiatry')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Психиатрия (342н) {renderSortIcon('psychiatry')}
                </th>
                <th className="py-3 px-3 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 select-text">
              {sortedJobs.map((job) => {
                const hasStag =
                  job.internshipProgram && job.internshipProgram.trim().toLowerCase() !== 'нет';
                const hasHarm = job.factors && job.factors.trim().toLowerCase() !== 'нет';
                const hasPsych = job.psychiatry && job.psychiatry.trim().toLowerCase() !== 'нет';

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

                    <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">
                      {job.dept || '—'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {job.electricalSafety || '1 группа'}
                    </td>

                    <td
                      className="py-2.5 px-4 max-w-[220px] truncate text-slate-700"
                      title={job.instructionProgram}
                    >
                      {job.instructionProgram || <span className="text-slate-400">нет</span>}
                    </td>

                    <td className="py-2.5 px-4 max-w-[200px] truncate" title={job.internshipProgram}>
                      {hasStag ? (
                        <span className="text-emerald-700 font-medium">
                          {job.internshipProgram}
                        </span>
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
                          {job.psychiatry}
                        </span>
                      ) : (
                        <span className="text-slate-400">нет</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingJob({ ...job })}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                          title="Редактировать"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
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

      {/* Модальное окно редактирования должности */}
      {editingJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                Редактирование профессии: {editingJob.post}
              </h3>
              <button
                onClick={() => setEditingJob(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Наименование профессии / должности:
                  </label>
                  <input
                    type="text"
                    value={editingJob.post}
                    onChange={(e) => setEditingJob({ ...editingJob, post: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Статус / Категория:</label>
                  <select
                    value={editingJob.status}
                    onChange={(e) =>
                      setEditingJob({
                        ...editingJob,
                        status: e.target.value as EmployeeCategory,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="ИТР">ИТР</option>
                    <option value="Рабочий">Рабочий</option>
                    <option value="Офис">Офис</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Подразделение:</label>
                  <input
                    type="text"
                    value={editingJob.dept}
                    onChange={(e) => setEditingJob({ ...editingJob, dept: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Электробезопасность:</label>
                  <input
                    type="text"
                    value={editingJob.electricalSafety}
                    onChange={(e) =>
                      setEditingJob({ ...editingJob, electricalSafety: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="1 группа, 2 группа, нет"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Программа инструктажа на рабочем месте:
                </label>
                <textarea
                  rows={2}
                  value={editingJob.instructionProgram}
                  onChange={(e) =>
                    setEditingJob({ ...editingJob, instructionProgram: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="Если не проводится, укажите 'нет' или оставьте пустым"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Программа стажировки на рабочем месте (формирует СЛ):
                </label>
                <textarea
                  rows={2}
                  value={editingJob.internshipProgram}
                  onChange={(e) =>
                    setEditingJob({ ...editingJob, internshipProgram: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="При наличии программы автоматически формируется стажировочный лист"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Пункты вредности (Приказ Минздрава 29н):
                  </label>
                  <input
                    type="text"
                    value={editingJob.factors}
                    onChange={(e) => setEditingJob({ ...editingJob, factors: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="например: 4.4; 5.1;"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Психиатрия (Приказ Минздрава 342н):
                  </label>
                  <input
                    type="text"
                    value={editingJob.psychiatry}
                    onChange={(e) => setEditingJob({ ...editingJob, psychiatry: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="например: 11 или нет"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Номер инструкции по ОТ:</label>
                  <input
                    type="text"
                    value={editingJob.instructionDoc}
                    onChange={(e) =>
                      setEditingJob({ ...editingJob, instructionDoc: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="ИОТ-01"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Карта СОУТ:</label>
                  <input
                    type="text"
                    value={editingJob.sout}
                    onChange={(e) => setEditingJob({ ...editingJob, sout: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Карта № 1"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Класс условий труда:</label>
                  <input
                    type="text"
                    value={editingJob.soutClass}
                    onChange={(e) =>
                      setEditingJob({ ...editingJob, soutClass: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="2, 3.1, 3.2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg shadow-xs"
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
