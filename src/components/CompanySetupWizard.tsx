import React, { useMemo, useState } from 'react';
import { Employee, JobDirectoryItem, SoutWorkplace } from '../lib/types';
import {
  Users,
  UserPlus,
  FileText,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Building2,
  ShieldCheck,
} from 'lucide-react';

/**
 * D3: Пошаговый мастер создания компании.
 * Штатное расписание (контингент) — МАТЕРИНСКИЙ файл: сначала создаются должности,
 * затем поимённый список сотрудников связывается с должностями, затем — карты СОУТ.
 * Данные, введённые здесь, во остальных формах доступны только read-only.
 */

export interface CompanySetupResult {
  jobs: JobDirectoryItem[];
  employees: Employee[];
  soutCards: SoutWorkplace[];
}

interface CompanySetupWizardProps {
  isOpen: boolean;
  companyName: string;
  companyId: string; // новый id компании (ещё не выбран как активный)
  onCancel: () => void;
  onComplete: (result: CompanySetupResult) => void;
}

interface DraftJob {
  dept: string;
  post: string;
}

interface DraftEmployee {
  fio: string;
  dept: string;
  post: string;
  gender: 'м' | 'ж';
  hireDate: string;
}

interface DraftSout {
  jobIndex: number; // ссылка на должность из шага 1
  cardDocNumber: string;
  approvalDate: string;
}

const todayRu = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const plus5YearsRu = (ddmmmyyyy: string): string => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(ddmmmyyyy.trim());
  if (!m) return '';
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  d.setFullYear(d.getFullYear() + 5);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export const CompanySetupWizard: React.FC<CompanySetupWizardProps> = ({
  isOpen,
  companyName,
  companyId,
  onCancel,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Шаг 1 — штатное расписание (материнский файл)
  const [draftJobs, setDraftJobs] = useState<DraftJob[]>([{ dept: '', post: '' }]);

  // Шаг 2 — поимённый список
  const [draftEmployees, setDraftEmployees] = useState<DraftEmployee[]>([]);

  // Шаг 3 — карты СОУТ (по одной на каждую должность)
  const [draftSout, setDraftSout] = useState<DraftSout[]>([]);

  const validJobs = useMemo(
    () => draftJobs.filter((j) => j.post.trim() !== ''),
    [draftJobs]
  );

  const departments = useMemo(() => {
    const s = new Set<string>();
    validJobs.forEach((j) => j.dept.trim() && s.add(j.dept.trim()));
    return Array.from(s);
  }, [validJobs]);

  const openStep2 = () => {
    // Связать сотрудников с должностями: при добавлении выбираем post из материнского файла
    setDraftEmployees((prev) =>
      prev.length > 0
        ? prev
        : [{ fio: '', dept: validJobs[0]?.dept || '', post: validJobs[0]?.post || '', gender: 'м', hireDate: todayRu() }]
    );
    setStep(2);
  };

  const openStep3 = () => {
    setDraftSout(
      validJobs.map((_, i) => ({
        jobIndex: i,
        cardDocNumber: `Карта № ${i + 1}`,
        approvalDate: todayRu(),
      }))
    );
    setStep(3);
  };

  const handleFinish = () => {
    const jobs: JobDirectoryItem[] = validJobs.map((j, i) => ({
      id: `job-${companyId}-${Date.now()}-${i}`,
      companyId,
      dept: j.dept.trim(),
      status: 'ИТР',
      post: j.post.trim(),
      electricalSafety: 'нет',
      instructionProgram: '',
      internshipProgram: '',
      factors: '',
      psychiatry: '',
      instructionDoc: '',
      sout: `Карта № ${i + 1}`,
      soutClass: '2',
      opr: '',
      factorsConfig: [],
      psychiatryPoints: [],
    }));

    const employees: Employee[] = draftEmployees
      .filter((e) => e.fio.trim() !== '')
      .map((e, idx) => ({
        id: `emp-${companyId}-${Date.now()}-${idx}`,
        num: String(idx + 1).padStart(2, '0'),
        fio: e.fio.trim(),
        dept: e.dept.trim(),
        post: e.post.trim(),
        hireDate: e.hireDate.trim(),
        birthDate: '',
        boss: '',
        needGeneration: true,
        snils: '',
        phone: '',
        gender: e.gender,
        experience: '1',
        disability: 'нет',
        under18: 'нет',
        plannedMedicalDate: '',
        actualMedicalDate: '',
        harmFactorsCompletedLastYear: [],
        companyId,
      }));

    const soutCards: SoutWorkplace[] = draftSout.map((s, i) => {
      const job = validJobs[s.jobIndex];
      return {
        id: `sout-${companyId}-${Date.now()}-${i}`,
        companyId,
        workplaceNumber: String(i + 1),
        dept: job?.dept || '',
        post: job?.post || '',
        employeesCount: employees.filter((e) => e.post === (job?.post || '')).length,
        soutClass: '2',
        cardDocNumber: s.cardDocNumber.trim() || `Карта № ${i + 1}`,
        approvalDate: s.approvalDate.trim() || todayRu(),
        expiryDate: plus5YearsRu(s.approvalDate.trim() || todayRu()),
        isDeclared: true,
        declarationNumber: '',
        declarationDate: '',
        identifiedHarmFactors: 'Не идентифицированы (допустимые условия)',
        guaranteesAndCompensations: 'Не положены',
      };
    });

    onComplete({ jobs, employees, soutCards });
  };

  if (!isOpen) return null;

  const stepDefs = [
    { n: 1, title: 'Штатное расписание', icon: Users },
    { n: 2, title: 'Поимённый список', icon: UserPlus },
    { n: 3, title: 'Карты СОУТ', icon: FileText },
    { n: 4, title: 'Готово', icon: CheckCircle2 },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Шапка */}
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-800">
              Настройка компании «{companyName}»
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {stepDefs.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.n;
              const active = step === s.n;
              return (
                <React.Fragment key={s.n}>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : done
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{s.title}</span>
                  </div>
                  {i < stepDefs.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Контент шагов */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 && (
            <div>
              <p className="text-xs text-slate-600 mb-3">
                <ShieldCheck className="w-4 h-4 inline text-indigo-600 mr-1" />
                Штатное расписание — <strong>материнский файл</strong>. Все остальные таблицы
                (сотрудники, медосмотры, СОУТ, инструктажи) читают эти данные и не позволяют их
                менять в других формах. Укажите подразделения и должности.
              </p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600">
                    <th className="py-2 px-2 border border-slate-200 font-bold w-1/3">Подразделение</th>
                    <th className="py-2 px-2 border border-slate-200 font-bold">Должность / профессия</th>
                    <th className="py-2 px-2 border border-slate-200 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {draftJobs.map((j, i) => (
                    <tr key={i}>
                      <td className="border border-slate-200 p-1">
                        <input
                          type="text"
                          list={`dept-list-${i}`}
                          value={j.dept}
                          onChange={(e) =>
                            setDraftJobs(draftJobs.map((x, xi) => (xi === i ? { ...x, dept: e.target.value } : x)))
                          }
                          placeholder="Напр.: АУП, Цех №1"
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        />
                        <datalist id={`dept-list-${i}`}>
                          {departments.map((d) => (
                            <option key={d} value={d} />
                          ))}
                        </datalist>
                      </td>
                      <td className="border border-slate-200 p-1">
                        <input
                          type="text"
                          value={j.post}
                          onChange={(e) =>
                            setDraftJobs(draftJobs.map((x, xi) => (xi === i ? { ...x, post: e.target.value } : x)))
                          }
                          placeholder="Напр.: Электрик"
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="border border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={() => setDraftJobs(draftJobs.filter((_, xi) => xi !== i))}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          title="Удалить строку"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => setDraftJobs([...draftJobs, { dept: '', post: '' }])}
                className="mt-2 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
              >
                + Добавить должность
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-xs text-slate-600 mb-3">
                Поимённый список сотрудников. Должность и подразделение выбираются{' '}
                <strong>только из штатного расписания</strong> (шаг 1) — связь выполняется по ним.
              </p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600">
                    <th className="py-2 px-2 border border-slate-200 font-bold">ФИО</th>
                    <th className="py-2 px-2 border border-slate-200 font-bold w-28">Подразд.</th>
                    <th className="py-2 px-2 border border-slate-200 font-bold">Должность</th>
                    <th className="py-2 px-2 border border-slate-200 font-bold w-20">Пол</th>
                    <th className="py-2 px-2 border border-slate-200 font-bold w-28">Приём</th>
                    <th className="py-2 px-2 border border-slate-200 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {draftEmployees.map((e, i) => (
                    <tr key={i}>
                      <td className="border border-slate-200 p-1">
                        <input
                          type="text"
                          value={e.fio}
                          onChange={(ev) =>
                            setDraftEmployees(
                              draftEmployees.map((x, xi) => (xi === i ? { ...x, fio: ev.target.value } : x))
                            )
                          }
                          placeholder="Иванов Иван Иванович"
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="border border-slate-200 p-1">
                        <select
                          value={e.dept}
                          onChange={(ev) => {
                            const dept = ev.target.value;
                            const firstPost = validJobs.find((j) => j.dept === dept)?.post || e.post;
                            setDraftEmployees(
                              draftEmployees.map((x, xi) =>
                                xi === i ? { ...x, dept, post: firstPost } : x
                              )
                            );
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                        >
                          {departments.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-slate-200 p-1">
                        <select
                          value={e.post}
                          onChange={(ev) =>
                            setDraftEmployees(
                              draftEmployees.map((x, xi) => (xi === i ? { ...x, post: ev.target.value } : x))
                            )
                          }
                          className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                        >
                          {validJobs
                            .filter((j) => !e.dept || j.dept === e.dept)
                            .map((j) => (
                              <option key={j.post} value={j.post}>{j.post}</option>
                            ))}
                        </select>
                      </td>
                      <td className="border border-slate-200 p-1">
                        <select
                          value={e.gender}
                          onChange={(ev) =>
                            setDraftEmployees(
                              draftEmployees.map((x, xi) =>
                                xi === i ? { ...x, gender: ev.target.value as 'м' | 'ж' } : x
                              )
                            )
                          }
                          className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="м">Мужской</option>
                          <option value="ж">Женский</option>
                        </select>
                      </td>
                      <td className="border border-slate-200 p-1">
                        <input
                          type="text"
                          value={e.hireDate}
                          onChange={(ev) =>
                            setDraftEmployees(
                              draftEmployees.map((x, xi) => (xi === i ? { ...x, hireDate: ev.target.value } : x))
                            )
                          }
                          placeholder="ДД.ММ.ГГГГ"
                          className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono"
                        />
                      </td>
                      <td className="border border-slate-200 text-center">
                        <button
                          type="button"
                          onClick={() => setDraftEmployees(draftEmployees.filter((_, xi) => xi !== i))}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() =>
                  setDraftEmployees([
                    ...draftEmployees,
                    {
                      fio: '',
                      dept: validJobs[0]?.dept || '',
                      post: validJobs[0]?.post || '',
                      gender: 'м',
                      hireDate: todayRu(),
                    },
                  ])
                }
                className="mt-2 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
              >
                + Добавить сотрудника
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-xs text-slate-600 mb-3">
                Карта СОУТ на каждую должность штатного расписания. Позже любую карту можно будет
                заменить загруженным файлом вкладки «СОУТ». Класс условий труда по умолчанию — 2;
                факторы и класс редактируются в контингенте.
              </p>
              <div className="space-y-2">
                {draftSout.map((s, i) => {
                  const job = validJobs[s.jobIndex];
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs items-center"
                    >
                      <div className="font-bold text-slate-700 truncate" title={`${job?.dept} — ${job?.post}`}>
                        {job?.dept ? `${job.dept}: ` : ''}
                        {job?.post}
                      </div>
                      <input
                        type="text"
                        value={s.cardDocNumber}
                        onChange={(e) =>
                          setDraftSout(
                            draftSout.map((x, xi) => (xi === i ? { ...x, cardDocNumber: e.target.value } : x))
                          )
                        }
                        placeholder="Номер карты"
                        className="p-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                      <input
                        type="text"
                        value={s.approvalDate}
                        onChange={(e) =>
                          setDraftSout(
                            draftSout.map((x, xi) => (xi === i ? { ...x, approvalDate: e.target.value } : x))
                          )
                        }
                        placeholder="Дата утверждения ДД.ММ.ГГГГ"
                        className="p-1.5 border border-slate-300 rounded bg-white text-xs font-mono"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-slate-800 mb-2">Проверьте итог</h3>
              <p className="text-xs text-slate-600">
                Будет создано: должностей — <strong>{validJobs.length}</strong>, сотрудников —{' '}
                <strong>{draftEmployees.filter((e) => e.fio.trim()).length}</strong>, карт СОУТ —{' '}
                <strong>{draftSout.length}</strong>. Все записи будут привязаны к компании
                «{companyName}».
              </p>
            </div>
          )}
        </div>

        {/* Футер навигации */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={() => (step === 1 ? onCancel() : setStep((step - 1) as 1 | 2 | 3 | 4))}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {step === 1 ? 'Отмена' : 'Назад'}
          </button>

          {step < 4 ? (
            <button
              type="button"
              disabled={(step === 1 && validJobs.length === 0)}
              onClick={() => {
                if (step === 1) openStep2();
                else if (step === 2) openStep3();
                else setStep(4);
              }}
              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1"
            >
              Далее <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Создать компанию
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
