import React, { useState, useMemo } from 'react';
import { SoutClassType, SoutWorkplace } from '../lib/types';
import { parseDateRu, formatDateRu } from '../lib/holidays';
import {
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Building,
  Users,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileCheck,
  Download,
  Info,
  X,
  Check,
} from 'lucide-react';

interface SoutViewProps {
  workplaces: SoutWorkplace[];
  onUpdateWorkplaces: (updated: SoutWorkplace[]) => void;
  departments: string[];
  activeCompanyId: string;
}

type SortField = 'workplaceNumber' | 'dept' | 'post' | 'soutClass' | 'approvalDate' | 'expiryDate' | 'isDeclared';
type SortOrder = 'asc' | 'desc';

export const SoutView: React.FC<SoutViewProps> = ({
  workplaces,
  onUpdateWorkplaces,
  departments,
  activeCompanyId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterDeclared, setFilterDeclared] = useState<'all' | 'declared' | 'non-declared'>('all');
  const [selectedDept, setSelectedDept] = useState('all');

  const [editingItem, setEditingItem] = useState<SoutWorkplace | null>(null);

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('workplaceNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Расчет срока действия СОУТ (5 лет со дня утверждения по ст. 8 426-ФЗ)
  const stats = useMemo(() => {
    let totalEmployees = 0;
    let declaredCount = 0;
    let harmfulCount = 0;
    let expiredSoonCount = 0;

    const now = new Date();
    const sixMonthsLater = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    workplaces.forEach((w) => {
      totalEmployees += w.employeesCount || 1;
      if (w.isDeclared) declaredCount++;
      if (['3.1', '3.2', '3.3', '3.4', '4'].includes(String(w.soutClass))) harmfulCount++;

      const expDate = parseDateRu(w.expiryDate);
      if (expDate && expDate <= sixMonthsLater) {
        expiredSoonCount++;
      }
    });

    return {
      totalWorkplaces: workplaces.length,
      totalEmployees,
      declaredCount,
      harmfulCount,
      optimalOrAcceptableCount: workplaces.length - harmfulCount,
      expiredSoonCount,
    };
  }, [workplaces]);

  const filteredWorkplaces = useMemo(() => {
    return workplaces.filter((w) => {
      // Модель изоляции A: показываем только карты СОУТ активной компании
      if ((w.companyId || '') !== activeCompanyId) return false;

      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (w.post || '').toLowerCase().includes(term) ||
        (w.dept || '').toLowerCase().includes(term) ||
        (w.workplaceNumber || '').toLowerCase().includes(term) ||
        (w.cardDocNumber || '').toLowerCase().includes(term) ||
        (w.identifiedHarmFactors || '').toLowerCase().includes(term);

      const matchesDept = selectedDept === 'all' || w.dept === selectedDept;
      const matchesClass = filterClass === 'all' || String(w.soutClass) === filterClass;
      const matchesDeclared =
        filterDeclared === 'all'
          ? true
          : filterDeclared === 'declared'
          ? w.isDeclared
          : !w.isDeclared;

      return matchesSearch && matchesDept && matchesClass && matchesDeclared;
    });
  }, [workplaces, searchTerm, selectedDept, filterClass, filterDeclared, activeCompanyId]);

  const sortedWorkplaces = useMemo(() => {
    return [...filteredWorkplaces].sort((a, b) => {
      let compareVal = 0;
      if (sortField === 'workplaceNumber') {
        compareVal = (a.workplaceNumber || '').localeCompare(b.workplaceNumber || '', undefined, {
          numeric: true,
        });
      } else if (sortField === 'dept') {
        compareVal = (a.dept || '').localeCompare(b.dept || '');
      } else if (sortField === 'post') {
        compareVal = (a.post || '').localeCompare(b.post || '');
      } else if (sortField === 'soutClass') {
        compareVal = (a.soutClass || '').localeCompare(b.soutClass || '');
      } else if (sortField === 'approvalDate') {
        const dA = parseDateRu(a.approvalDate);
        const dB = parseDateRu(b.approvalDate);
        compareVal = (dA?.getTime() || 0) - (dB?.getTime() || 0);
      } else if (sortField === 'expiryDate') {
        const dA = parseDateRu(a.expiryDate);
        const dB = parseDateRu(b.expiryDate);
        compareVal = (dA?.getTime() || 0) - (dB?.getTime() || 0);
      } else if (sortField === 'isDeclared') {
        compareVal = (a.isDeclared ? 1 : 0) - (b.isDeclared ? 1 : 0);
      }
      return sortOrder === 'asc' ? compareVal : -compareVal;
    });
  }, [filteredWorkplaces, sortField, sortOrder]);

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
    const nextNum = String(workplaces.length + 1);
    const newItem: SoutWorkplace = {
      id: `sout-${Date.now()}`,
      workplaceNumber: nextNum,
      dept: departments[0] || 'Производственный отдел',
      post: 'Новая должность',
      employeesCount: 1,
      soutClass: '2',
      cardDocNumber: `Карта № ${nextNum}`,
      approvalDate: formatDateRu(new Date()),
      expiryDate: formatDateRu(new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)),
      isDeclared: true,
      declarationNumber: '',
      declarationDate: '',
      identifiedHarmFactors: 'Не идентифицированы (допустимые условия)',
      guaranteesAndCompensations: 'Не положены',
    };
    onUpdateWorkplaces([...workplaces, newItem]);
    setEditingItem(newItem);
  };

  const handleDelete = (id: string, post: string) => {
    if (window.confirm(`Удалить карту СОУТ для рабочего места «${post}»?`)) {
      onUpdateWorkplaces(workplaces.filter((w) => w.id !== id));
      if (editingItem?.id === id) setEditingItem(null);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    // Автоматический пересчет срока 5 лет при изменении даты утверждения
    const updated = { ...editingItem };
    const parsedAppDate = parseDateRu(updated.approvalDate);
    if (parsedAppDate && !updated.expiryDate) {
      const expDate = new Date(parsedAppDate);
      expDate.setFullYear(expDate.getFullYear() + 5);
      updated.expiryDate = formatDateRu(expDate);
    }

    onUpdateWorkplaces(workplaces.map((w) => (w.id === updated.id ? updated : w)));
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Шапка СОУТ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            Специальная оценка условий труда (426-ФЗ)
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Реестр карт СОУТ, декларированных мест и периодичности
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Учет периодичности проведения СОУТ (1 раз в 5 лет), задекларированных рабочих мест с оптимальными и допустимыми условиями труда (ст. 11 426-ФЗ), классов вредности (1–4) и установленных гарантий.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          Добавить рабочее место СОУТ
        </button>
      </div>

      {/* Метрики СОУТ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Всего рабочих мест</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalWorkplaces}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Охват работников: {stats.totalEmployees} чел.</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold">Задекларировано в ГИТ</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.declaredCount}</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Бессрочная декларация (кл. 1 и 2)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold">Вредные условия (3.1–4)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{stats.harmfulCount}</div>
          <p className="text-[11px] text-rose-700 mt-0.5">Подлежат медосмотрам и льготам</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold">Периодичность СОУТ</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">5 лет</div>
          <p className="text-[11px] text-amber-700 mt-0.5">
            {stats.expiredSoonCount > 0 ? `Истекает у ${stats.expiredSoonCount} РМ` : 'Все карты действуют'}
          </p>
        </div>
      </div>

      {/* Панель фильтров */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Подразделения */}
          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-medium"
            >
              <option value="all">Все подразделения</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Класс условий труда */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 font-medium"
          >
            <option value="all">Все классы УТ</option>
            <option value="1">Класс 1 (Оптимальный)</option>
            <option value="2">Класс 2 (Допустимый)</option>
            <option value="3.1">Класс 3.1 (Вредный 1 ст.)</option>
            <option value="3.2">Класс 3.2 (Вредный 2 ст.)</option>
            <option value="3.3">Класс 3.3 (Вредный 3 ст.)</option>
            <option value="3.4">Класс 3.4 (Вредный 4 ст.)</option>
            <option value="4">Класс 4 (Опасный)</option>
          </select>

          {/* Статус декларации */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setFilterDeclared('all')}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                filterDeclared === 'all' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilterDeclared('declared')}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                filterDeclared === 'declared' ? 'bg-white shadow-xs text-emerald-800 font-bold' : 'text-slate-600'
              }`}
            >
              Задекларированные
            </button>
            <button
              onClick={() => setFilterDeclared('non-declared')}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                filterDeclared === 'non-declared' ? 'bg-white shadow-xs text-rose-800 font-bold' : 'text-slate-600'
              }`}
            >
              Без декларации (вредные)
            </button>
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по карте, должности, вредностям..."
            className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Таблица рабочих мест СОУТ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => handleHeaderSort('workplaceNumber')}
                  className="py-3 px-3 w-16 cursor-pointer hover:bg-slate-100"
                >
                  № РМ {renderSortIcon('workplaceNumber')}
                </th>
                <th
                  onClick={() => handleHeaderSort('post')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Наименование должности / профессии {renderSortIcon('post')}
                </th>
                <th
                  onClick={() => handleHeaderSort('dept')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Подразделение {renderSortIcon('dept')}
                </th>
                <th
                  onClick={() => handleHeaderSort('soutClass')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Класс условий труда {renderSortIcon('soutClass')}
                </th>
                <th
                  onClick={() => handleHeaderSort('isDeclared')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Декларация соответствия {renderSortIcon('isDeclared')}
                </th>
                <th className="py-3 px-4">Идентифицированные вредные факторы</th>
                <th
                  onClick={() => handleHeaderSort('approvalDate')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Дата утверждения {renderSortIcon('approvalDate')}
                </th>
                <th
                  onClick={() => handleHeaderSort('expiryDate')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                >
                  Срок действия (5 лет) {renderSortIcon('expiryDate')}
                </th>
                <th className="py-3 px-3 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 select-text">
              {sortedWorkplaces.map((w) => {
                const isHarmful = ['3.1', '3.2', '3.3', '3.4', '4'].includes(String(w.soutClass));

                return (
                  <tr key={w.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                      {w.workplaceNumber}
                    </td>

                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {w.post}
                      <div className="text-[10px] text-slate-400 font-normal">
                        {w.cardDocNumber} • Работников: {w.employeesCount} чел.
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 font-medium">{w.dept}</td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-xs ${
                          isHarmful
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {w.soutClass}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      {w.isDeclared ? (
                        <div className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-[11px]">Задекларировано</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <span>Не подлежит (вредный класс)</span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-4 max-w-xs truncate text-slate-700" title={w.identifiedHarmFactors}>
                      {w.identifiedHarmFactors || '—'}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                      {w.approvalDate || '—'}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                      {w.isDeclared ? (
                        <span className="text-emerald-700 font-semibold">Бессрочно*</span>
                      ) : (
                        w.expiryDate || '—'
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingItem(w)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition rounded-md hover:bg-slate-100"
                          title="Редактировать карту СОУТ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(w.id, w.post)}
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

      {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ КАРТЫ СОУТ */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Карта СОУТ: {editingItem.cardDocNumber || editingItem.post}
                  </h3>
                  <p className="text-xs text-slate-500">
                    РМ № {editingItem.workplaceNumber} • {editingItem.dept}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Номер рабочего места *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.workplaceNumber}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, workplaceNumber: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Номер карты СОУТ
                  </label>
                  <input
                    type="text"
                    value={editingItem.cardDocNumber}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, cardDocNumber: e.target.value })
                    }
                    placeholder="Карта № 12"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Должность / Профессия *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.post}
                    onChange={(e) => setEditingItem({ ...editingItem, post: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Подразделение *
                  </label>
                  <input
                    type="text"
                    required
                    list="sout-depts"
                    value={editingItem.dept}
                    onChange={(e) => setEditingItem({ ...editingItem, dept: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="sout-depts">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Итоговый класс условий труда *
                  </label>
                  <select
                    value={editingItem.soutClass}
                    onChange={(e) => {
                      const newClass = e.target.value as SoutClassType;
                      const isDeclaredDefault = ['1', '2'].includes(newClass);
                      setEditingItem({
                        ...editingItem,
                        soutClass: newClass,
                        isDeclared: isDeclaredDefault,
                      });
                    }}
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
                    Количество работников на РМ
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.employeesCount}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        employeesCount: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Дата утверждения отчета СОУТ (ДД.ММ.ГГГГ)
                  </label>
                  <input
                    type="text"
                    value={editingItem.approvalDate}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, approvalDate: e.target.value })
                    }
                    placeholder="15.11.2023"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Срок действия СОУТ (5 лет)
                  </label>
                  <input
                    type="text"
                    value={editingItem.expiryDate}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, expiryDate: e.target.value })
                    }
                    placeholder="15.11.2028"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Декларирование */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.isDeclared}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, isDeclared: e.target.checked })
                    }
                    className="rounded-sm text-indigo-600 focus:ring-0"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Задекларированное рабочее место (ст. 11 426-ФЗ)
                  </span>
                </label>
                {editingItem.isDeclared && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Номер декларации в ГИТ
                      </label>
                      <input
                        type="text"
                        value={editingItem.declarationNumber || ''}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, declarationNumber: e.target.value })
                        }
                        placeholder="Д-24-1184/2023"
                        className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Дата подачи декларации
                      </label>
                      <input
                        type="text"
                        value={editingItem.declarationDate || ''}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, declarationDate: e.target.value })
                        }
                        placeholder="01.12.2023"
                        className="w-full text-xs p-2 rounded-md border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Идентифицированные вредные производственные факторы
                </label>
                <textarea
                  rows={2}
                  value={editingItem.identifiedHarmFactors}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, identifiedHarmFactors: e.target.value })
                  }
                  placeholder="Шум (4.4), тяжесть трудового процесса (5.1) и др."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Гарантии и компенсации за работу во вредных условиях
                </label>
                <input
                  type="text"
                  value={editingItem.guaranteesAndCompensations}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      guaranteesAndCompensations: e.target.value,
                    })
                  }
                  placeholder="Повышенная оплата труда не менее 4% (ст. 147 ТК РФ), доп. отпуск 7 дней"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  Сохранить карту СОУТ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
