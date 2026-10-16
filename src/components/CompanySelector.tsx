import React, { useState, useRef, useEffect } from 'react';
import { CompanyItem } from '../lib/types';
import {
  Building2,
  ChevronDown,
  PlusCircle,
  Edit2,
  Trash2,
  Check,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  Users,
  Layers,
  MapPin,
  Calendar,
} from 'lucide-react';

interface CompanySelectorProps {
  companies: CompanyItem[];
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  onAddNewCompany: () => void;
  onEditCompany?: (company: CompanyItem) => void;
  onDeleteCompany?: (companyId: string) => void;
  onNavigateToSettings?: () => void;
  employeesCount?: number;
  contingentCount?: number;
  soutCount?: number;
  variant?: 'header' | 'page';
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  companies,
  activeCompanyId,
  onSelectCompany,
  onAddNewCompany,
  onEditCompany,
  onDeleteCompany,
  onNavigateToSettings,
  employeesCount = 0,
  contingentCount = 0,
  soutCount = 0,
  variant = 'page',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCompany =
    companies.find((c) => c.id === activeCompanyId) || companies[0] || null;

  // Закрытие при клике снаружи
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredCompanies = companies.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.inn && c.inn.includes(term)) ||
      (c.settings?.directorFIO && c.settings.directorFIO.toLowerCase().includes(term))
    );
  });

  const handleDelete = (e: React.MouseEvent, comp: CompanyItem) => {
    e.stopPropagation();
    if (companies.length <= 1) {
      alert('Нельзя удалить единственную организацию.');
      return;
    }
    if (confirm(`Вы уверены, что хотите удалить организацию «${comp.name}» (ИНН: ${comp.inn})?`)) {
      onDeleteCompany?.(comp.id);
    }
  };

  const handleEdit = (e: React.MouseEvent, comp: CompanyItem) => {
    e.stopPropagation();
    setIsOpen(false);
    onEditCompany?.(comp);
  };

  // Вариант 1: Компактный для верхней шапки (Header)
  if (variant === 'header') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-white transition text-xs font-medium max-w-[280px] sm:max-w-[340px]"
          title="Выбрать текущее юридическое лицо"
        >
          <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="truncate text-left">
            <div className="font-bold truncate text-[12px] leading-tight text-white">
              {activeCompany ? activeCompany.name : 'Выберите организацию'}
            </div>
            {activeCompany && (
              <div className="text-[10px] text-slate-300 truncate">
                ИНН {activeCompany.inn} • {activeCompany.settings?.year || 2026} г.
              </div>
            )}
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto transition-transform ${
              isOpen ? 'rotate-180 text-indigo-400' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800 animate-fade-in text-xs">
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                Организации ({companies.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewCompany();
                }}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Добавить
              </button>
            </div>

            {companies.length > 3 && (
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Поиск организации..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
              {filteredCompanies.map((comp) => {
                const isActive = comp.id === activeCompanyId;
                return (
                  <div
                    key={comp.id}
                    onClick={() => {
                      onSelectCompany(comp.id);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition ${
                      isActive ? 'bg-indigo-50/80 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-slate-900 text-xs font-bold leading-snug">
                          {comp.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ИНН {comp.inn} • ОГРН {comp.ogrn || '—'}
                        </div>
                        {comp.settings?.directorFIO && (
                          <div className="text-[10px] text-slate-600 truncate mt-0.5">
                            Рук: {comp.settings.directorFIO}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && <Check className="w-4 h-4 text-indigo-600" />}
                      <button
                        type="button"
                        onClick={(e) => handleEdit(e, comp)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                        title="Редактировать организацию"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {companies.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, comp)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Удалить организацию"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewCompany();
                }}
                className="w-full py-1.5 px-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-700 rounded-lg font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Добавить новое юрлицо
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Вариант 2: Полноформатный виджет для главной страницы (InstructionsView / Главная)
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mb-6 text-xs" ref={dropdownRef}>
      {/* Верхний акцентный заголовок */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-3.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center text-white shadow-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
              Текущая организация (Юридическое лицо)
            </span>
            <div className="text-base font-extrabold text-white flex items-center gap-2">
              <span>{activeCompany ? activeCompany.name : 'Организация не выбрана'}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                ИНН {activeCompany?.inn || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Кнопки переключения и добавления */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition flex items-center gap-1.5 border border-white/15 text-xs shadow-2xs"
            >
              <span>Сменить юрлицо</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Выпадающий список */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-fade-in text-xs">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">
                    Список юрлиц ({companies.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewCompany();
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + Новое
                  </button>
                </div>

                {companies.length > 2 && (
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Поиск по названию или ИНН..."
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-100">
                  {filteredCompanies.map((comp) => {
                    const isActive = comp.id === activeCompanyId;
                    return (
                      <div
                        key={comp.id}
                        onClick={() => {
                          onSelectCompany(comp.id);
                          setIsOpen(false);
                        }}
                        className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition ${
                          isActive ? 'bg-indigo-50/90 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 pr-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-slate-900 text-xs font-bold leading-tight">
                              {comp.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              ИНН: {comp.inn} • ОГРН: {comp.ogrn || '—'}
                            </div>
                            {comp.settings?.directorFIO && (
                              <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                Руководитель: {comp.settings.directorFIO}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isActive && <Check className="w-4 h-4 text-indigo-600" />}
                          <button
                            type="button"
                            onClick={(e) => handleEdit(e, comp)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded"
                            title="Редактировать"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {companies.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, comp)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewCompany();
                    }}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition text-xs shadow-2xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Добавить новое юрлицо
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onAddNewCompany}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition flex items-center gap-1.5 text-xs shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Новое юрлицо</span>
          </button>
        </div>
      </div>

      {/* Информационная полоса с деталями активного юрлица */}
      {activeCompany && (
        <div className="p-4 bg-slate-50/60 flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-slate-700 w-full lg:w-auto flex-1">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ОГРН</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {activeCompany.ogrn || '—'}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ОКВЭД</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {activeCompany.settings?.okved || '—'}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Руководитель</span>
              <span className="font-semibold text-slate-900 text-xs truncate block" title={activeCompany.settings?.directorFIO}>
                {activeCompany.settings?.directorFIO || '—'}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Для подписи</span>
              <span className="font-semibold text-slate-900 text-xs truncate block" title={activeCompany.settings?.executiveFIO}>
                {activeCompany.settings?.executiveFIO || '—'}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Отчетный год</span>
              <span className="font-mono font-bold text-indigo-700 text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-500" />
                {activeCompany.settings?.year || 2026} год
              </span>
            </div>
          </div>

          {/* Действия с реквизитами */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {onEditCompany && (
              <button
                type="button"
                onClick={() => onEditCompany(activeCompany)}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold transition flex items-center gap-1.5 text-xs shadow-2xs"
                title="Быстрое редактирование реквизитов"
              >
                <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Изменить реквизиты</span>
              </button>
            )}

            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold transition flex items-center gap-1.5 text-xs shadow-2xs"
                title="Перейти во вкладку полных реквизитов"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Все реквизиты</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
