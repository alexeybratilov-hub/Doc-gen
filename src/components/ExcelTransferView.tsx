import React, { useState, useRef } from 'react';
import { CompanySettings, Employee, JobDirectoryItem } from '../lib/types';
import { createBlankTemplateWorkbook, createExportWorkbook, parseExcelWorkbook } from '../lib/excelParser';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ArrowRight,
  Info,
  HelpCircle,
  Table,
  Check,
} from 'lucide-react';

interface ExcelTransferViewProps {
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  companySettings: CompanySettings;
  activeCompanyId: string;
  onImportSuccess: (
    newEmployees: Employee[],
    newJobDirectory: JobDirectoryItem[],
    newSettings?: Partial<CompanySettings>
  ) => void;
}

export const ExcelTransferView: React.FC<ExcelTransferViewProps> = ({
  employees,
  jobDirectory,
  companySettings,
  activeCompanyId,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    employees: Employee[];
    jobDirectory: JobDirectoryItem[];
    companySettings?: Partial<CompanySettings>;
    warnings: string[];
    detectedType: string;
    fileName: string;
  } | null>(null);

  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const res = await parseExcelWorkbook(buffer);
      setImportPreview({
        employees: res.employees,
        jobDirectory: res.jobDirectory,
        companySettings: res.companySettings,
        warnings: res.warnings,
        detectedType: res.detectedType,
        fileName: file.name,
      });
    } catch (err: any) {
      alert(`Ошибка чтения Excel-файла: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = () => {
    if (!importPreview) return;
    // D4: всем импортируемым записям принудительно проставляем активную компанию
    // (модель изоляции A — данные не могут «протечь» в другую компанию).
    const stampedEmployees = importPreview.employees.map((e) => ({ ...e, companyId: activeCompanyId }));
    const stampedJobs = importPreview.jobDirectory.map((j) => ({ ...j, companyId: activeCompanyId }));
    onImportSuccess(
      stampedEmployees.length > 0 ? stampedEmployees : employees,
      stampedJobs.length > 0 ? stampedJobs : jobDirectory,
      importPreview.companySettings
    );
    alert(`Данные из файла «${importPreview.fileName}» успешно импортированы!`);
    setImportPreview(null);
  };

  // Скачивание пустой чистой формы шаблона
  const handleDownloadBlankTemplate = async () => {
    const bytes = await createBlankTemplateWorkbook();
    const blob = new Blob([bytes as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Шаблон_для_заполнения_DocGen_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Экспорт текущей базы в Excel
  const handleDownloadCurrentExcel = async () => {
    const bytes = await createExportWorkbook(employees, jobDirectory);
    const blob = new Blob([bytes as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `База_Сотрудников_и_Должностей_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            Синхронизация с таблицами Excel (.xlsx, .xls)
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Загрузка и выгрузка таблиц Excel
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Загружайте существующие книги Excel с листами «СПИСОК» и «ДАННЫЕ» или таблицы медосмотра.
            Приложение автоматически очистит данные и заполнит базу без лишних колонок.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadBlankTemplate}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            Скачать пустую форму для заполнения (.xlsx)
          </button>

          <button
            onClick={handleDownloadCurrentExcel}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            Выгрузить текущую базу ({employees.length} чел.)
          </button>
        </div>
      </div>

      {/* Инструкция и спецификация структуры Excel */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              Инструкция и регламент структуры таблицы Excel для загрузки
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Книга Excel может содержать два листа: <b>«СПИСОК»</b> (поименный список сотрудников) и <b>«ДАННЫЕ»</b> (справочник должностей и условий труда).
              Лишние технические столбцы (<b>«ГЕНЕРАЦИЯ»</b>, <b>«проверка знаний»</b>, <b>«дата инструктажа»</b>) <span className="text-rose-400 font-bold">удалены</span> — они больше не нужны в файле, так как система отслеживает их автоматически в интерфейсе.
            </p>
          </div>
        </div>

        {/* Вид таблицы СПИСОК */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Лист 1: «СПИСОК» — точный порядок и наименование 12 колонок:</span>
            <span className="text-[11px] text-slate-400 normal-case">Строка 1 — заголовки, со строки 2 — данные</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-200 border-b border-slate-700">
                  <th className="py-2 px-2.5 text-center w-10">№ кол.</th>
                  <th className="py-2 px-3">Наименование столбца</th>
                  <th className="py-2 px-3">Формат данных</th>
                  <th className="py-2 px-3">Назначение и пример</th>
                  <th className="py-2 px-3">Обязательность</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">1</td>
                  <td className="py-2 px-3 text-white font-bold">№</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Текст или число (01, 02)</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">Порядковый номер записи</td>
                  <td className="py-2 px-3 text-emerald-400 font-sans">Да</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">2</td>
                  <td className="py-2 px-3 text-white font-bold">сотрудник</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Текст (ФИО полностью)</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">Иванов Иван Иванович</td>
                  <td className="py-2 px-3 text-emerald-400 font-sans">Обязательно</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">3</td>
                  <td className="py-2 px-3 text-white font-bold">подразделение</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Текст</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">Производственный отдел / АУП</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Желательно</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">4</td>
                  <td className="py-2 px-3 text-white font-bold">должность</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Текст</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">Точно как в справочнике «ДАННЫЕ»</td>
                  <td className="py-2 px-3 text-emerald-400 font-sans">Обязательно</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">5</td>
                  <td className="py-2 px-3 text-white font-bold">дата приема</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">ДД.ММ.ГГГГ или дата Excel</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">01.09.2026 (для расчёта стажировки)</td>
                  <td className="py-2 px-3 text-emerald-400 font-sans">Для инструктажей</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">6</td>
                  <td className="py-2 px-3 text-white font-bold">дата рождения</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">ДД.ММ.ГГГГ</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">15.05.1990 (для направлений МО)</td>
                  <td className="py-2 px-3 text-emerald-400 font-sans">Для медосмотров</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">7</td>
                  <td className="py-2 px-3 text-white font-bold">руководитель</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Текст (должность + ФИО)</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">Руководитель отдела Шмаль А.А.</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Желательно</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">8</td>
                  <td className="py-2 px-3 text-white font-bold">СНИЛС</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Формат ХХХ-ХХХ-ХХХ ХХ</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">123-456-789 00</td>
                  <td className="py-2 px-3 text-emerald-400 font-sans">Для направлений</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">9</td>
                  <td className="py-2 px-3 text-white font-bold">Телефон</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Текст или номер</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">89991234567</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Опционально</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">10</td>
                  <td className="py-2 px-3 text-white font-bold">стаж</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Число лет</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">1 (стаж работы в организации)</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Опционально</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">11</td>
                  <td className="py-2 px-3 text-white font-bold">плановая дата МО</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">ДД.ММ.ГГГГ</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">План прохождения медосмотра</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Для графика МО</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-2 px-2.5 text-center text-emerald-400 font-bold">12</td>
                  <td className="py-2 px-3 text-white font-bold">фактическая дата МО</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">ДД.ММ.ГГГГ</td>
                  <td className="py-2 px-3 text-slate-300 font-sans">Фактическая дата заключения МО</td>
                  <td className="py-2 px-3 text-slate-400 font-sans">Для графика МО</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Примечание про удалённые столбцы */}
        <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-xs text-rose-300">
          <Info className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <b>Внимание:</b> Столбцы «ГЕНЕРАЦИЯ», «проверка знаний» и «дата инструктажа» полностью исключены из шаблона. Если вы загружаете старый файл с этими колонками, приложение проигнорирует их и сохранит только значимые данные.
          </span>
        </div>
      </div>

      {/* Зона загрузки Drag & Drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleProcessFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50'
            : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleProcessFile(file);
          }}
          accept=".xlsx,.xls"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">
              {isLoading ? 'Чтение структуры таблицы...' : 'Нажмите для выбора файла или перетащите Excel сюда'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Поддерживаются форматы .XLSX и .XLS (максимум до 50 МБ)
            </div>
          </div>
        </div>
      </div>

      {/* Предпросмотр результатов импорта */}
      {importPreview && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-base">
                Файл «{importPreview.fileName}» успешно прочитан
              </h3>
            </div>
            <button
              onClick={() => setImportPreview(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Отменить
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Распознано сотрудников</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {importPreview.employees.length} чел.
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Должностей в справочнике</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {importPreview.jobDirectory.length} поз.
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Тип распознанной таблицы</div>
              <div className="text-base font-bold text-slate-800 mt-1">
                {importPreview.detectedType === 'instructions'
                  ? 'Инструктажи («СПИСОК» + «ДАННЫЕ»)'
                  : importPreview.detectedType === 'directions'
                  ? 'Таблица медосмотра (29н и 342н)'
                  : 'Пользовательский список'}
              </div>
            </div>
          </div>

          {importPreview.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Предупреждения при анализе:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {importPreview.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setImportPreview(null)}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Отклонить
            </button>
            <button
              onClick={handleApplyImport}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg transition shadow-xs flex items-center gap-2"
            >
              Применить данные в базу
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
