import React, { useState } from 'react';
import { Employee } from '../lib/types';
import { parsePastedData } from '../lib/excelParser';
import { ClipboardPaste, AlertCircle, Check, X } from 'lucide-react';

interface BatchPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (newEmployees: Partial<Employee>[], replaceAll: boolean) => void;
}

export const BatchPasteModal: React.FC<BatchPasteModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [mode, setMode] = useState<'table' | 'column'>('table');
  const [targetColumn, setTargetColumn] = useState<keyof Employee>('fio');
  const [replaceAll, setReplaceAll] = useState(false);

  if (!isOpen) return null;

  const parsedPreview = parsePastedData(pasteText, mode, targetColumn);

  const handleConfirm = () => {
    if (parsedPreview.length === 0) return;
    onApply(parsedPreview, replaceAll);
    setPasteText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <ClipboardPaste className="w-6 h-6 text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold">Вставка данных массивом из Excel / буфера обмена</h2>
              <p className="text-xs text-slate-300">
                Скопируйте ячейки из Excel (Ctrl+C) и вставьте в поле ниже (Ctrl+V)
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Формат вставки
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('table')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition ${
                    mode === 'table'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Целиком таблица (строки и колонки)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('column')}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition ${
                    mode === 'column'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Один столбец (список)
                </button>
              </div>
            </div>

            {mode === 'column' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Назначение столбца
                </label>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value as keyof Employee)}
                  className="w-full text-xs font-medium py-2 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="fio">Ф.И.О. сотрудника</option>
                  <option value="post">Должность / Профессия</option>
                  <option value="dept">Подразделение</option>
                  <option value="hireDate">Дата приёма (ДД.ММ.ГГГГ)</option>
                  <option value="birthDate">Дата рождения (ДД.ММ.ГГГГ)</option>
                  <option value="snils">СНИЛС</option>
                  <option value="phone">Телефон</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Текстовые данные из буфера (Ctrl+V)
            </label>
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Вставьте сюда скопированные ячейки из Excel или список строк..."
              className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Предпросмотр */}
          {parsedPreview.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">
                  Распознано строк: {parsedPreview.length}
                </span>
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Готово к импорту
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto text-xs divide-y divide-slate-200">
                {parsedPreview.slice(0, 10).map((row, idx) => (
                  <div key={idx} className="py-1.5 flex gap-4 text-slate-600">
                    <span className="w-8 font-mono text-slate-400">#{row.num}</span>
                    <span className="font-semibold text-slate-800 flex-1 truncate">
                      {row.fio || '—'}
                    </span>
                    <span className="flex-1 truncate">{row.post || '—'}</span>
                    <span className="w-24 text-slate-500">{row.hireDate || row.birthDate || ''}</span>
                  </div>
                ))}
                {parsedPreview.length > 10 && (
                  <div className="py-1 text-center text-slate-400 text-xs italic">
                    ...и ещё {parsedPreview.length - 10} строк
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="replaceAllCheck"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
              className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="replaceAllCheck" className="text-xs text-slate-700 font-medium">
              Заменить текущий список сотрудников (если флаг снят, строки добавятся в конец)
            </label>
          </div>
        </div>

        {/* Футер */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={parsedPreview.length === 0}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Добавить {parsedPreview.length} {parsedPreview.length === 1 ? 'запись' : 'записей'}
          </button>
        </div>
      </div>
    </div>
  );
};
