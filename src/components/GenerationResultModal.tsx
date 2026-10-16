import React from 'react';
import { GeneratedDocItem } from '../lib/types';
import JSZip from 'jszip';
import { Download, FileText, CheckCircle2, AlertTriangle, X, Archive, FileSpreadsheet } from 'lucide-react';

interface GenerationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: GeneratedDocItem[];
  warnings: string[];
  scenarioTitle: string;
  onDownloadUpdatedExcel?: () => void;
}

export const GenerationResultModal: React.FC<GenerationResultModalProps> = ({
  isOpen,
  onClose,
  files,
  warnings,
  scenarioTitle,
  onDownloadUpdatedExcel,
}) => {
  if (!isOpen) return null;

  const downloadFile = (file: GeneratedDocItem) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllZip = async () => {
    const zip = new JSZip();

    for (const file of files) {
      const folder = zip.folder(file.folder);
      folder?.file(file.name, file.blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Документы_${scenarioTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold">Генерация документов завершена</h2>
              <p className="text-xs text-slate-300">
                Сценарий: {scenarioTitle} • Создано файлов: {files.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Предупреждения */}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Предупреждения ({warnings.length}):
              </div>
              <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Список файлов */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Сформированные файлы Word (.docx)
              </h3>
              <span className="text-xs text-slate-500">
                Всего: {files.length} шт. (
                {(files.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} КБ)
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-sm font-mono text-[10px]">
                          Папка: {file.folder}/
                        </span>
                        <span>Сотрудник: {file.employeeFio}</span>
                        <span>• {(file.size / 1024).toFixed(1)} КБ</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadFile(file)}
                    className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition"
                    title="Скачать файл"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Футер с кнопками массового скачивания */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-100 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Файлы готовы для печати и подписания
          </div>

          <div className="flex items-center gap-3">
            {onDownloadUpdatedExcel && (
              <button
                onClick={onDownloadUpdatedExcel}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition flex items-center gap-2 shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Скачать обновлённый Excel
              </button>
            )}

            <button
              onClick={downloadAllZip}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-xs"
            >
              <Archive className="w-4 h-4" />
              Скачать весь комплект (ZIP)
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
