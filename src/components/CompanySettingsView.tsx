import React, { useState, useEffect } from 'react';
import { CompanyItem, CompanySettings } from '../lib/types';
import { DEFAULT_COMPANY_SETTINGS } from '../lib/defaultData';
import {
  Building2,
  Save,
  RotateCcw,
  Check,
  PlusCircle,
  Trash2,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface CompanySettingsViewProps {
  companySettings: CompanySettings;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  companies?: CompanyItem[];
  activeCompanyId?: string;
  onSelectCompany?: (companyId: string) => void;
  onAddNewCompany?: () => void;
  onDeleteCompany?: (companyId: string) => void;
}

export const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({
  companySettings,
  onUpdateCompanySettings,
  companies = [],
  activeCompanyId,
  onSelectCompany,
  onAddNewCompany,
  onDeleteCompany,
}) => {
  const [form, setForm] = useState<CompanySettings>({ ...companySettings });
  const [savedNotice, setSavedNotice] = useState(false);

  // Синхронизация формы при смене активного юрлица
  useEffect(() => {
    setForm({ ...companySettings });
  }, [companySettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCompanySettings(form);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Сбросить реквизиты к значениям по умолчанию (ООО «Катания»)?')) {
      setForm({ ...DEFAULT_COMPANY_SETTINGS });
      onUpdateCompanySettings({ ...DEFAULT_COMPANY_SETTINGS });
    }
  };

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            Реквизиты работодателя
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Настройки организаций и подписи
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Данные выбранного юридического лица автоматически подставляются во все генерируемые документы:
            направления на медосмотр (МО), направления на психиатрию (ПСО), журналы инструктажей и стажировочные листы.
          </p>
        </div>

        {savedNotice && (
          <div className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
            <Check className="w-4 h-4" /> Реквизиты сохранены
          </div>
        )}
      </div>

      {/* Список организаций (вкладки / карточки) */}
      {companies.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-4 h-4 text-indigo-600" />
              Юридические лица ({companies.length})
            </span>
            {onAddNewCompany && (
              <button
                type="button"
                onClick={onAddNewCompany}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Добавить новое юрлицо</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {companies.map((comp) => {
              const isActive = comp.id === activeCompanyId;
              return (
                <div
                  key={comp.id}
                  onClick={() => onSelectCompany?.(comp.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-indigo-50/90 border-indigo-400 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {comp.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ИНН: {comp.inn || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isActive ? (
                      <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded uppercase">
                        Активно
                      </span>
                    ) : (
                      companies.length > 1 &&
                      onDeleteCompany && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `Удалить юридическое лицо «${comp.name}» (ИНН: ${comp.inn})?`
                              )
                            ) {
                              onDeleteCompany(comp.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Удалить организацию"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Форма реквизитов */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm text-slate-900">
            Реквизиты активного юридического лица: {form.companyName || 'Новая организация'}
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            ИНН {form.inn || '—'} • ОГРН {form.ogrn || '—'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Полное / сокращенное наименование организации:
            </label>
            <input
              type="text"
              required
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              placeholder="ООО «Катания»"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Должность уполномоченного руководителя (для подписи):
            </label>
            <input
              type="text"
              value={form.executivePost}
              onChange={(e) => setForm({ ...form, executivePost: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg"
              placeholder="Исполнительный директор"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ф.И.О. уполномоченного руководителя:
            </label>
            <input
              type="text"
              value={form.executiveFIO}
              onChange={(e) => setForm({ ...form, executiveFIO: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
              placeholder="Кириллов П.М."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Должность генерального директора / руководителя:
            </label>
            <input
              type="text"
              value={form.directorPost}
              onChange={(e) => setForm({ ...form, directorPost: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg"
              placeholder="Директор"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ф.И.О. генерального директора / руководителя:
            </label>
            <input
              type="text"
              value={form.directorFIO}
              onChange={(e) => setForm({ ...form, directorFIO: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
              placeholder="Девляшова И.В."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ОГРН:</label>
            <input
              type="text"
              value={form.ogrn}
              onChange={(e) => setForm({ ...form, ogrn: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              placeholder="1242400002130"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ИНН:</label>
            <input
              type="text"
              value={form.inn}
              onChange={(e) => setForm({ ...form, inn: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              placeholder="2465359318"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ОКВЭД:</label>
            <input
              type="text"
              value={form.okved}
              onChange={(e) => setForm({ ...form, okved: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              placeholder="62.09"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Рабочий отчётный год:
            </label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value, 10) || 2026 })}
              className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              placeholder="2026"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Юридический адрес организации:
            </label>
            <input
              type="text"
              value={form.legalAddress}
              onChange={(e) => setForm({ ...form, legalAddress: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg"
              placeholder="660119, г. Красноярск, ул. 40 лет победы дом 2 помещение 633 ком 25"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Фактический адрес организации:
            </label>
            <input
              type="text"
              value={form.actualAddress}
              onChange={(e) => setForm({ ...form, actualAddress: e.target.value })}
              className="w-full p-2.5 border border-slate-300 rounded-lg"
              placeholder="660004, г. Красноярск, ул. 40 лет победы дом 2 помещение 633 ком 25"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-slate-500 hover:text-slate-800 rounded-lg font-semibold transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Сбросить к значениям по умолчанию
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition flex items-center gap-2 shadow-xs"
          >
            <Save className="w-4 h-4" /> Сохранить изменения
          </button>
        </div>
      </form>
    </div>
  );
};
