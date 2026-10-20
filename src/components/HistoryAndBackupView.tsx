import React, { useRef, useState } from 'react';
import { CompanyItem, CompanySettings, Employee, HistoryRecord, JobDirectoryItem, SoutWorkplace, TemplateItem } from '../lib/types';
import { createPortableZipBundle, exportProjectToJson, importProjectFromJson } from '../lib/portableManager';
import { History, Download, Upload, Archive, HardDrive, FileJson, CheckCircle2, Clock, Calendar, Monitor } from 'lucide-react';

interface HistoryAndBackupViewProps {
  history: HistoryRecord[];
  companySettings: CompanySettings;
  companies?: CompanyItem[];
  activeCompanyId?: string;
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  holidaysList: string[];
  templates: TemplateItem[];
  soutWorkplaces?: SoutWorkplace[];
  onImportProject: (
    settings: CompanySettings,
    employees: Employee[],
    jobs: JobDirectoryItem[],
    holidays: string[],
    history: HistoryRecord[],
    companies?: CompanyItem[],
    activeCompanyId?: string,
    soutWorkplaces?: SoutWorkplace[],
    templates?: TemplateItem[]
  ) => void;
  onClearHistory: () => void;
}

export const HistoryAndBackupView: React.FC<HistoryAndBackupViewProps> = ({
  history,
  companySettings,
  companies,
  activeCompanyId,
  employees,
  jobDirectory,
  holidaysList,
  templates,
  soutWorkplaces,
  onImportProject,
  onClearHistory,
}) => {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isPackingZip, setIsPackingZip] = useState(false);

  const handleExportJson = () => {
    const jsonStr = exportProjectToJson(
      companySettings,
      employees,
      jobDirectory,
      holidaysList,
      history,
      companies,
      activeCompanyId,
      soutWorkplaces,
      templates
    );
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DocGen_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const bundle = importProjectFromJson(text);
        onImportProject(
          bundle.companySettings,
          bundle.employees,
          bundle.jobDirectory,
          bundle.holidays || holidaysList,
          bundle.history || [],
          bundle.companies,
          bundle.activeCompanyId,
          bundle.soutWorkplaces,
          // importProjectFromJson уже десериализовал fileBufferBase64 -> fileBuffer (ArrayBuffer)
          bundle.templates as unknown as TemplateItem[] | undefined
        );
        alert('Резервная копия проекта успешно восстановлена!');
      } catch (err: any) {
        alert(`Ошибка импорта резервной копии: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadPortableZip = async () => {
    setIsPackingZip(true);
    try {
      const zipBlob = await createPortableZipBundle({
        companySettings,
        employees,
        jobDirectory,
        holidays: holidaysList,
        templates,
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DocGen_Portable_Windows_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Ошибка создания переносимого комплекта: ${err.message}`);
    } finally {
      setIsPackingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={jsonInputRef}
        onChange={handleImportJson}
        accept=".json"
        className="hidden"
      />

      {/* Верхний блок переносимости Windows */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Monitor className="w-4 h-4" />
              Автономное десктопное приложение для Windows 10 / 11
            </div>
            <h2 className="text-xl font-extrabold">
              Скачать автономный пакет (Запуск в 1 клик через start.bat)
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Приложение работает на 100% локально на вашем ПК без каких-либо серверов, хостов или интернета.
              Архив содержит готовые шаблоны Word (.docx), базу сотрудников, справочники и файл запуска start.bat.
            </p>
          </div>

          <button
            onClick={handleDownloadPortableZip}
            disabled={isPackingZip}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-2 shadow-lg shrink-0"
          >
            <Download className="w-4 h-4" />
            {isPackingZip ? 'Упаковка ZIP-архива...' : 'Скачать пакет Windows (ZIP)'}
          </button>
        </div>
      </div>

      {/* Экспорт и Импорт проекта */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase mb-1">
              <FileJson className="w-4 h-4" />
              Экспорт проекта в файл JSON
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Резервное копирование текущего состояния
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Сохраняет всех сотрудников, справочник должностей, реквизиты организации и историю
              генерации в единый компактный файл.
            </p>
          </div>

          <button
            onClick={handleExportJson}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Сохранить резервную копию (.json)
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase mb-1">
              <HardDrive className="w-4 h-4" />
              Восстановление из файла JSON
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Загрузить проект с другого компьютера
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Восстанавливает базу и настройки из ранее сохранённого файла резервной копии.
            </p>
          </div>

          <button
            onClick={() => jsonInputRef.current?.click()}
            className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" /> Выбрать файл проекта (.json)
          </button>
        </div>
      </div>

      {/* Журнал генераций */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              Журнал операций генерации ({history.length})
            </h3>
          </div>

          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-rose-600 font-medium transition"
            >
              Очистить журнал
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            История операций пуста. Запустите генерацию на вкладке инструктажей или медосмотра.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        record.scenario === 'instructions' ? 'bg-indigo-600' : 'bg-teal-600'
                      }`}
                    />
                    {record.scenario === 'instructions'
                      ? 'Инструктажи по охране труда'
                      : 'Направления на медосмотр (29н / 342н)'}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {record.timestamp}
                    </span>
                    <span>• Обработано: {record.employeesCount} чел.</span>
                    <span>• Сформировано: {record.filesCount} док.</span>
                  </div>
                </div>

                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Успешно
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
