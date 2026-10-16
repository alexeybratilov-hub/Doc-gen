import React, { useState, useEffect } from 'react';
import { CompanyItem, CompanySettings, ExamType } from '../lib/types';
import { Building2, Save, X, ShieldCheck } from 'lucide-react';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (company: CompanyItem, copyContingent: boolean) => void;
  companyToEdit?: CompanyItem | null;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  companyToEdit,
}) => {
  const isEditing = Boolean(companyToEdit);

  const [name, setName] = useState('');
  const [inn, setInn] = useState('');
  const [ogrn, setOgrn] = useState('');
  const [okved, setOkved] = useState('');
  const [directorPost, setDirectorPost] = useState('Директор');
  const [directorFIO, setDirectorFIO] = useState('');
  const [executivePost, setExecutivePost] = useState('Исполнительный директор');
  const [executiveFIO, setExecutiveFIO] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [actualAddress, setActualAddress] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [orderNumber, setOrderNumber] = useState('1');
  const [examType, setExamType] = useState<ExamType>('периодический');
  const [copyContingent, setCopyContingent] = useState(true);

  useEffect(() => {
    if (companyToEdit) {
      setName(companyToEdit.name || '');
      setInn(companyToEdit.inn || '');
      setOgrn(companyToEdit.ogrn || '');
      setOkved(companyToEdit.settings?.okved || '');
      setDirectorPost(companyToEdit.settings?.directorPost || 'Директор');
      setDirectorFIO(companyToEdit.settings?.directorFIO || '');
      setExecutivePost(companyToEdit.settings?.executivePost || 'Исполнительный директор');
      setExecutiveFIO(companyToEdit.settings?.executiveFIO || '');
      setLegalAddress(companyToEdit.settings?.legalAddress || '');
      setActualAddress(companyToEdit.settings?.actualAddress || '');
      setYear(companyToEdit.settings?.year || new Date().getFullYear());
      setOrderNumber(companyToEdit.settings?.orderNumber || '1');
      setExamType(companyToEdit.settings?.examType || 'периодический');
      setCopyContingent(false);
    } else {
      setName('');
      setInn('');
      setOgrn('');
      setOkved('62.09');
      setDirectorPost('Директор');
      setDirectorFIO('');
      setExecutivePost('Исполнительный директор');
      setExecutiveFIO('');
      setLegalAddress('');
      setActualAddress('');
      setYear(new Date().getFullYear());
      setOrderNumber('1');
      setExamType('периодический');
      setCopyContingent(true);
    }
  }, [companyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Пожалуйста, укажите наименование организации.');
      return;
    }

    const settings: CompanySettings = {
      companyName: name.trim(),
      inn: inn.trim(),
      ogrn: ogrn.trim(),
      okved: okved.trim(),
      directorPost: directorPost.trim(),
      directorFIO: directorFIO.trim(),
      executivePost: executivePost.trim(),
      executiveFIO: executiveFIO.trim(),
      legalAddress: legalAddress.trim(),
      actualAddress: (actualAddress || legalAddress).trim(),
      year: Number(year) || new Date().getFullYear(),
      orderNumber: orderNumber.trim() || '1',
      lastMedicalDate: companyToEdit?.settings?.lastMedicalDate || '24.08.2025',
      profpathologyCenterDate: companyToEdit?.settings?.profpathologyCenterDate || '24.08.2025',
      examType: examType || 'периодический',
    };

    const companyItem: CompanyItem = {
      id: companyToEdit?.id || `comp-${Date.now()}`,
      name: name.trim(),
      inn: inn.trim(),
      ogrn: ogrn.trim(),
      settings,
      createdAt: companyToEdit?.createdAt || new Date().toISOString().slice(0, 10),
    };

    onSave(companyItem, !isEditing && copyContingent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8 animate-fade-in text-slate-800">
        {/* Шапка модального окна */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                {isEditing ? 'Редактирование юридического лица' : 'Добавление нового юридического лица'}
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                {isEditing
                  ? 'Изменение реквизитов организации'
                  : 'Создание новой карточки организации с сохранением в локальной базе'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-3 text-indigo-950">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              Реквизиты юридического лица будут автоматически подставляться в генерируемые направления
              на медосмотр (29н), психиатрическое освидетельствование (342н), журналы и приказы.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Полное / сокращенное наименование организации: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ООО «Название Компании»"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ИНН: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={inn}
                onChange={(e) => setInn(e.target.value)}
                placeholder="2465359318"
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ОГРН:</label>
              <input
                type="text"
                value={ogrn}
                onChange={(e) => setOgrn(e.target.value)}
                placeholder="1242400002130"
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ОКВЭД:</label>
              <input
                type="text"
                value={okved}
                onChange={(e) => setOkved(e.target.value)}
                placeholder="62.09"
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Отчетный рабочий год:</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div className="border-t border-slate-200 md:col-span-2 pt-3">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block mb-2">
                Руководство и подписи
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Должность руководителя:
              </label>
              <input
                type="text"
                value={directorPost}
                onChange={(e) => setDirectorPost(e.target.value)}
                placeholder="Директор"
                className="w-full p-2.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ф.И.О. руководителя:
              </label>
              <input
                type="text"
                value={directorFIO}
                onChange={(e) => setDirectorFIO(e.target.value)}
                placeholder="Девляшова И.В."
                className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Должность уполномоченного лица (для подписи):
              </label>
              <input
                type="text"
                value={executivePost}
                onChange={(e) => setExecutivePost(e.target.value)}
                placeholder="Исполнительный директор"
                className="w-full p-2.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ф.И.О. уполномоченного лица:
              </label>
              <input
                type="text"
                value={executiveFIO}
                onChange={(e) => setExecutiveFIO(e.target.value)}
                placeholder="Кириллов П.М."
                className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
              />
            </div>

            <div className="border-t border-slate-200 md:col-span-2 pt-3">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block mb-2">
                Адреса
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Юридический адрес:</label>
              <input
                type="text"
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value)}
                placeholder="Индекс, Город, Улица, Дом, Офис"
                className="w-full p-2.5 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Фактический адрес:</label>
              <input
                type="text"
                value={actualAddress}
                onChange={(e) => setActualAddress(e.target.value)}
                placeholder="Если совпадает с юридическим, можно оставить пустым"
                className="w-full p-2.5 border border-slate-300 rounded-lg"
              />
            </div>

            {!isEditing && (
              <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={copyContingent}
                    onChange={(e) => setCopyContingent(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>
                    Скопировать базовый контингент должностей и вредностей (29н/342н) для этой организации
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Позволит сразу формировать направления и график для сотрудников новой организации, не создавая должности с нуля.
                </p>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition font-medium text-xs"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Сохранить изменения' : 'Создать и выбрать организацию'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
