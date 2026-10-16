import React, { useState, useMemo } from 'react';
import { CompanyItem, Employee, JobDirectoryItem, SoutClassType } from '../lib/types';
import { BatchPasteModal } from './BatchPasteModal';
import { parseDateRu } from '../lib/holidays';
import { getEmployeeJobExperienceYears } from '../lib/docxEngine';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  ClipboardPaste,
  Search,
  Check,
  X,
  Building,
  Calendar,
  Hash,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  ShieldAlert,
  Building2,
} from 'lucide-react';

interface EmployeesViewProps {
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  onUpdateEmployees: (updated: Employee[]) => void;
  companies?: CompanyItem[];
  activeCompanyId?: string;
}

type SortField =
  | 'num'
  | 'fio'
  | 'dept'
  | 'post'
  | 'gender'
  | 'soutClass'
  | 'hireDate'
  | 'birthDate'
  | 'boss'
  | 'snils'
  | 'experience';
type SortOrder = 'asc' | 'desc';

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  jobDirectory,
  onUpdateEmployees,
  companies = [],
  activeCompanyId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [companyFilterMode, setCompanyFilterMode] = useState<'current' | 'all'>('all');
  const [isBatchPasteOpen, setIsBatchPasteOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('num');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Синхронизированный список подразделений из сотрудников и контингента
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.dept && e.dept.trim()) set.add(e.dept.trim());
    });
    jobDirectory.forEach((j) => {
      if (j.dept && j.dept.trim()) set.add(j.dept.trim());
    });
    return Array.from(set).sort();
  }, [employees, jobDirectory]);

  // Фильтрация
  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (companyFilterMode === 'current' && activeCompanyId) {
        if (e.companyId) {
          if (e.companyId !== activeCompanyId) return false;
        } else {
          const firstId = companies[0]?.id || 'comp-catania';
          if (activeCompanyId !== firstId) return false;
        }
      }
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (e.fio || '').toLowerCase().includes(term) ||
        (e.post || '').toLowerCase().includes(term) ||
        (e.dept || '').toLowerCase().includes(term) ||
        (e.snils || '').toLowerCase().includes(term);
      const matchesDept = selectedDept === 'all' || e.dept === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [employees, searchTerm, selectedDept, companyFilterMode, activeCompanyId, companies]);

  // Сортировка
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let compareVal = 0;

      if (sortField === 'num') {
        compareVal = (a.num || '').localeCompare(b.num || '', undefined, { numeric: true });
      } else if (sortField === 'fio') {
        compareVal = (a.fio || '').localeCompare(b.fio || '');
      } else if (sortField === 'dept') {
        compareVal = (a.dept || '').localeCompare(b.dept || '');
      } else if (sortField === 'post') {
        compareVal = (a.post || '').localeCompare(b.post || '');
      } else if (sortField === 'gender') {
        compareVal = (a.gender || '').localeCompare(b.gender || '');
      } else if (sortField === 'soutClass') {
        const classA = a.soutClass || jobDirectory.find((j) => j.post === a.post)?.soutClass || '2';
        const classB = b.soutClass || jobDirectory.find((j) => j.post === b.post)?.soutClass || '2';
        compareVal = classA.localeCompare(classB);
      } else if (sortField === 'hireDate') {
        const dA = parseDateRu(a.hireDate);
        const dB = parseDateRu(b.hireDate);
        if (!dA && !dB) compareVal = 0;
        else if (!dA) compareVal = 1;
        else if (!dB) compareVal = -1;
        else compareVal = dA.getTime() - dB.getTime();
      } else if (sortField === 'birthDate') {
        const dA = parseDateRu(a.birthDate);
        const dB = parseDateRu(b.birthDate);
        if (!dA && !dB) compareVal = 0;
        else if (!dA) compareVal = 1;
        else if (!dB) compareVal = -1;
        else compareVal = dA.getTime() - dB.getTime();
      } else if (sortField === 'experience') {
        const expA = getEmployeeJobExperienceYears(a);
        const expB = getEmployeeJobExperienceYears(b);
        compareVal = expA - expB;
      } else if (sortField === 'boss') {
        compareVal = (a.boss || '').localeCompare(b.boss || '');
      } else if (sortField === 'snils') {
        compareVal = (a.snils || '').localeCompare(b.snils || '');
      }

      return sortOrder === 'asc' ? compareVal : -compareVal;
    });
  }, [filtered, sortField, sortOrder, jobDirectory]);

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

  const handleApplyBatch = (newItems: Partial<Employee>[], replaceAll: boolean) => {
    const formatted: Employee[] = newItems.map((item, idx) => ({
      id: `emp-cust-${Date.now()}-${idx}`,
      num: item.num || String(employees.length + idx + 1).padStart(2, '0'),
      fio: item.fio || '',
      dept: item.dept || '',
      post: item.post || '',
      hireDate: item.hireDate || '',
      birthDate: item.birthDate || '',
      boss: item.boss || '',
      needGeneration: item.needGeneration !== false,
      snils: item.snils || '',
      phone: item.phone || '',
      gender: item.gender || 'муж',
      experience: item.experience || '1',
      factors29n: item.factors29n || '',
      periodicity: item.periodicity || '1 раз в год',
      disability: item.disability || 'нет',
      under18: item.under18 || 'нет',
      plannedMedicalDate: item.plannedMedicalDate || '',
      actualMedicalDate: item.actualMedicalDate || '',
      pso342n: item.pso342n || 'нет',
      soutClass: item.soutClass || '2',
    }));

    if (replaceAll) {
      onUpdateEmployees(formatted);
    } else {
      onUpdateEmployees([...employees, ...formatted]);
    }
  };

  const handleAddNew = () => {
    const nextNum = String(employees.length + 1).padStart(2, '0');
    const defaultDept = departments[0] || 'Производственный отдел';
    const defaultJob = jobDirectory[0];

    const newEmp: Employee = {
      id: `emp-new-${Date.now()}`,
      num: nextNum,
      fio: 'Иванов Иван Иванович',
      dept: defaultDept,
      post: defaultJob ? defaultJob.post : 'Техник',
      hireDate: '01.09.2025',
      birthDate: '01.01.1990',
      boss: 'Руководитель подразделения',
      needGeneration: true,
      snils: '',
      phone: '',
      gender: 'м',
      experience: '1',
      factors29n: defaultJob ? defaultJob.factors : '',
      periodicity: '1 раз в год',
      disability: 'нет',
      under18: 'нет',
      plannedMedicalDate: '',
      actualMedicalDate: '',
      pso342n: defaultJob ? defaultJob.psychiatry : 'нет',
      soutClass: defaultJob ? defaultJob.soutClass : '2',
      companyId: activeCompanyId,
    };
    onUpdateEmployees([...employees, newEmp]);
    setEditingEmployee(newEmp);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Вы действительно хотите удалить данного сотрудника?')) {
      onUpdateEmployees(employees.filter((e) => e.id !== id));
      if (editingEmployee?.id === id) setEditingEmployee(null);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    onUpdateEmployees(
      employees.map((emp) => (emp.id === editingEmployee.id ? editingEmployee : emp))
    );
    setEditingEmployee(null);
  };

  return (
    <div className="space-y-6">
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            База сотрудников предприятия • Список работников
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Управление персоналом и штатной расстановкой
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Всего сотрудников: {employees.length}. Учет персональных данных, пола, даты приема, класса СОУТ и руководителя. График и даты медосмотров централизованно ведутся во вкладке «График медосмотров».
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsBatchPasteOpen(true)}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <ClipboardPaste className="w-4 h-4" />
            Вставка массивом (Ctrl+V)
          </button>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Добавить сотрудника
          </button>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по ФИО, должности, СНИЛС или подразделению..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              >
                Текущее юрлицо ({employees.filter((e) => (e.companyId ? e.companyId === activeCompanyId : activeCompanyId === companies[0]?.id)).length})
              </button>
              <button
                type="button"
                onClick={() => setCompanyFilterMode('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  companyFilterMode === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Все ({employees.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleHeaderSort('num')}
                  className="py-3 px-3 w-12 text-center cursor-pointer hover:bg-slate-100"
                >
                  № {renderSortIcon('num')}
                </th>
                <th
                  onClick={() => handleHeaderSort('fio')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Ф.И.О. сотрудника {renderSortIcon('fio')}
                </th>
                <th
                  onClick={() => handleHeaderSort('gender')}
                  className="py-3 px-2 text-center cursor-pointer hover:bg-slate-100 w-12"
                >
                  Пол {renderSortIcon('gender')}
                </th>
                <th
                  onClick={() => handleHeaderSort('dept')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Подразделение {renderSortIcon('dept')}
                </th>
                <th
                  onClick={() => handleHeaderSort('post')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Должность {renderSortIcon('post')}
                </th>
                <th
                  onClick={() => handleHeaderSort('soutClass')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-center"
                >
                  Класс СОУТ {renderSortIcon('soutClass')}
                </th>
                <th
                  onClick={() => handleHeaderSort('hireDate')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Дата приёма {renderSortIcon('hireDate')}
                </th>
                <th
                  onClick={() => handleHeaderSort('experience')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-center"
                >
                  Стаж {renderSortIcon('experience')}
                </th>
                <th
                  onClick={() => handleHeaderSort('birthDate')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Дата рожд. {renderSortIcon('birthDate')}
                </th>
                <th
                  onClick={() => handleHeaderSort('snils')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  СНИЛС {renderSortIcon('snils')}
                </th>
                <th className="py-3 px-3 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 select-text">
              {sorted.map((emp) => {
                const jobMatch = jobDirectory.find(
                  (j) => j.post && j.post.trim().toLowerCase() === (emp.post || '').trim().toLowerCase()
                );
                const effectiveClass = emp.soutClass || jobMatch?.soutClass || '2';
                const isHarmful = ['3.1', '3.2', '3.3', '3.4', '4'].includes(String(effectiveClass));
                const years = getEmployeeJobExperienceYears(emp);

                const isFemale = emp.gender === 'ж' || emp.gender === 'жен';

                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                      {emp.num}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{emp.fio}</td>

                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                          isFemale
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isFemale ? 'ж' : 'м'}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-slate-600 font-medium">{emp.dept}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{emp.post}</td>

                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm font-bold text-[11px] ${
                          isHarmful
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                        title={isHarmful ? 'Вредные условия труда' : 'Допустимые условия труда'}
                      >
                        {effectiveClass}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{emp.hireDate}</td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-medium text-slate-700">
                      {years} {years === 1 ? 'год' : years >= 2 && years <= 4 ? 'года' : 'лет'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{emp.birthDate}</td>

                    <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {emp.snils || '—'}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingEmployee({ ...emp })}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                          title="Редактировать"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
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

      {/* Модальное окно редактирования сотрудника */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                Карточка сотрудника: {editingEmployee.fio}
              </h3>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {companies.length > 1 && (
                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                  <label className="block font-bold text-indigo-950 mb-1">
                    Организация (Юридическое лицо):
                  </label>
                  <select
                    value={editingEmployee.companyId || activeCompanyId || ''}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, companyId: e.target.value })
                    }
                    className="w-full p-2 border border-indigo-200 rounded-lg text-xs bg-white font-semibold"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (ИНН: {c.inn})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">№ в списке:</label>
                  <input
                    type="text"
                    value={editingEmployee.num}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, num: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">Ф.И.О. сотрудника:</label>
                  <input
                    type="text"
                    value={editingEmployee.fio}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, fio: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Пол:</label>
                  <select
                    value={editingEmployee.gender === 'жен' || editingEmployee.gender === 'ж' ? 'ж' : 'м'}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, gender: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="м">Мужской (м)</option>
                    <option value="ж">Женский (ж)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Подразделение:</label>
                  <input
                    type="text"
                    list="emp-dept-list"
                    value={editingEmployee.dept}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, dept: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <datalist id="emp-dept-list">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Должность:</label>
                  <input
                    type="text"
                    list="emp-job-list"
                    value={editingEmployee.post}
                    onChange={(e) => {
                      const newPost = e.target.value;
                      const matched = jobDirectory.find(
                        (j) => j.post.trim().toLowerCase() === newPost.trim().toLowerCase()
                      );
                      setEditingEmployee({
                        ...editingEmployee,
                        post: newPost,
                        dept: matched?.dept || editingEmployee.dept,
                        soutClass: matched?.soutClass || editingEmployee.soutClass || '2',
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                  <datalist id="emp-job-list">
                    {jobDirectory.map((j) => (
                      <option key={j.id} value={j.post} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Дата приёма:</label>
                  <input
                    type="text"
                    placeholder="ДД.ММ.ГГГГ"
                    value={editingEmployee.hireDate}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, hireDate: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Дата рождения:</label>
                  <input
                    type="text"
                    placeholder="ДД.ММ.ГГГГ"
                    value={editingEmployee.birthDate}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, birthDate: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">СНИЛС:</label>
                  <input
                    type="text"
                    value={editingEmployee.snils}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, snils: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Индивидуальный класс условий труда (СОУТ):
                  </label>
                  <select
                    value={editingEmployee.soutClass || '2'}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        soutClass: e.target.value as SoutClassType,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="1">Класс 1 (Оптимальный)</option>
                    <option value="2">Класс 2 (Допустимый)</option>
                    <option value="3.1">Класс 3.1 (Вредный 1 ст.)</option>
                    <option value="3.2">Класс 3.2 (Вредный 2 ст.)</option>
                    <option value="3.3">Класс 3.3 (Вредный 3 ст.)</option>
                    <option value="3.4">Класс 3.4 (Вредный 4 ст.)</option>
                    <option value="4">Класс 4 (Опасный)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    По умолчанию класс берётся из карты СОУТ должности, но может быть переопределен индивидуально.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Стаж в должности (полных лет):
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.experience || '1'}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, experience: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Рассчитан от даты приема ({editingEmployee.hireDate}):{' '}
                    <strong>{getEmployeeJobExperienceYears(editingEmployee)} г.</strong>
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Непосредственный руководитель:</label>
                <input
                  type="text"
                  value={editingEmployee.boss}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, boss: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно пакетной вставки */}
      <BatchPasteModal
        isOpen={isBatchPasteOpen}
        onClose={() => setIsBatchPasteOpen(false)}
        onApply={handleApplyBatch}
      />
    </div>
  );
};
