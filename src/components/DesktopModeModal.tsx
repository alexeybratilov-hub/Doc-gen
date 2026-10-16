import React, { useState, useEffect } from 'react';
import { Monitor, Download, CheckCircle2, ShieldCheck, X, HardDrive, Cpu, Terminal } from 'lucide-react';

interface DesktopModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopModeModal: React.FC<DesktopModeModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'Чтобы установить приложение на рабочий стол:\n\n1. В правом верхнем углу адресной строки браузера (Google Chrome, Microsoft Edge или Яндекс.Браузер) нажмите иконку «Установить» (компьютер со стрелкой).\n2. Или откройте Меню браузера (три точки) -> «Установить DocGen Portable».\n\nПриложение установится как стандартная программа Windows с ярлыком на Рабочем столе и в меню «Пуск»!'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Автономный десктопный режим (без сервера)
              </h3>
              <p className="text-xs text-slate-500">
                Работа прямо на вашем ПК без установки Node.js и сторонних программ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Главное преимущество */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Приложение уже работает как полноценный оффлайн-десктоп!
            </div>
            <p className="text-emerald-800 leading-relaxed">
              Вам <strong>не требуется запускать консоли, серверы Node.js, Python или открывать черные окна терминала</strong>. Вся обработка Excel, таблиц и генерация документов Word (.docx) выполняется на 100% прямо на вашем процессоре внутри браузера без отправки данных в интернет.
            </p>
          </div>

          {/* Варианты использования */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
              2 простых способа использовать на ПК:
            </h4>

            {/* Способ 1: Установка PWA */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Monitor className="w-4 h-4 text-indigo-600" />
                  Способ 1. Установить на ПК как нативное приложение (Рекомендуется)
                </div>
                {isInstalled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Установлено
                  </span>
                )}
              </div>
              <p className="text-slate-600 leading-relaxed">
                Нажмите кнопку ниже. Браузер (Chrome, Edge, Яндекс) создаст полноценный ярлык на вашем Рабочем столе. Программа будет запускаться в отдельном собственном окне как обычная программа Windows, без вкладок и адресной строки браузера.
              </p>
              <button
                onClick={handleInstallClick}
                className="mt-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                {deferredPrompt
                  ? 'Установить приложение на ПК в один клик'
                  : 'Инструкция по установке на Рабочий стол'}
              </button>
            </div>

            {/* Способ 2: Автономный архив */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <HardDrive className="w-4 h-4 text-teal-600" />
                Способ 2. Автономный файл без интернета
              </div>
              <p className="text-slate-600 leading-relaxed">
                Во вкладке <strong>«Резервные копии»</strong> вы можете скачать полный zip-архив. Распакуйте его в любую папку на компьютере или флешке и просто откройте файл <code>index.html</code> в любом браузере. Всё работает полностью автономно без интернета и без командных строк.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-100 rounded-xl flex items-center gap-3 text-[11px] text-slate-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Все ваши базы (сотрудники, должности, юрлица, медосмотры, карты СОУТ) автоматически сохраняются в локальной памяти вашего ПК.
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition"
            >
              Понятно, закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
