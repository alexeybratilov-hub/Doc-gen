import React, { useState, useEffect, useMemo } from 'react';
import {
  CompanyItem,
  CompanySettings,
  Employee,
  GeneratedDocItem,
  HistoryRecord,
  JobDirectoryItem,
  SoutWorkplace,
  TemplateItem,
} from './lib/types';
import {
  DEFAULT_COMPANIES,
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_EMPLOYEES,
  DEFAULT_JOB_DIRECTORY,
  DEFAULT_SOUT_WORKPLACES,
  DEFAULT_TEMPLATES,
} from './lib/defaultData';
import { DEFAULT_HOLIDAYS_RU } from './lib/holidays';
import { filterEmployeesByCompany } from './lib/companyFilter';
import { InstructionsView } from './components/InstructionsView';
import { DirectionsView } from './components/DirectionsView';
import { MedicalScheduleView } from './components/MedicalScheduleView';
import { EmployeesView } from './components/EmployeesView';
import { ContingentView } from './components/ContingentView';
import { SoutView } from './components/SoutView';
import { TemplatesView } from './components/TemplatesView';
import { ExcelTransferView } from './components/ExcelTransferView';
import { CompanySettingsView } from './components/CompanySettingsView';
import { HistoryAndBackupView } from './components/HistoryAndBackupView';
import { GenerationResultModal } from './components/GenerationResultModal';
import { CompanyModal } from './components/CompanyModal';
import { CompanySetupWizard, CompanySetupResult } from './components/CompanySetupWizard';
import { CompanySelector } from './components/CompanySelector';
import { createExportWorkbook } from './lib/excelParser';
import {
  FileText,
  Stethoscope,
  CalendarClock,
  Users,
  BookOpen,
  FileSpreadsheet,
  FileCode,
  Building2,
  Archive,
  Download,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Monitor,
  Building,
} from 'lucide-react';

const STORAGE_KEY = 'docgen_portable_state_v1';

export default function App() {
  // Список юридических лиц и активная организация
  const [companies, setCompanies] = useState<CompanyItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_companies`);
      return saved ? JSON.parse(saved) : DEFAULT_COMPANIES;
    } catch {
      return DEFAULT_COMPANIES;
    }
  });

  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_active_comp_id`);
      if (saved) return saved;
      return DEFAULT_COMPANIES[0]?.id || 'comp-catania';
    } catch {
      return DEFAULT_COMPANIES[0]?.id || 'comp-catania';
    }
  });

  // Модальное окно создания / редактирования юрлица
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  // D3: мастер пошагового создания компании (штатное расписание → люди → СОУТ)
  const [isCompanySetupWizardOpen, setIsCompanySetupWizardOpen] = useState(false);
  const [pendingNewCompanyId, setPendingNewCompanyId] = useState('');
  const [pendingNewCompanyName, setPendingNewCompanyName] = useState('');
  const [companyToEdit, setCompanyToEdit] = useState<CompanyItem | null>(null);

  // Поддержка PWA / Desktop install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsAppInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('Для установки приложения нажмите на значок "Установить приложение" в адресной строке браузера или используйте десктопный пакет Windows.');
    }
  };

  // Инициализация сотрудников
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_emp`);
      return saved ? JSON.parse(saved) : DEFAULT_EMPLOYEES;
    } catch {
      return DEFAULT_EMPLOYEES;
    }
  });

  const [jobDirectory, setJobDirectory] = useState<JobDirectoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_jobs`);
      return saved ? JSON.parse(saved) : DEFAULT_JOB_DIRECTORY;
    } catch {
      return DEFAULT_JOB_DIRECTORY;
    }
  });

  const [soutWorkplaces, setSoutWorkplaces] = useState<SoutWorkplace[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sout`);
      return saved ? JSON.parse(saved) : DEFAULT_SOUT_WORKPLACES;
    } catch {
      return DEFAULT_SOUT_WORKPLACES;
    }
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    try {
      const savedActiveId = localStorage.getItem(`${STORAGE_KEY}_active_comp_id`);
      const savedCompanies = localStorage.getItem(`${STORAGE_KEY}_companies`);
      if (savedCompanies) {
        const comps: CompanyItem[] = JSON.parse(savedCompanies);
        const match = comps.find((c) => c.id === savedActiveId) || comps[0];
        if (match?.settings) return match.settings;
      }
      const saved = localStorage.getItem(`${STORAGE_KEY}_comp`);
      return saved ? JSON.parse(saved) : DEFAULT_COMPANY_SETTINGS;
    } catch {
      return DEFAULT_COMPANY_SETTINGS;
    }
  });

  const [holidaysList, setHolidaysList] = useState<string[]>(DEFAULT_HOLIDAYS_RU);
  const [templates, setTemplates] = useState<TemplateItem[]>(DEFAULT_TEMPLATES);
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_hist`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Текущая активная вкладка
  const [activeTab, setActiveTab] = useState<
    | 'instructions'
    | 'directions'
    | 'schedule'
    | 'employees'
    | 'contingent'
    | 'sout'
    | 'excel'
    | 'templates'
    | 'company'
    | 'backup'
  >('instructions');

  const [preselectedDirectionsIds, setPreselectedDirectionsIds] = useState<string[] | undefined>();

  // Модальное окно результатов генерации
  const [resultModalData, setResultModalData] = useState<{
    isOpen: boolean;
    files: GeneratedDocItem[];
    warnings: string[];
    scenarioTitle: string;
  }>({
    isOpen: false,
    files: [],
    warnings: [],
    scenarioTitle: '',
  });

  // Сохранение в LocalStorage при изменениях
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_emp`, JSON.stringify(employees));
    } catch (e) {
      console.warn('Failed to save employees to localStorage', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_jobs`, JSON.stringify(jobDirectory));
    } catch (e) {
      console.warn('Failed to save jobs to localStorage', e);
    }
  }, [jobDirectory]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_sout`, JSON.stringify(soutWorkplaces));
    } catch (e) {
      console.warn('Failed to save sout to localStorage', e);
    }
  }, [soutWorkplaces]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_comp`, JSON.stringify(companySettings));
    } catch (e) {
      console.warn('Failed to save company settings', e);
    }
  }, [companySettings]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_companies`, JSON.stringify(companies));
    } catch (e) {
      console.warn('Failed to save companies to localStorage', e);
    }
  }, [companies]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_active_comp_id`, activeCompanyId);
    } catch (e) {
      console.warn('Failed to save activeCompanyId', e);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_hist`, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history', e);
    }
  }, [history]);

  const activeCompany = useMemo(() => {
    return (
      companies.find((c) => c.id === activeCompanyId) ||
      companies[0] || {
        id: 'comp-catania',
        name: 'ООО «Катания»',
        inn: '2465359318',
        ogrn: '1242400002130',
        settings: DEFAULT_COMPANY_SETTINGS,
      }
    );
  }, [companies, activeCompanyId]);

  // D1 (R16, Q3=D): единая фильтрация сотрудников по активной компании
  // для вкладок «Направления» и «График медосмотров». Правило — как в
  // EmployeesView/InstructionsView (см. lib/companyFilter.ts).
  const companyEmployees = useMemo(
    () => filterEmployeesByCompany(employees, activeCompanyId, companies),
    [employees, activeCompanyId, companies]
  );

  const handleSelectCompany = (id: string) => {
    setActiveCompanyId(id);
    const comp = companies.find((c) => c.id === id);
    if (comp?.settings) {
      setCompanySettings(comp.settings);
    }
  };

  const handleUpdateCompanySettings = (newSettings: CompanySettings) => {
    setCompanySettings(newSettings);
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === activeCompanyId
          ? {
              ...c,
              name: newSettings.companyName || c.name,
              inn: newSettings.inn || c.inn,
              ogrn: newSettings.ogrn || c.ogrn,
              settings: newSettings,
            }
          : c
      )
    );
  };

  const handleOpenAddCompany = () => {
    setCompanyToEdit(null);
    setIsCompanyModalOpen(true);
  };

  const handleOpenEditCompany = (comp: CompanyItem) => {
    setCompanyToEdit(comp);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = (comp: CompanyItem, copyContingent: boolean) => {
    const isNewCompany = !companies.some((c) => c.id === comp.id);

    setCompanies((prev) => {
      const idx = prev.findIndex((c) => c.id === comp.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = comp;
        return copy;
      }
      return [...prev, comp];
    });
    setActiveCompanyId(comp.id);
    setCompanySettings(comp.settings);

    // D3: новая компания создаётся через пошаговый мастер (штатное расписание → люди → СОУТ).
    // Модальное окно компании только регистрирует юрлицо и открывает мастер.
    if (isNewCompany) {
      setPendingNewCompanyId(comp.id);
      setPendingNewCompanyName(comp.name);
      setIsCompanySetupWizardOpen(true);
      return;
    }

    // Legacy-поведение для старых данных: копирование контингента с галочкой
    // (глубокое клонирование factorsConfig / psychiatryPoints).
    if (copyContingent) {
      const clonedJobs: JobDirectoryItem[] = jobDirectory.map((j) => ({
        ...structuredClone(j),
        id: `job-${comp.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        companyId: comp.id,
      }));
      setJobDirectory((prev) => [...prev, ...clonedJobs]);
    }
  };

  // D3: завершение мастера создания компании — мат. файл (штатка) + поимённый список + карты СОУТ
  const handleCompanySetupComplete = (result: CompanySetupResult) => {
    const compId = pendingNewCompanyId;
    if (!compId) return;

    setJobDirectory((prev) => [...prev, ...result.jobs]);
    setEmployees((prev) => [...prev, ...result.employees]);
    setSoutWorkplaces((prev) => [...prev, ...result.soutCards]);

    // Автоматическая привязка карт СОУТ к должностям (по post)
    setJobDirectory((prev) =>
      prev.map((j) => {
        if (j.companyId !== compId) return j;
        const card = result.soutCards.find((s) => s.post === j.post);
        return card ? { ...j, sout: card.cardDocNumber, soutClass: card.soutClass } : j;
      })
    );

    setIsCompanySetupWizardOpen(false);
    setPendingNewCompanyId('');
    setPendingNewCompanyName('');
  };

  const handleCompanySetupCancel = () => {
    // Отмена мастера: компанию оставляем (юрлицо зарегистрировано), данные — пустые.
    setIsCompanySetupWizardOpen(false);
    setPendingNewCompanyId('');
    setPendingNewCompanyName('');
  };

  const handleDeleteCompany = (compToDeleteId: string) => {
    if (companies.length <= 1) {
      alert('Нельзя удалить единственную организацию.');
      return;
    }
    setCompanies((prev) => prev.filter((c) => c.id !== compToDeleteId));
    if (activeCompanyId === compToDeleteId) {
      const remaining = companies.filter((c) => c.id !== compToDeleteId);
      if (remaining.length > 0) {
        handleSelectCompany(remaining[0].id);
      }
    }
  };

  // Синхронизированный список подразделений компании
  const sharedDepartments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.dept && e.dept.trim()) set.add(e.dept.trim());
    });
    jobDirectory.forEach((j) => {
      if (j.dept && j.dept.trim()) set.add(j.dept.trim());
    });
    soutWorkplaces.forEach((s) => {
      if (s.dept && s.dept.trim()) set.add(s.dept.trim());
    });
    return Array.from(set).sort();
  }, [employees, jobDirectory, soutWorkplaces]);

  // Обработка завершения генерации
  const handleGenerationComplete = (
    files: GeneratedDocItem[],
    warnings: string[],
    scenario: 'instructions' | 'directions'
  ) => {
    const scenarioTitle =
      scenario === 'instructions'
        ? 'Инструктажи по охране труда'
        : 'Направления на медосмотр';

    const newRecord: HistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toLocaleString('ru-RU'),
      scenario,
      filesCount: files.length,
      employeesCount: new Set(files.map((f) => f.employeeFio)).size,
      files: files.map((f) => ({ name: f.name, folder: f.folder, size: f.size })),
      warnings,
    };

    setHistory((prev) => [newRecord, ...prev]);

    setResultModalData({
      isOpen: true,
      files,
      warnings,
      scenarioTitle,
    });
  };

  const handleDownloadUpdatedExcel = async () => {
    const bytes = await createExportWorkbook(employees, jobDirectory);
    const blob = new Blob([bytes as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Обновленный_Список_Инструктажи_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetAllData = () => {
    if (
      confirm(
        'Вернуть все данные к исходным демонстрационным таблицам (со скриншотов)? Текущие изменения будут сброшены.'
      )
    ) {
      setEmployees(DEFAULT_EMPLOYEES);
      setJobDirectory(DEFAULT_JOB_DIRECTORY);
      setSoutWorkplaces(DEFAULT_SOUT_WORKPLACES);
      setCompanySettings(DEFAULT_COMPANY_SETTINGS);
      setTemplates(DEFAULT_TEMPLATES);
      alert('Данные успешно восстановлены к первоначальному состоянию.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Главная навигационная панель (Header) */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Логотип и статус */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md font-black text-lg">
                ДГ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-base tracking-tight text-white">
                    DocGen Desktop
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Monitor className="w-3 h-3" />
                    Десктопное приложение
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  Охрана труда • Медосмотры (29н) • Психиатрия (342н) • СОУТ (426-ФЗ)
                </div>
              </div>
            </div>

            {/* Выбор юридического лица в шапке */}
            <div className="flex-1 flex justify-center max-w-sm px-2">
              <CompanySelector
                companies={companies}
                activeCompanyId={activeCompanyId}
                onSelectCompany={handleSelectCompany}
                onAddNewCompany={handleOpenAddCompany}
                onEditCompany={handleOpenEditCompany}
                onDeleteCompany={handleDeleteCompany}
                variant="header"
              />
            </div>

            {/* Быстрые действия */}
            <div className="flex items-center gap-2 shrink-0">
              {deferredPrompt && (
                <button
                  onClick={handleInstallApp}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  title="Установить как десктопное приложение Windows"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Установить на ПК</span>
                </button>
              )}

              <button
                onClick={handleResetAllData}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-1.5"
                title="Сброс к исходным таблицам из скриншотов"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Сброс данных</span>
              </button>

              <button
                onClick={() => setActiveTab('backup')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                title="Резервные копии и переносимый дистрибутив"
              >
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Десктопный пакет / Бэкап</span>
              </button>
            </div>
          </div>

          {/* Вкладки разделов */}
          <div className="flex space-x-1 overflow-x-auto py-1 scrollbar-none text-xs border-t border-slate-800/80">
            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'instructions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              1. Инструктажи по ОТ
            </button>

            <button
              onClick={() => setActiveTab('directions')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'directions'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              2. Медосмотры (29н / 342н)
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'schedule'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CalendarClock className="w-4 h-4 text-teal-400" />
              График медосмотров
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'employees'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Сотрудники ({employees.length})
            </button>

            <button
              onClick={() => setActiveTab('contingent')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'contingent'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              Контингент работников ({jobDirectory.length})
            </button>

            <button
              onClick={() => setActiveTab('sout')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'sout'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              СОУТ ({soutWorkplaces.length})
            </button>

            <button
              onClick={() => setActiveTab('excel')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'excel'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Загрузка Excel
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'templates'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-4 h-4" />
              Шаблоны DOCX
            </button>

            <button
              onClick={() => setActiveTab('company')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'company'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Реквизиты
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3 py-2 font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'backup'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Archive className="w-4 h-4" />
              Резервные копии
            </button>
          </div>
        </div>
      </header>

      {/* Основная рабочая область */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'instructions' && (
          <InstructionsView
            employees={employees}
            jobDirectory={jobDirectory}
            companySettings={companySettings}
            companies={companies}
            activeCompanyId={activeCompanyId}
            onSelectCompany={handleSelectCompany}
            onAddNewCompany={handleOpenAddCompany}
            onEditCompany={handleOpenEditCompany}
            onDeleteCompany={handleDeleteCompany}
            onNavigateToSettings={() => setActiveTab('company')}
            templates={templates}
            holidaysList={holidaysList}
            onUpdateEmployees={setEmployees}
            onGenerationComplete={(files, warnings) =>
              handleGenerationComplete(files, warnings, 'instructions')
            }
          />
        )}

        {activeTab === 'directions' && (
          <DirectionsView
            employees={companyEmployees}
            jobDirectory={jobDirectory}
            companySettings={companySettings}
            templates={templates}
            onUpdateCompanySettings={setCompanySettings}
            onUpdateEmployees={setEmployees}
            onGenerationComplete={(files, warnings) =>
              handleGenerationComplete(files, warnings, 'directions')
            }
            preselectedIds={preselectedDirectionsIds}
          />
        )}

        {activeTab === 'schedule' && (
          <MedicalScheduleView
            employees={companyEmployees}
            jobDirectory={jobDirectory}
            companySettings={companySettings}
            onUpdateEmployees={setEmployees}
            onNavigateToDirections={(ids) => {
              setPreselectedDirectionsIds(ids);
              setActiveTab('directions');
            }}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeesView
            employees={employees}
            jobDirectory={jobDirectory}
            onUpdateEmployees={setEmployees}
            companies={companies}
            activeCompanyId={activeCompanyId}
          />
        )}

        {activeTab === 'contingent' && (
          <ContingentView
            jobDirectory={jobDirectory}
            onUpdateJobDirectory={setJobDirectory}
            availableDepartments={sharedDepartments}
          />
        )}

        {activeTab === 'sout' && (
          <SoutView
            workplaces={soutWorkplaces}
            onUpdateWorkplaces={setSoutWorkplaces}
            departments={sharedDepartments}
            activeCompanyId={activeCompanyId}
          />
        )}

        {activeTab === 'excel' && (
          <ExcelTransferView
            employees={employees}
            jobDirectory={jobDirectory}
            companySettings={companySettings}
            activeCompanyId={activeCompanyId}
            onImportSuccess={(newEmp, newJobs, newSettings) => {
              setEmployees(newEmp);
              setJobDirectory(newJobs);
              if (newSettings) {
                setCompanySettings((prev) => ({ ...prev, ...newSettings }));
              }
            }}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesView templates={templates} onUpdateTemplates={setTemplates} />
        )}

        {activeTab === 'company' && (
          <CompanySettingsView
            companySettings={companySettings}
            onUpdateCompanySettings={handleUpdateCompanySettings}
            companies={companies}
            activeCompanyId={activeCompanyId}
            onSelectCompany={handleSelectCompany}
            onAddNewCompany={handleOpenAddCompany}
            onDeleteCompany={handleDeleteCompany}
          />
        )}

        {activeTab === 'backup' && (
          <HistoryAndBackupView
            history={history}
            companySettings={companySettings}
            companies={companies}
            activeCompanyId={activeCompanyId}
            employees={employees}
            jobDirectory={jobDirectory}
            holidaysList={holidaysList}
            templates={templates}
            soutWorkplaces={soutWorkplaces}
            onImportProject={(settings, emp, jobs, hols, hist, comps, activeId, restoredSout, restoredTemplates) => {
              setCompanySettings(settings);
              setEmployees(emp);
              setJobDirectory(jobs);
              setHolidaysList(hols);
              setHistory(hist);
              if (comps && Array.isArray(comps)) setCompanies(comps);
              if (activeId) setActiveCompanyId(activeId);
              // Q2-правка: восстановление реестра СОУТ и шаблонов из бэкапа.
              // Старые бэкапы '1.1.0' без этих полей (undefined) состояние не меняют.
              if (restoredSout && Array.isArray(restoredSout)) setSoutWorkplaces(restoredSout);
              if (restoredTemplates && Array.isArray(restoredTemplates)) setTemplates(restoredTemplates);
            }}
            onClearHistory={() => setHistory([])}
          />
        )}
      </main>

      {/* Модальное окно результатов генерации */}
      <GenerationResultModal
        isOpen={resultModalData.isOpen}
        onClose={() => setResultModalData((prev) => ({ ...prev, isOpen: false }))}
        files={resultModalData.files}
        warnings={resultModalData.warnings}
        scenarioTitle={resultModalData.scenarioTitle}
        onDownloadUpdatedExcel={handleDownloadUpdatedExcel}
      />

      {/* Подвал */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            100% Автономное десктопное приложение • Работает локально без серверов и без интернета
          </div>
          <div>DocGen Desktop Edition • Windows 10 / 11 • Запуск через start.bat</div>
        </div>
      </footer>

      {/* Модальное окно создания / редактирования юридического лица */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSave={handleSaveCompany}
        companyToEdit={companyToEdit}
      />

      {/* D3: пошаговый мастер наполнения новой компании (материнский файл — штатное расписание) */}
      <CompanySetupWizard
        isOpen={isCompanySetupWizardOpen}
        companyName={pendingNewCompanyName}
        companyId={pendingNewCompanyId}
        onCancel={handleCompanySetupCancel}
        onComplete={handleCompanySetupComplete}
      />
    </div>
  );
}
