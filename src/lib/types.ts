export type EmployeeCategory = 'ИТР' | 'Рабочий' | 'Офис';
export type ExamType = 'предварительный' | 'периодический' | 'профпатология';
export type DateMode = 'current' | 'custom' | 'open';
export type SoutClassType = '1' | '2' | '3.1' | '3.2' | '3.3' | '3.4' | '4';

export interface DateConfig {
  mode: DateMode;
  customDate: string; // "DD.MM.YYYY"
}

export interface HarmFactorConfig {
  code: string;
  name?: string;
  periodicity: '1 раз в год' | '1 раз в 2 года';
}

export interface Employee {
  id: string;
  num: string; // "01", "02"
  fio: string;
  dept: string;
  post: string;
  hireDate: string; // DD.MM.YYYY
  birthDate: string; // DD.MM.YYYY
  boss: string;
  needGeneration?: boolean;
  snils: string;
  phone: string;
  gender: 'м' | 'ж'; // Строго 'м' | 'ж'. В UI отображается как «Мужской/Женский»
  experience: string; // стаж полных лет
  /** @deprecated Устарело: факторы 29н берутся из JobDirectoryItem.factorsConfig (контингент). Не использовать. */
  factors29n?: string;
  /** @deprecated Устарело: периодичность живёт только в HarmFactorConfig.periodicity. Не использовать. */
  periodicity?: string;
  disability: string; // "нет"
  under18: string; // "нет"
  plannedMedicalDate: string; // Плановая дата медосмотра (ДД.ММ.ГГГГ)
  actualMedicalDate: string; // Фактическая дата медосмотра (ДД.ММ.ГГГГ)
  /** @deprecated Устарело: психиатрия 342н берётся из JobDirectoryItem.psychiatryPoints (контингент). Не использовать. */
  pso342n?: string;
  medicalStatus?: 'scheduled' | 'completed' | 'expired' | 'pending';
  medicalConclusion?: string; // Заключение или примечание
  /** @deprecated Устарело: класс СОУТ НЕЛЬЗЯ переопределять в карточке сотрудника — только из контингента (jobDirectory). Не использовать. */
  soutClass?: SoutClassType | string;
  /** @deprecated Устарело: номер карты СОУТ берётся из контингента/реестра SoutWorkplace. Не использовать. */
  soutCardNumber?: string;
  harmFactorsCompletedLastYear?: string[]; // Факторы, пройденные в прошлом году (для фильтрации 1 раз в 2 года)
  lastHarmCompletedYear?: number;
  companyId?: string; // Привязка к конкретному юрлицу
}

export interface JobDirectoryItem {
  id: string;
  dept: string; // Подразделение
  status: EmployeeCategory;
  post: string;
  electricalSafety: string; // "1 группа", "2 группа", "нет"
  instructionProgram: string;
  internshipProgram: string;
  /** @deprecated Устарело: используйте factorsConfig (набор факторов с периодичностью). Оставлено для обратной совместимости старых данных. */
  factors: string; // вредность (29н) — строковое представление, read-only legacy
  /** @deprecated Устарело: используйте psychiatryPoints (массив пунктов 342н). Оставлено для обратной совместимости старых данных. */
  psychiatry: string; // психиатрия (342н) — строковое представление, read-only legacy
  instructionDoc: string; // Инструкция по ОТ
  sout: string; // Номер карты СОУТ
  soutClass: SoutClassType | string; // Класс условий труда по СОУТ ("1", "2", "3.1", "3.2", "3.3", "3.4", "4")
  opr: string; // Номер карты ОПР (оценка проф. рисков)
  factorsConfig?: HarmFactorConfig[]; // Набор факторов с индивидуальной периодичностью (источник истины)
  psychiatryPoints?: string[]; // Выбранные пункты 342н (источник истины)
  companyId?: string; // Привязка к конкретному юрлицу
}

export interface SoutWorkplace {
  id: string;
  workplaceNumber: string; // Номер рабочего места
  dept: string; // Подразделение
  post: string; // Профессия/должность
  employeesCount: number; // Количество работников на РМ
  soutClass: SoutClassType | string; // Итоговый класс УТ
  cardDocNumber: string; // Номер карты СОУТ
  approvalDate: string; // Дата утверждения отчета СОУТ (ДД.ММ.ГГГГ)
  expiryDate: string; // Срок действия (5 лет со дня утверждения)
  isDeclared: boolean; // Задекларированное рабочее место (для допустимых/оптимальных условий)
  declarationNumber?: string; // Номер декларации соответствия условий труда в ГИТ
  declarationDate?: string; // Дата подачи декларации
  identifiedHarmFactors: string; // Идентифицированные вредные факторы
  guaranteesAndCompensations: string; // Гарантии (доплата 4%, отпуск 7 дней, сокращенная неделя 36ч, молоко)
  snilsList?: string; // СНИЛС работников
  companyId?: string; // Привязка к конкретному юрлицу
}

export interface CompanySettings {
  companyName: string;
  executivePost: string;
  executiveFIO: string;
  directorPost: string;
  directorFIO: string;
  legalAddress: string;
  actualAddress: string;
  ogrn: string;
  inn: string;
  okved: string;
  lastMedicalDate: string;
  profpathologyCenterDate: string;
  orderNumber: string;
  year: number;
  examType: ExamType;
}

export interface CompanyItem {
  id: string;
  name: string;
  inn: string;
  ogrn: string;
  settings: CompanySettings;
  createdAt?: string;
}

export interface CustomTag {
  tag: string;
  label: string;
  defaultValue?: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  fileName: string;
  category: 'instructions' | 'directions' | 'common';
  description: string;
  tags: string[];
  isCustom?: boolean;
  fileBuffer?: ArrayBuffer;
  dateConfig?: DateConfig;
  customTags?: CustomTag[];
}

export interface GeneratedDocItem {
  name: string;
  folder: 'инструктажи' | 'Направления' | 'готовые_направления';
  templateName: string;
  employeeFio: string;
  blob: Blob;
  size: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  scenario: 'instructions' | 'directions';
  filesCount: number;
  employeesCount: number;
  files: { name: string; folder: string; size: number }[];
  warnings: string[];
}
