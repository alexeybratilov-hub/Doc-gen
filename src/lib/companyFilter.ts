import { Employee, CompanyItem } from './types';

/**
 * Единая функция-фильтр сотрудников по активной компании (стратегия Q3=D, D1/R16).
 * Логика строго повторяет инлайновое правило из EmployeesView.tsx:80–97 и
 * InstructionsView.tsx:93–102:
 *  - если у employee есть companyId — сравнение с activeCompanyId;
 *  - если companyId нет — запись принадлежит первой компании
 *    (companies[0]?.id, фолбэк 'comp-catania', как в существующем коде).
 */
export function filterEmployeesByCompany(
  employees: Employee[],
  activeCompanyId: string,
  companies: CompanyItem[]
): Employee[] {
  if (!Array.isArray(employees)) return [];
  return employees.filter((e) => {
    if (!e) return false;
    if (e.companyId) {
      return e.companyId === activeCompanyId;
    }
    const firstCompId = companies?.[0]?.id || 'comp-catania';
    return activeCompanyId === firstCompId;
  });
}
