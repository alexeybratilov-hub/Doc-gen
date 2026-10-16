import React, { useState, useMemo } from 'react';
import { CompanySettings, Employee, ExamType, GeneratedDocItem, JobDirectoryItem, SoutClassType, TemplateItem } from '../lib/types';
import {
  generateDocuments,
  hasProgramValue,
  getEmployeeMedicalEligibility,
  getEmployeeJobExperienceYears,
  filterEmployeeHarmFactors,
  isHarmfulSoutClass,
} from '../lib/docxEngine';
import {
  Stethoscope,
  Play,
  CheckSquare,
  Square,
  Building2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit3,
  Search,
  ShieldAlert,
  Clock,
  History,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';

interface DirectionsViewProps {
  employees: Employee[];
  jobDirectory: JobDirectoryItem[];
  companySettings: CompanySettings;
  templates: TemplateItem[];
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  onUpdateEmployees?: (updated: Employee[]) => void;
  onGenerationComplete: (files: GeneratedDocItem[], warnings: string[]) => void;
  preselectedIds?: string[];
}

type SortField = 'num' | 'fio' | 'gender' | 'post' | 'dept' | 'soutClass' | 'experience' | 'factors' | 'pso';
type SortOrder = 'asc' | 'desc';

export const DirectionsView: React.FC<DirectionsViewProps> = ({
  employees,
  jobDirectory,
  companySettings,
  templates,
  onUpdateCompanySettings,
  onUpdateEmployees,
  onGenerationComplete,
  preselectedIds,
}) => {
  const currentExamType = companySettings.examType;
  const isPreliminary = currentExamType === 'предварительный';
  const isProfpathology = currentExamType === 'профпатология';

  // Строгая фильтрация контингента медосмотра по правилам:
  // 1) В медосмотры не должны попадать люди без факторов вредности и психиатрии
  // 2) В периодических медосмотрах не должны попадать люди с психиатрией - только с факторами вредности
  // 3) В профпатологию попадают ТОЛЬКО работники со стажем >= 5 лет в должности во вредных условиях (подклассы 3.1, 3.2, 3.3, 3.4, 4)
  const eligibleEmployees = useMemo(() => {
    return employees
      .map((emp) => {
        const eligibility = getEmployeeMedicalEligibility(emp, jobDirectory, currentExamType);
        return {
          employee: emp,
          eligibility,
        };
      })
      .filter((item) => item.eligibility.eligible);
  }, [employees, jobDirectory, currentExamType]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (preselectedIds && preselectedIds.length > 0) {
      return new Set(preselectedIds);
    }
    return new Set(eligibleEmployees.map((e) => e.employee.id));
  });

  // Синхронизация выбора при переключении вида МО
  React.useEffect(() => {
    setSelectedIds(new Set(eligibleEmployees.map((e) => e.employee.id)));
  }, [currentExamType]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Сортировка
  const [sortField, setSortField] = useState<SortField>('num');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Модалка редактирования сотрудника / факторов прошлого года
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = (val: boolean) => {
    if (val) setSelectedIds(new Set(eligibleEmployees.map((e) => e.employee.id)));
    else setSelectedIds(new Set());
  };

  const handleRunDirections = async () => {
    if (selectedIds.size === 0) return;
    setIsGenerating(true);

    try {
      const templatesMap = new Map<string, ArrayBuffer>();
      for (const tpl of templates) {
        if (tpl.fileBuffer) {
          templatesMap.set(tpl.name, tpl.fileBuffer);
        }
      }

      // Передаём только выбранных сотрудников
      const targetEmployees = employees.filter((e) => selectedIds.has(e.id));

      const res = await generateDocuments({
        scenario: 'directions',
        employees: targetEmployees,
        jobDirectory,
        companySettings,
        templatesMap,
      });

      onGenerationComplete(res.files, res.warnings);
    } catch (err: any) {
      alert(`Ошибка генерации направлений: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Быстрое изменение пола сотрудника
  const handleQuickGenderChange = (empId: string, gender: 'м' | 'ж') => {
    if (!onUpdateEmployees) return;
    onUpdateEmployees(
      employees.map((e) => (e.id === empId ? { ...e, gender } : e))
    );
  };

  // Быстрое изменение класса СОУТ сотрудника
  const handleQuickSoutClassChange = (empId: string, soutClass: SoutClassType) => {
    if (!onUpdateEmployees) return;
    onUpdateEmployees(
      employees.map((e) => (e.id === empId ? { ...e, soutClass } : e))
    );
  };

  // Поиск и сортировка
  const filteredList = useMemo(() => {
    return eligibleEmployees.filter(({ employee: emp, eligibility }) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (emp.fio || '').toLowerCase().includes(term) ||
        (emp.post || '').toLowerCase().includes(term) ||
        (emp.dept || '').toLowerCase().includes(term) ||
        (eligibility.factors || '').toLowerCase().includes(term) ||
        (eligibility.psychiatry || '').toLowerCase().includes(term)
      );
    });
  }, [eligibleEmployees, searchTerm]);

  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      const empA = a.employee;
      const empB = b.employee;
      let compareVal = 0;

      if (sortField === 'num') {
        compareVal = (empA.num || '').localeCompare(empB.num || '', undefined, { numeric: true });
      } else if (sortField === 'fio') {
        compareVal = (empA.fio || '').localeCompare(empB.fio || '');
      } else if (sortField === 'gender') {
        compareVal = (empA.gender || '').localeCompare(empB.gender || '');
      } else if (sortField === 'post') {
        compareVal = (empA.post || '').localeCompare(empB.post || '');
      } else if (sortField === 'dept') {
        compareVal = (empA.dept || '').localeCompare(empB.dept || '');
      } else if (sortField === 'soutClass') {
        compareVal = (a.eligibility.effectiveSoutClass || '').localeCompare(b.eligibility.effectiveSoutClass || '');
      } else if (sortField === 'experience') {
        compareVal = a.eligibility.jobYears - b.eligibility.jobYears;
      } else if (sortField === 'factors') {
        compareVal = (a.eligibility.factors || '').localeCompare(b.eligibility.factors || '');
      } else if (sortField === 'pso') {
        compareVal = (a.eligibility.psychiatry || '').localeCompare(b.eligibility.psychiatry || '');
      }

      return sortOrder === 'asc' ? compareVal : -compareVal;
    });
  }, [filteredList, sortField, sortOrder]);

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
      <ArrowUp className="w-3.5 h-3.5 text-teal-600 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-teal-600 inline ml-1" />
    );
  };

  const handleSaveEmpEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || !onUpdateEmployees) return;
    const updated = employees.map((emp) => (emp.id === editingEmp.id ? editingEmp : emp));
    onUpdateEmployees(updated);
    setEditingEmp(null);
  };

  // Переключение факторов прошлого года
  const toggleFactorCompletedLastYear = (code: string) => {
    if (!editingEmp) return;
    const current = editingEmp.harmFactorsCompletedLastYear || [];
    let next: string[];
    if (current.includes(code)) {
      next = current.filter((c) => c !== code);
    } else {
      next = [...current, code];
    }
    setEditingEmp({
      ...editingEmp,
      harmFactorsCompletedLastYear: next,
    });
  };

  // Подсчёт количества ожидаемых документов
  let totalMo = 0;
  let totalPso = 0;

  eligibleEmployees.forEach(({ employee: emp, eligibility }) => {
    if (!selectedIds.has(emp.id)) return;
    totalMo++;
    if (isPreliminary && eligibility.hasPsychiatry) {
      totalPso++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Баннер сценария №2 */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-xl p-6 text-white shadow-md border border-teal-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Stethoscope className="w-4 h-4" />
              Сценарий №2 • Направления на медосмотры (Приказ 29н, 342н)
            </div>
            <h2 className="text-xl font-extrabold">
              {isProfpathology
                ? 'Направления в Центр профпатологии (стаж 5+ лет во вредных условиях)'
                : isPreliminary
                ? 'Предварительные медосмотры при приеме на работу (МО + ПСО)'
                : 'Периодические медицинские осмотры работников'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {isProfpathology
                ? 'Формирует направления на периодический медосмотр в Центр профпатологии. Попадают только работники со стажем от 5 лет в должности с вредным классом условий труда (3.1–4).'
                : isPreliminary
                ? 'Формирует направления на медосмотр (МО) и обязательное психиатрическое освидетельствование (ПСО по 342н) для новых работников.'
                : 'Формирует периодические направления по приказу 29н с автоматическим учетом факторов «1 раз в 2 года» (факторы, пройденные в прошлом году, исключаются).'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunDirections}
              disabled={selectedIds.size === 0 || isGenerating}
              className="px-6 py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-extrabold rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              {isGenerating
                ? 'Формирование...'
                : `Сформировать направления (${selectedIds.size} чел. / ${totalMo + totalPso} док.)`}
            </button>
          </div>
        </div>
      </div>

      {/* Панель настройки вида медосмотра (3 кнопки) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Выбор: Периодический / Предварительный / Профпатология */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Вид медицинского осмотра:
            </label>
            <span className="text-[11px] text-slate-500">
              Допущено к направлению: <strong>{eligibleEmployees.length} чел.</strong>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onUpdateCompanySettings({ ...companySettings, examType: 'периодический' })}
              className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition flex flex-col items-center justify-center gap-1 text-center ${
                currentExamType === 'периодический'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>Периодический</span>
              <span className={`text-[10px] font-normal ${currentExamType === 'периодический' ? 'text-teal-200' : 'text-slate-500'}`}>
                Только вредные факторы 29н
              </span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateCompanySettings({ ...companySettings, examType: 'предварительный' })}
              className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition flex flex-col items-center justify-center gap-1 text-center ${
                currentExamType === 'предварительный'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>Предварительный</span>
              <span className={`text-[10px] font-normal ${currentExamType === 'предварительный' ? 'text-teal-200' : 'text-slate-500'}`}>
                МО 29н + ПСО 342н
              </span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateCompanySettings({ ...companySettings, examType: 'профпатология' })}
              className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition flex flex-col items-center justify-center gap-1 text-center ${
                currentExamType === 'профпатология'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Профпатология</span>
              </div>
              <span className={`text-[10px] font-normal ${currentExamType === 'профпатология' ? 'text-rose-200' : 'text-rose-700'}`}>
                Стаж 5+ лет, класс 3.1–4
              </span>
            </button>
          </div>

          {isProfpathology && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Критерий профпатологии (Приказ 29н, п. 40):</strong> стаж работы от 5 лет в должности во вредных условиях (подклассы 3.1, 3.2, 3.3, 3.4, класс 4). Осмотр проводится 1 раз в 5 лет в Центре профпатологии.
              </span>
            </div>
          )}
        </div>

        {/* Организация */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-1">
              <Building2 className="w-4 h-4 text-teal-600" />
              Организация:
            </div>
            <div className="font-bold text-slate-900 text-sm truncate">{companySettings.companyName}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              ОГРН: {companySettings.ogrn} • ИНН: {companySettings.inn}
            </div>
          </div>
          <div className="text-[11px] text-teal-700 font-medium mt-2">
            Управляется во вкладке «Реквизиты организации».
          </div>
        </div>
      </div>

      {/* Панель массового выбора и поиска */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="text-xs font-bold text-slate-800">
            Выбрано для печати: <span className="text-teal-700">{selectedIds.size}</span> из{' '}
            {eligibleEmployees.length} допущенных чел. (МО: {totalMo} шт.{isPreliminary ? `, ПСО: ${totalPso} шт.` : ''})
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Поиск по контингенту..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => selectAll(true)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Выбрать всех
          </button>
          <button
            onClick={() => selectAll(false)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5" /> Снять выбор
          </button>
        </div>
      </div>

      {/* Таблица контингента медосмотра */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] select-none">
                <th className="py-3 px-3 w-10 text-center">Выбор</th>
                <th
                  onClick={() => handleHeaderSort('num')}
                  className="py-3 px-2 w-12 text-center cursor-pointer hover:bg-slate-100"
                >
                  № {renderSortIcon('num')}
                </th>
                <th
                  onClick={() => handleHeaderSort('fio')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Ф.И.О. и СНИЛС {renderSortIcon('fio')}
                </th>
                <th
                  onClick={() => handleHeaderSort('gender')}
                  className="py-3 px-2 text-center cursor-pointer hover:bg-slate-100 w-12"
                >
                  Пол {renderSortIcon('gender')}
                </th>
                <th
                  onClick={() => handleHeaderSort('post')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Профессия и Подразделение {renderSortIcon('post')}
                </th>
                <th
                  onClick={() => handleHeaderSort('soutClass')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100"
                >
                  Класс СОУТ {renderSortIcon('soutClass')}
                </th>
                <th
                  onClick={() => handleHeaderSort('experience')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-center"
                >
                  Стаж {renderSortIcon('experience')}
                </th>
                <th
                  onClick={() => handleHeaderSort('factors')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100"
                >
                  Факторы вредности (29н) {renderSortIcon('factors')}
                </th>
                {isPreliminary && (
                  <th
                    onClick={() => handleHeaderSort('pso')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                  >
                    Психиатрия (342н) {renderSortIcon('pso')}
                  </th>
                )}
                <th className="py-3 px-3 text-center">Пакет</th>
                <th className="py-3 px-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <div className="font-semibold text-sm">Работники не найдены</div>
                    <div className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {isProfpathology
                        ? 'В центре профпатологии медосмотр проходят только работники со стажем от 5 лет в должности с вредными условиями по СОУТ (подклассы 3.1, 3.2, 3.3, 3.4, 4).'
                        : companySettings.examType === 'периодический'
                        ? 'В периодическом МО участвуют только работники с вредными производственными факторами (Приказ 29н).'
                        : 'В контингент медосмотра не включены сотрудники без факторов вредности и психиатрии.'}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedList.map(({ employee: emp, eligibility }) => {
                  const isChecked = selectedIds.has(emp.id);
                  const hasPso = eligibility.hasPsychiatry;
                  const isFemale = emp.gender === 'жен' || emp.gender === 'ж';
                  const isHarmful = isHarmfulSoutClass(eligibility.effectiveSoutClass);

                  // Расчет факторов с учетом 1 год / 2 года
                  const factorCalc = filterEmployeeHarmFactors(emp, jobDirectory);

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => toggleSelect(emp.id)}
                      className={`cursor-pointer transition hover:bg-teal-50/50 ${
                        isChecked ? 'bg-teal-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(emp.id)}
                          className="rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-2 text-center font-mono text-slate-400 font-semibold">
                        {emp.num}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{emp.fio}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {emp.snils || 'СНИЛС не указан'}
                          {emp.birthDate ? ` • ${emp.birthDate}` : ''}
                        </div>
                      </td>

                      {/* Селектор пола */}
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={isFemale ? 'ж' : 'м'}
                          onChange={(e) =>
                            handleQuickGenderChange(emp.id, e.target.value as 'м' | 'ж')
                          }
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border focus:ring-0 cursor-pointer ${
                            isFemale
                              ? 'bg-pink-50 text-pink-700 border-pink-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <option value="м">м</option>
                          <option value="ж">ж</option>
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{emp.post}</div>
                        <div className="text-[11px] text-slate-500">{emp.dept}</div>
                      </td>

                      {/* Селектор класса вредности СОУТ */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={eligibility.effectiveSoutClass}
                          onChange={(e) =>
                            handleQuickSoutClassChange(emp.id, e.target.value as SoutClassType)
                          }
                          className={`text-xs font-bold px-2 py-0.5 rounded-md border cursor-pointer focus:ring-0 ${
                            isHarmful
                              ? 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3.1">3.1</option>
                          <option value="3.2">3.2</option>
                          <option value="3.3">3.3</option>
                          <option value="3.4">3.4</option>
                          <option value="4">4</option>
                        </select>
                      </td>

                      <td className="py-3 px-3 text-center font-medium text-slate-700">
                        <span className={eligibility.jobYears >= 5 ? 'font-bold text-rose-700' : ''}>
                          {eligibility.jobYears} г.
                        </span>
                      </td>

                      {/* Вредные факторы с индикацией 1 год / 2 года */}
                      <td className="py-3 px-4">
                        {currentExamType !== 'предварительный' && factorCalc.excluded2YearCodes.length > 0 ? (
                          <div className="space-y-1">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-800 inline-block">
                              {factorCalc.effectiveFactorsText || '—'}
                            </span>
                            <div className="text-[10px] text-amber-700 flex items-center gap-1">
                              <History className="w-3 h-3 text-amber-600" />
                              Пропуск через год: {factorCalc.excluded2YearCodes.join(', ')}
                            </div>
                          </div>
                        ) : eligibility.factors ? (
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">
                            {eligibility.factors}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {isPreliminary && (
                        <td className="py-3 px-3">
                          {hasPso ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                              {eligibility.psychiatry}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">нет</span>
                          )}
                        </td>
                      )}

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                              isChecked
                                ? isProfpathology
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isProfpathology ? 'Центр ПП' : 'МО'}
                          </span>
                          {isPreliminary && hasPso && (
                            <span
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                                isChecked
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              ПСО
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditingEmp({ ...emp })}
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-md transition"
                          title="Редактировать факторы и стаж"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ФАКТОРОВ И ПРОЙДЕННЫХ В ПРОШЛОМ ГОДУ */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-600" />
                Параметры медосмотра: {editingEmp.fio}
              </h3>
              <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmpEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Пол:</label>
                  <select
                    value={editingEmp.gender === 'жен' || editingEmp.gender === 'ж' ? 'ж' : 'м'}
                    onChange={(e) => setEditingEmp({ ...editingEmp, gender: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="м">Мужской (м)</option>
                    <option value="ж">Женский (ж)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Класс условий труда по СОУТ:
                  </label>
                  <select
                    value={editingEmp.soutClass || '2'}
                    onChange={(e) =>
                      setEditingEmp({
                        ...editingEmp,
                        soutClass: e.target.value as SoutClassType,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="1">1 (Оптимальный)</option>
                    <option value="2">2 (Допустимый)</option>
                    <option value="3.1">3.1 (Вредный 1 ст.)</option>
                    <option value="3.2">3.2 (Вредный 2 ст.)</option>
                    <option value="3.3">3.3 (Вредный 3 ст.)</option>
                    <option value="3.4">3.4 (Вредный 4 ст.)</option>
                    <option value="4">4 (Опасный)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Дата приёма:</label>
                  <input
                    type="text"
                    value={editingEmp.hireDate}
                    onChange={(e) => setEditingEmp({ ...editingEmp, hireDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Стаж в должности (лет):</label>
                  <input
                    type="text"
                    value={editingEmp.experience || '1'}
                    onChange={(e) => setEditingEmp({ ...editingEmp, experience: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Индивидуальные факторы вредности (29н):
                </label>
                <input
                  type="text"
                  value={editingEmp.factors29n}
                  onChange={(e) => setEditingEmp({ ...editingEmp, factors29n: e.target.value })}
                  placeholder="Например: 4.4; 5.1; п. 9;"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              {/* Учет факторов прошлого года для периодичности 1 раз в 2 года */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                  <History className="w-4 h-4 text-amber-700" />
                  Учет факторов, пройденных в прошлом году (периодичность 1 раз в 2 года):
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Отметьте факторы, по которым сотрудник прошел медосмотр в прошлом году. Эти факторы будут автоматически исключены из направления в текущем году.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(editingEmp.factors29n || jobDirectory.find((j) => j.post === editingEmp.post)?.factors || '')
                    .split(';')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((code) => {
                      const isCompleted = (editingEmp.harmFactorsCompletedLastYear || []).includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => toggleFactorCompletedLastYear(code)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{code}</span>
                          {isCompleted ? <span>(Пройден в прошлом году)</span> : <span>(Включать в этом году)</span>}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
