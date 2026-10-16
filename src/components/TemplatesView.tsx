import React, { useState, useRef, useMemo } from 'react';
import { CustomTag, TemplateItem } from '../lib/types';
import { generateBuiltInTemplateDocx } from '../lib/docxEngine';
import {
  FileCode,
  Upload,
  Download,
  Check,
  AlertCircle,
  FileText,
  Tag,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
} from 'lucide-react';

interface TemplatesViewProps {
  templates: TemplateItem[];
  onUpdateTemplates: (updated: TemplateItem[]) => void;
}

type SortField = 'name' | 'category' | 'isCustom';
type SortOrder = 'asc' | 'desc';

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onUpdateTemplates,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetTplIdRef = useRef<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'instructions' | 'directions' | 'common'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Редактирование существующего шаблона
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [editTagsString, setEditTagsString] = useState('');

  // Создание нового шаблона
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplFileName, setNewTplFileName] = useState('');
  const [newTplCategory, setNewTplCategory] = useState<'instructions' | 'directions' | 'common'>('instructions');
  const [newTplDesc, setNewTplDesc] = useState('');
  const [newTplTags, setNewTplTags] = useState('{{№}}, {{ФИО}}, {{должность}}, {{подразделение}}, {{дата}}');

  // Добавление пользовательского тега
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagDefault, setNewTagDefault] = useState('');
  const [selectedTplForTag, setSelectedTplForTag] = useState<string>('all');

  // Уведомление о копировании тега
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleUploadClick = (tplId: string) => {
    targetTplIdRef.current = tplId;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const tplId = targetTplIdRef.current;
    if (!file || !tplId) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Пожалуйста, выберите файл в формате Microsoft Word (.docx)');
      return;
    }

    const buffer = await file.arrayBuffer();

    onUpdateTemplates(
      templates.map((t) =>
        t.id === tplId
          ? {
              ...t,
              isCustom: true,
              fileBuffer: buffer,
              fileName: file.name,
            }
          : t
      )
    );

    alert(`Шаблон успешно обновлён из файла: ${file.name}`);
  };

  const handleResetToBuiltin = (tplId: string) => {
    if (!confirm('Сбросить шаблон к эталонному встроенному состоянию?')) return;
    onUpdateTemplates(
      templates.map((t) =>
        t.id === tplId
          ? {
              ...t,
              isCustom: false,
              fileBuffer: undefined,
            }
          : t
      )
    );
  };

  const handleDownloadTemplate = async (tpl: TemplateItem) => {
    let bytes: Uint8Array;
    if (tpl.fileBuffer) {
      bytes = new Uint8Array(tpl.fileBuffer);
    } else {
      bytes = await generateBuiltInTemplateDocx(tpl.name, tpl.description);
    }

    const blob = new Blob([bytes as any], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tpl.fileName.endsWith('.docx') ? tpl.fileName : `${tpl.fileName}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Копирование тега
  const copyToClipboard = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  // Редактирование шаблона
  const handleOpenEdit = (tpl: TemplateItem) => {
    setEditingTemplate({ ...tpl });
    setEditTagsString(tpl.tags.join(', '));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const parsedTags = editTagsString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('{{') && t.endsWith('}}') ? t : `{{${t.replace(/[{}]/g, '')}}}`));

    onUpdateTemplates(
      templates.map((t) =>
        t.id === editingTemplate.id
          ? {
              ...editingTemplate,
              tags: parsedTags,
            }
          : t
      )
    );

    setEditingTemplate(null);
  };

  // Создание нового шаблона
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim()) return;

    const fileName = newTplFileName.trim()
      ? newTplFileName.endsWith('.docx')
        ? newTplFileName
        : `${newTplFileName}.docx`
      : `${newTplName.trim()}.docx`;

    const parsedTags = newTplTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('{{') && t.endsWith('}}') ? t : `{{${t.replace(/[{}]/g, '')}}}`));

    const newTpl: TemplateItem = {
      id: `tpl-custom-${Date.now()}`,
      name: newTplName.trim(),
      fileName,
      category: newTplCategory,
      description: newTplDesc.trim() || 'Пользовательский шаблон документа',
      tags: parsedTags,
      isCustom: true,
    };

    onUpdateTemplates([...templates, newTpl]);
    setIsCreatingTemplate(false);
    setNewTplName('');
    setNewTplFileName('');
    setNewTplDesc('');
  };

  // Добавление тега
  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    const formattedTag = newTagName.startsWith('{{') && newTagName.endsWith('}}')
      ? newTagName
      : `{{${newTagName.replace(/[{}]/g, '').trim()}}}`;

    const newCustomTag: CustomTag = {
      tag: formattedTag,
      label: newTagLabel.trim() || formattedTag,
      defaultValue: newTagDefault.trim(),
    };

    const updated = templates.map((tpl) => {
      if (selectedTplForTag === 'all' || tpl.id === selectedTplForTag) {
        const existingTags = tpl.tags || [];
        const customTags = tpl.customTags || [];
        return {
          ...tpl,
          tags: existingTags.includes(formattedTag) ? existingTags : [...existingTags, formattedTag],
          customTags: customTags.some((ct) => ct.tag === formattedTag)
            ? customTags
            : [...customTags, newCustomTag],
        };
      }
      return tpl;
    });

    onUpdateTemplates(updated);
    setIsAddingCustomTag(false);
    setNewTagName('');
    setNewTagLabel('');
    setNewTagDefault('');
    alert(`Тег ${formattedTag} успешно добавлен и доступен для использования!`);
  };

  // Удаление пользовательского шаблона
  const handleDeleteTemplate = (id: string, name: string) => {
    if (!confirm(`Удалить шаблон «${name}»?`)) return;
    onUpdateTemplates(templates.filter((t) => t.id !== id));
  };

  // Фильтрация и сортировка шаблонов
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (categoryFilter !== 'all' && tpl.category !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = tpl.name.toLowerCase().includes(term);
        const matchesDesc = tpl.description.toLowerCase().includes(term);
        const matchesTags = tpl.tags.some((tag) => tag.toLowerCase().includes(term));
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }
      return true;
    });
  }, [templates, categoryFilter, searchTerm]);

  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => {
      let compareVal = 0;
      if (sortField === 'name') {
        compareVal = a.name.localeCompare(b.name);
      } else if (sortField === 'category') {
        compareVal = a.category.localeCompare(b.category);
      } else if (sortField === 'isCustom') {
        compareVal = (a.isCustom ? 1 : 0) - (b.isCustom ? 1 : 0);
      }
      return sortOrder === 'asc' ? compareVal : -compareVal;
    });
  }, [filteredTemplates, sortField, sortOrder]);

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
      <ArrowUp className="w-3.5 h-3.5 text-indigo-600 inline ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-600 inline ml-1" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Скрытый input для загрузки docx */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".docx"
        className="hidden"
      />

      {/* Шапка */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <FileCode className="w-4 h-4" />
            Управление шаблонами документов • Формат DOCX
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Шаблоны документов, редактирование описаний и разметка тегов
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Редактируйте наименования и описания шаблонов, добавляйте собственные теги и загружайте корпоративные бланки Word (.docx).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddingCustomTag(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Tag className="w-4 h-4 text-indigo-300" />
            Добавить свой тег
          </button>

          <button
            onClick={() => setIsCreatingTemplate(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Создать шаблон
          </button>
        </div>
      </div>

      {/* Панель фильтрации и поиска */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Поиск по названию, тегам или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Все ({templates.length})
            </button>
            <button
              onClick={() => setCategoryFilter('instructions')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                categoryFilter === 'instructions'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Инструктажи
            </button>
            <button
              onClick={() => setCategoryFilter('directions')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                categoryFilter === 'directions'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Медосмотры
            </button>
            <button
              onClick={() => setCategoryFilter('common')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                categoryFilter === 'common'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Общие
            </button>
          </div>
        </div>

        {/* Сортировка */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Сортировка:</span>
          <button
            onClick={() => handleHeaderSort('name')}
            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700 flex items-center"
          >
            По названию {renderSortIcon('name')}
          </button>
          <button
            onClick={() => handleHeaderSort('category')}
            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700 flex items-center"
          >
            По категории {renderSortIcon('category')}
          </button>
        </div>
      </div>

      {/* Список шаблонов */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      {tpl.name}
                      <button
                        onClick={() => handleOpenEdit(tpl)}
                        className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition"
                        title="Редактировать описание и теги"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </h3>
                    <div className="text-[11px] font-mono text-slate-400">{tpl.fileName}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {tpl.isCustom ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Пользовательский
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      Встроенный эталон
                    </span>
                  )}
                  {tpl.id.startsWith('tpl-custom-') && (
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      title="Удалить пользовательский шаблон"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">{tpl.description}</p>

              <div className="mt-3.5">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Используемые теги (кликните для копирования):
                  </span>
                  {copiedTag && (
                    <span className="text-emerald-600 text-[10px] lowercase font-normal">
                      ✓ скопировано: {copiedTag}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {tpl.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => copyToClipboard(tag)}
                      className="px-1.5 py-0.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 rounded-sm font-mono text-[10px] transition cursor-pointer flex items-center gap-1"
                      title="Нажмите, чтобы скопировать тег"
                    >
                      <span>{tag}</span>
                      <Copy className="w-2.5 h-2.5 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
              <button
                onClick={() => handleDownloadTemplate(tpl)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                title="Скачать файл шаблона"
              >
                <Download className="w-3.5 h-3.5" />
                Скачать DOCX
              </button>

              <div className="flex items-center gap-1.5">
                {tpl.isCustom && !tpl.id.startsWith('tpl-custom-') && (
                  <button
                    onClick={() => handleResetToBuiltin(tpl.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
                    title="Сбросить к исходному эталону"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleUploadClick(tpl.id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Загрузить свой DOCX
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Реестр тегов */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-400" />
              Реестр тегов автоподстановки для шаблонов Word:
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Кликните на любой тег, чтобы скопировать его в буфер обмена для вставки в Word (.docx).
            </p>
          </div>
          <button
            onClick={() => setIsAddingCustomTag(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить свой тег
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
          {[
            { tag: '{{№}}', desc: 'Порядковый номер записи (01, 02...)' },
            { tag: '{{ФИО}}', desc: 'Фамилия Имя Отчество сотрудника' },
            { tag: '{{подразделение}}', desc: 'Структурное подразделение' },
            { tag: '{{должность}}', desc: 'Профессия / должность сотрудника' },
            { tag: '{{прием}}', desc: 'Дата приёма на работу (ДД.ММ.ГГГГ)' },
            { tag: '{{ДР}}', desc: 'Дата рождения (ДД.ММ.ГГГГ)' },
            { tag: '{{руководитель}}', desc: 'Непосредственный руководитель' },
            { tag: '{{дата}}', desc: 'Текущая дата генерации документа' },
            { tag: '{{дата_стажировки}}', desc: 'Дата начала стажировки (+1 раб. день)' },
            { tag: '{{программа инструктажа}}', desc: 'Программа инструктажа из ДАННЫЕ' },
            { tag: '{{программа стажировки}}', desc: 'Программа стажировки из ДАННЫЕ' },
            { tag: '{{ФАКТОРЫ}}', desc: 'Пункты вредности по приказу 29н' },
            { tag: '{{СТАЖ}}', desc: 'Стаж работы в организации (лет)' },
            { tag: '{{СНИЛС}}', desc: 'СНИЛС сотрудника' },
            { tag: '{{Инструкция}}', desc: 'Номер инструкции по охране труда' },
            { tag: '{{СОУТ}}', desc: 'Номер карты спецоценки условий труда' },
            { tag: '{{класс_соут}}', desc: 'Класс условий труда по СОУТ' },
            { tag: '{{ОПР}}', desc: 'Номер карты оценки профрисков' },
            { tag: '{{вид_медосмотра}}', desc: 'Предварительный или периодический' },
            { tag: '{{организация}}', desc: 'Наименование и реквизиты работодателя' },
            { tag: '{{руководитель_организации}}', desc: 'ФИО и должность руководителя' },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => copyToClipboard(item.tag)}
              className="bg-slate-800/80 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-700/80 cursor-pointer transition group"
              title="Нажмите для копирования"
            >
              <div className="flex items-center justify-between">
                <span className="text-indigo-400 font-bold group-hover:text-indigo-300">
                  {item.tag}
                </span>
                <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
              </div>
              <div className="font-sans text-[11px] text-slate-300 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно редактирования описания шаблона и тегов */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-600" />
              Редактирование шаблона: {editingTemplate.name}
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Наименование шаблона:</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Имя файла (.docx):</label>
                <input
                  type="text"
                  value={editingTemplate.fileName}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, fileName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Категория:</label>
                <select
                  value={editingTemplate.category}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      category: e.target.value as any,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="instructions">Инструктажи по охране труда</option>
                  <option value="directions">Направления на медосмотр</option>
                  <option value="common">Общие документы</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Подробное описание назначения шаблона:</label>
                <textarea
                  rows={3}
                  value={editingTemplate.description}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Список используемых тегов (через запятую):
                </label>
                <textarea
                  rows={2}
                  value={editTagsString}
                  onChange={(e) => setEditTagsString(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  placeholder="{{ФИО}}, {{должность}}, {{подразделение}}"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs text-slate-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold text-white shadow-xs"
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно создания нового шаблона */}
      {isCreatingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Добавление нового шаблона документа
            </h3>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Краткое название шаблона:</label>
                <input
                  type="text"
                  placeholder="например: Приказ_ОТ или Акт_Выдачи_СИЗ"
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Имя файла шаблона:</label>
                <input
                  type="text"
                  placeholder="например: Приказ_ОТ.docx"
                  value={newTplFileName}
                  onChange={(e) => setNewTplFileName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Категория:</label>
                <select
                  value={newTplCategory}
                  onChange={(e) => setNewTplCategory(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="instructions">Инструктажи по охране труда</option>
                  <option value="directions">Направления на медосмотр</option>
                  <option value="common">Общие документы</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Описание назначения:</label>
                <textarea
                  rows={2}
                  placeholder="Для чего предназначен документ и для кого формируется..."
                  value={newTplDesc}
                  onChange={(e) => setNewTplDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Теги документа (через запятую):</label>
                <input
                  type="text"
                  value={newTplTags}
                  onChange={(e) => setNewTplTags(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreatingTemplate(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs text-slate-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold text-white shadow-xs"
                >
                  Создать шаблон
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно добавления пользовательского тега */}
      {isAddingCustomTag && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-600" />
              Добавление нового тега автоподстановки
            </h3>

            <form onSubmit={handleAddCustomTag} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Имя тега (в фигурных скобках):
                </label>
                <input
                  type="text"
                  placeholder="например: {{номер_приказа}} или {{срок_действия}}"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono text-indigo-600 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Назначение / пояснение тега:</label>
                <input
                  type="text"
                  placeholder="например: Номер распоряжения или приказа"
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Значение по умолчанию (если пусто):</label>
                <input
                  type="text"
                  placeholder="например: — или б/н"
                  value={newTagDefault}
                  onChange={(e) => setNewTagDefault(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Привязать к шаблону:</label>
                <select
                  value={selectedTplForTag}
                  onChange={(e) => setSelectedTplForTag(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="all">Ко всем шаблонам</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.fileName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomTag(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs text-slate-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold text-white shadow-xs"
                >
                  Добавить тег
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
