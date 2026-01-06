import React, { useState, useEffect, useRef } from 'react';
import { Trash2, GripVertical, AlertTriangle, Plus, Columns, Sidebar, Sparkles, ChevronDown, ChevronRight, Maximize2 } from 'lucide-react';
import DynamicRenderer from './DynamicRenderer';
import { parseTemplateSections, swapSections, TemplateSection } from '../utils/templateParser';
import RichTextModal from './RichTextModal';
import LoadingOverlay from './LoadingOverlay';
import ConfirmationModal from './ConfirmationModal';
import { AnimatedButton } from './ui/AnimatedButton';
import { useAnime } from '../hooks/useAnime';

// DnD Kit
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FormEditorProps {
    data: any;
    onChange: (newData: any) => void;
    disabled?: boolean;
}

const CUSTOM_SECTION_TYPES = [
    { id: 'text-list', label: 'Text List', description: 'Simple list' },
    { id: 'detailed', label: 'Detailed Entries', description: 'Title, subtitle, date' },
    { id: 'tags', label: 'Tags/Skills', description: 'Compact items' },
    { id: 'skill-bars', label: 'Progress Bars', description: 'Range sliders' },
];

export default function FormEditor({ data, onChange, disabled }: FormEditorProps) {
    const [activeTab, setActiveTab] = useState<'content' | 'layout'>('content');
    const [showAddSection, setShowAddSection] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState('');
    const [newSectionType, setNewSectionType] = useState('text-list');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basics']));
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'custom_section' | 'item' | 'template_section', index: number, sectionIndex?: number, title?: string, section?: TemplateSection } | null>(null);
    const [isReordering, setIsReordering] = useState(false);

    // Tab Animation Hook
    const { ref: tabLineRef, restart: restartTabLine } = useAnime<HTMLDivElement>({
        width: ['0%', '100%'],
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutExpo'
    }, [activeTab]);

    const handleConfirmDelete = () => {
        if (!deleteConfirm) return;

        if (deleteConfirm.type === 'custom_section') {
            const updated = [...customSections];
            updated.splice(deleteConfirm.index, 1);
            onChange({
                ...data,
                resume_data: { ...resumeData, customSections: updated }
            });
        } else if (deleteConfirm.type === 'item' && deleteConfirm.sectionIndex !== undefined) {
            removeCustomSectionItem(deleteConfirm.sectionIndex, deleteConfirm.index);
        } else if (deleteConfirm.type === 'template_section' && deleteConfirm.section) {
            const { deleteSection } = require('../utils/templateParser');
            const newHtml = deleteSection(data.html_template || '', deleteConfirm.section);
            onChange({ ...data, html_template: newHtml });
        }

        setDeleteConfirm(null);
    };

    if (!data || !data.resume_data) return null;

    const resumeData = data.resume_data;
    const formSchema = data.form_schema || {};

    const toggleSection = (id: string) => {
        const newSet = new Set(expandedSections);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedSections(newSet);
    };

    const updateBasics = (field: string, value: string) => {
        onChange({
            ...data,
            resume_data: {
                ...resumeData,
                basics: { ...resumeData.basics, [field]: value }
            }
        });
    };

    const updateArrayItem = (section: string, index: number, field: string, value: any) => {
        const list = [...(resumeData[section] || [])];
        list[index] = { ...list[index], [field]: value };
        onChange({
            ...data,
            resume_data: { ...resumeData, [section]: list }
        });
    };

    const addItem = (section: string, template: any) => {
        const list = [...(resumeData[section] || []), template];
        onChange({
            ...data,
            resume_data: { ...resumeData, [section]: list }
        });
    };

    const removeItem = (section: string, index: number) => {
        const list = [...(resumeData[section] || [])];
        list.splice(index, 1);
        onChange({
            ...data,
            resume_data: { ...resumeData, [section]: list }
        });
    };

    const customSections = resumeData.customSections || [];

    const addCustomSection = () => {
        if (!newSectionTitle.trim()) return;
        const sectionKey = `custom_${Date.now()} `;
        const typeToUse = newSectionType || 'text-list';

        const newSection = {
            key: sectionKey,
            title: newSectionTitle,
            type: typeToUse,
            items: []
        };
        onChange({
            ...data,
            resume_data: {
                ...resumeData,
                customSections: [...customSections, newSection]
            }
        });
        setNewSectionTitle('');
        setShowAddSection(false);
    };

    const removeCustomSection = (index: number) => {
        setDeleteConfirm({ type: 'custom_section', index, title: customSections[index].title });
    };

    const updateCustomSectionItem = (sectionIndex: number, itemIndex: number, field: string, value: any) => {
        const updated = [...customSections];
        updated[sectionIndex].items[itemIndex] = { ...updated[sectionIndex].items[itemIndex], [field]: value };
        onChange({
            ...data,
            resume_data: { ...resumeData, customSections: updated }
        });
    };

    const addCustomSectionItem = (sectionIndex: number) => {
        const section = customSections[sectionIndex];
        let template: any;
        if (section.type === 'detailed') {
            template = { title: '', subtitle: '', date: '', description: '' };
        } else if (section.type === 'tags' || section.type === 'skill-bars') {
            template = { name: 'New Item', level: 80 };
        } else {
            template = { title: '', description: '' };
        }

        const updated = [...customSections];
        updated[sectionIndex].items = [...(updated[sectionIndex].items || []), template];
        onChange({
            ...data,
            resume_data: { ...resumeData, customSections: updated }
        });
    };

    const removeCustomSectionItem = (sectionIndex: number, itemIndex: number) => {
        const updated = [...customSections];
        if (updated[sectionIndex] && updated[sectionIndex].items) {
            updated[sectionIndex].items.splice(itemIndex, 1);
            onChange({
                ...data,
                resume_data: { ...resumeData, customSections: updated }
            });
        }
    };

    const schemaSections = formSchema.sections || [];

    const normalizeFieldType = (type: string): string => {
        const knownTypes = ['text', 'email', 'tel', 'textarea', 'image', 'url', 'date',
            'slider', 'dots', 'stars', 'rating', 'percentage', 'select'];
        if (knownTypes.includes(type)) return type;

        if (type?.includes('bar') || type?.includes('progress') || type?.includes('gauge') || type?.includes('circle')) {
            return 'slider';
        }
        if (type?.includes('dot') || type?.includes('circle') || type?.includes('bullet')) {
            return 'dots';
        }
        if (type?.includes('star') || type?.includes('heart') || type?.includes('icon')) {
            return 'stars';
        }
        if (type?.includes('select') || type?.includes('dropdown') || type?.includes('choice')) {
            return 'select';
        }
        if (type?.includes('level') || type?.includes('percent') || type?.includes('score')) {
            return 'slider';
        }
        return 'text';
    };

    const createItemFromSchema = (itemSchema: any[]) => {
        const template: any = {};
        (itemSchema || []).forEach((field: any) => {
            const normalizedType = normalizeFieldType(field.type);
            if (['slider', 'dots', 'stars', 'percentage', 'rating'].includes(normalizedType)) {
                template[field.name] = field.default || 80;
            } else if (normalizedType === 'select') {
                template[field.name] = field.options?.[0] || '';
            } else {
                template[field.name] = field.default || '';
            }
        });
        return template;
    };

    const renderDynamicSection = (sectionSchema: any) => {
        const sectionId = sectionSchema.id;
        const items = resumeData[sectionId] || [];
        const isCompact = ['skill-bars', 'skill-dots', 'skill-stars', 'tags'].includes(sectionSchema.type);
        const isExpanded = expandedSections.has(sectionId);

        const levelField = (sectionSchema.item_schema || []).find((f: any) =>
            ['slider', 'dots', 'stars', 'percentage', 'rating'].includes(f.type)
        );

        return (
            <Section
                key={sectionId}
                title={sectionSchema.title}
                isExpanded={isExpanded}
                onToggle={() => toggleSection(sectionId)}
                onAdd={sectionSchema.canAddMore !== false ? () => addItem(sectionId, createItemFromSchema(sectionSchema.item_schema)) : undefined}
                count={items.length}
            >
                {isCompact ? (
                    <div className="space-y-2">
                        {items.map((item: any, index: number) => {
                            const textField = (sectionSchema.item_schema || []).find((f: any) =>
                                !['slider', 'dots', 'stars', 'percentage', 'rating', 'image'].includes(f.type)
                            ) || { name: 'name' };

                            const textKey = textField.name;
                            const levelKey = levelField?.name || 'level';

                            return (
                                <div key={index} className="flex items-center gap-2 p-2 bg-[var(--bg-root)] border border-[var(--border-dim)] rounded-sm">
                                    <input
                                        className="input-tech flex-1 h-8 px-2 min-w-0"
                                        value={item[textKey] || ''}
                                        onChange={(e) => updateArrayItem(sectionId, index, textKey, e.target.value)}
                                        placeholder={textField.label || "Name"}
                                    />
                                    {levelField?.render ? (
                                        <DynamicRenderer
                                            config={levelField.render}
                                            data={item}
                                            onChange={(field, value) => updateArrayItem(sectionId, index, field, value)}
                                        />
                                    ) : levelField?.type === 'dots' ? (
                                        <DotRating
                                            value={item[levelKey] || 0}
                                            onChange={(v: number) => updateArrayItem(sectionId, index, levelKey, v)}
                                            maxDots={levelField.maxDots || 5}
                                            filledColor={levelField.filledColor}
                                            emptyColor={levelField.emptyColor}
                                        />
                                    ) : levelField?.type === 'stars' ? (
                                        <StarRating
                                            value={item[levelKey] || 0}
                                            onChange={(v: number) => updateArrayItem(sectionId, index, levelKey, v)}
                                            maxStars={levelField.maxStars || 5}
                                            color={levelField.color}
                                        />
                                    ) : item[levelKey] !== undefined && (
                                        <div className="flex items-center gap-2 w-32 shrink-0">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={item[levelKey] || 0}
                                                onChange={(e) => updateArrayItem(sectionId, index, levelKey, parseInt(e.target.value))}
                                                className="w-full accent-[var(--text-main)]"
                                            />
                                            <span className="font-mono text-xs text-[var(--text-muted)] w-8 text-right">{item[levelKey]}%</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removeItem(sectionId, index)}
                                        className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-error)] transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item: any, index: number) => (
                            <div
                                key={index}
                                className="p-4 bg-[var(--bg-root)] border border-[var(--border-dim)] rounded-sm"
                            >
                                <div className="flex justify-between items-center mb-4 border-b border-[var(--border-dim)] pb-2">
                                    <span className="mono-label">ENTRY #{index + 1}</span>
                                    <button onClick={() => removeItem(sectionId, index)} className="text-[var(--text-muted)] hover:text-[var(--accent-error)]">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {(sectionSchema.item_schema || []).map((fieldSchema: any) => {
                                        if (fieldSchema.render) {
                                            return (
                                                <div key={fieldSchema.name} className="space-y-1">
                                                    {fieldSchema.label && <label className="mono-label block">{fieldSchema.label}</label>}
                                                    <DynamicRenderer
                                                        config={fieldSchema.render}
                                                        data={item}
                                                        onChange={(field, value) => updateArrayItem(sectionId, index, field, value)}
                                                    />
                                                </div>
                                            );
                                        }

                                        const normalizedType = normalizeFieldType(fieldSchema.type);
                                        return (
                                            <div key={fieldSchema.name}>
                                                {normalizedType === 'textarea' ? (
                                                    <TextArea
                                                        label={fieldSchema.label}
                                                        value={item[fieldSchema.name] || ''}
                                                        onChange={(v: string) => updateArrayItem(sectionId, index, fieldSchema.name, v)}
                                                    />
                                                ) : normalizedType === 'dots' ? (
                                                    <div className="space-y-1">
                                                        <label className="mono-label block">{fieldSchema.label}</label>
                                                        <DotRating
                                                            value={item[fieldSchema.name] || 0}
                                                            onChange={(v: number) => updateArrayItem(sectionId, index, fieldSchema.name, v)}
                                                            maxDots={fieldSchema.maxDots || 5}
                                                            filledColor={fieldSchema.filledColor}
                                                            emptyColor={fieldSchema.emptyColor}
                                                        />
                                                    </div>
                                                ) : normalizedType === 'stars' ? (
                                                    <div className="space-y-1">
                                                        <label className="mono-label block">{fieldSchema.label}</label>
                                                        <StarRating
                                                            value={item[fieldSchema.name] || 0}
                                                            onChange={(v: number) => updateArrayItem(sectionId, index, fieldSchema.name, v)}
                                                            maxStars={fieldSchema.maxStars || 5}
                                                            color={fieldSchema.color}
                                                        />
                                                    </div>
                                                ) : normalizedType === 'percentage' ? (
                                                    <div className="space-y-1">
                                                        <label className="mono-label block">{fieldSchema.label}</label>
                                                        <PercentageInput
                                                            value={item[fieldSchema.name] || 0}
                                                            onChange={(v: number) => updateArrayItem(sectionId, index, fieldSchema.name, v)}
                                                        />
                                                    </div>
                                                ) : normalizedType === 'select' ? (
                                                    <div className="space-y-1">
                                                        <label className="mono-label block">{fieldSchema.label}</label>
                                                        <SelectInput
                                                            value={item[fieldSchema.name] || ''}
                                                            onChange={(v: string) => updateArrayItem(sectionId, index, fieldSchema.name, v)}
                                                            options={fieldSchema.options || []}
                                                        />
                                                    </div>
                                                ) : normalizedType === 'slider' || normalizedType === 'rating' ? (
                                                    <div className="space-y-1">
                                                        <label className="mono-label block">{fieldSchema.label}</label>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="range"
                                                                min={fieldSchema.min || 0}
                                                                max={fieldSchema.max || 100}
                                                                step={fieldSchema.step || 1}
                                                                value={item[fieldSchema.name] || 0}
                                                                onChange={(e) => updateArrayItem(sectionId, index, fieldSchema.name, parseInt(e.target.value))}
                                                                className="flex-1 accent-[var(--text-main)] max-w-[120px]"
                                                            />
                                                            <span className="font-mono text-xs w-10">{item[fieldSchema.name] || 0}{fieldSchema.suffix || ''}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Input
                                                        label={fieldSchema.label}
                                                        value={item[fieldSchema.name] || ''}
                                                        onChange={(v: string) => updateArrayItem(sectionId, index, fieldSchema.name, v)}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>
        );
    };

    // State for deferred reordering (Visual Draft)
    const [localSections, setLocalSections] = useState<TemplateSection[]>([]);
    const [isReorderPending, setIsReorderPending] = useState(false);

    useEffect(() => {
        if (!isReorderPending && data.html_template) {
            const parsed = parseTemplateSections(
                data.html_template,
                data.resume_data,  // Pass resume data
                data.form_schema   // Pass form schema
            );
            const filtered = parsed.filter(s => {
                if (s.type === 'custom') {
                    return data.resume_data?.customSections?.length > 0;
                }
                return true;
            });
            setLocalSections(filtered);
        }
    }, [data.html_template, data.resume_data, data.form_schema, isReorderPending]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setLocalSections((items) => {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);
            const newOrder = arrayMove(items, oldIndex, newIndex);

            // Check if we moved across slots (e.g. sidebar to main) - though we'll prevent this via SortableContext separation if needed
            // For now, we assume visual order implies slot order if containers were separate.
            // But since we use one localSections array, we just reorder it.
            // Wait, if we use separate SortableContexts, we can't drag between them easily without strict ID management.
            // existing logic split them by 'slot'.

            setIsReorderPending(true);
            return newOrder;
        });
    };

    const renderLayoutEditor = () => {
        const sidebarSections = localSections.filter(s => s.slot === 'sidebar');
        const mainSections = localSections.filter(s => s.slot !== 'sidebar');
        const hasSidebar = sidebarSections.length > 0;

        const applyReorder = async () => {
            setIsReordering(true);
            try {
                const orderIds = localSections.map(s => s.id);
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const response = await fetch(`${API_URL}/reorder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        html: data.html_template,
                        order: orderIds
                    })
                });

                if (!response.ok) throw new Error('Reorder failed');

                const result = await response.json();
                if (result.html) {
                    onChange({ ...data, html_template: result.html });
                    setIsReorderPending(false);
                }
            } catch (err) {
                console.error("Reorder error:", err);
            } finally {
                setIsReordering(false);
            }
        };

        const handleDeleteSection = (section: TemplateSection) => {
            setDeleteConfirm({
                type: 'template_section',
                index: -1,
                section,
                title: section.name
            });
        };

        return (
            <div className="space-y-4 p-6 relative animate-in fade-in slide-in-from-right-4 duration-300">
                {isReordering && (
                    <LoadingOverlay message="PROCESSING" subMessage="RESTRUCTURING_HTML_NODES..." />
                )}

                {isReorderPending && (
                    <div className="border-2 border-[var(--accent-primary)] bg-[var(--bg-surface)] p-3 shadow-[4px_4px_0px_0px_var(--accent-primary)] mb-6 animate-pulse">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-sm font-bold font-mono text-[var(--text-main)] uppercase tracking-tight">
                                <AlertTriangle size={16} className="text-[var(--accent-primary)]" />
                                <span>Layout Modified</span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-xs text-[var(--text-muted)] font-mono">
                                    HTML structure needs regeneration for the new order.
                                </span>
                                <button
                                    onClick={applyReorder}
                                    className="px-4 py-2 border border-[var(--accent-primary)] bg-[var(--accent-primary)] text-black text-xs font-bold font-mono uppercase hover:bg-transparent hover:text-[var(--accent-primary)] transition-all flex items-center gap-2"
                                >
                                    <Sparkles size={14} />
                                    <span>Run AI Fix</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    {hasSidebar ? (
                        <div className="space-y-6">
                            {/* MAIN CONTENT ROW */}
                            <div className="bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-dim)] space-y-3">
                                <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono text-xs uppercase border-b border-[var(--border-dim)] pb-2 mb-2">
                                    <Columns size={14} /> Main Content
                                </div>
                                <SortableContext items={mainSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2 min-h-[50px]">
                                        {mainSections.map(s => (
                                            <SortableSectionItem key={s.id} section={s} onDelete={() => handleDeleteSection(s)} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </div>

                            {/* SIDEBAR ROW */}
                            <div className="bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-dim)] space-y-3">
                                <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono text-xs uppercase border-b border-[var(--border-dim)] pb-2 mb-2">
                                    <Sidebar size={14} /> Sidebar
                                </div>
                                <SortableContext items={sidebarSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2 min-h-[50px]">
                                        {sidebarSections.map(s => (
                                            <SortableSectionItem key={s.id} section={s} onDelete={() => handleDeleteSection(s)} isCompact={true} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </div>
                        </div>
                    ) : (
                        <SortableContext items={localSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {localSections.map((section) => (
                                    <SortableSectionItem key={section.id} section={section} onDelete={() => handleDeleteSection(section)} />
                                ))}
                            </div>
                        </SortableContext>
                    )}
                </DndContext>

                {!hasSidebar && localSections.length === 0 && (
                    <div className="text-center p-8 text-[var(--text-muted)] border border-dashed border-[var(--border-dim)] rounded">
                        No reorderable sections found.
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={disabled ? "opacity-50 pointer-events-none grayscale transition-all duration-300" : "transition-all duration-300"}>
            {/* TAB SWITCHER */}
            <div className="sticky top-0 z-10 bg-[var(--bg-root)] border-b border-[var(--border-dim)] flex items-center px-6 relative">
                <button
                    onClick={() => setActiveTab('content')}
                    className={`h-14 px-4 text-sm font-bold transition-colors relative ${activeTab === 'content' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    CONTENT EDITOR
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-main)] origin-left scale-x-0 transition-transform" />
                </button>
                <button
                    onClick={() => setActiveTab('layout')}
                    className={`h-14 px-4 text-sm font-bold transition-colors relative ${activeTab === 'layout' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    PAGE LAYOUT
                </button>

                {/* Visual Indicator managed by AnimeJS Hook */}
                <div
                    ref={tabLineRef}
                    className="absolute bottom-0 h-0.5 bg-[var(--text-main)] pointer-events-none"
                    style={{ left: activeTab === 'content' ? '24px' : '150px', width: '120px' }} // Approximate pos, will be refined if needed or kept simple
                />
            </div>

            {activeTab === 'layout' ? (
                renderLayoutEditor()
            ) : (
                <div className="p-6 pb-20 space-y-px bg-[var(--border-dim)] animate-in fade-in slide-in-from-left-4 duration-300">
                    <Section
                        id="basics"
                        title="Personal Information"
                        isExpanded={expandedSections.has('basics')}
                        onToggle={() => toggleSection('basics')}
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Full Name" value={resumeData.basics?.name} onChange={(v: string) => updateBasics('name', v)} />
                                <Input label="Job Title" value={resumeData.basics?.label} onChange={(v: string) => updateBasics('label', v)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Email" value={resumeData.basics?.email} onChange={(v: string) => updateBasics('email', v)} />
                                <Input label="Phone" value={resumeData.basics?.phone} onChange={(v: string) => updateBasics('phone', v)} />
                            </div>
                            <Input
                                label="Location"
                                value={typeof resumeData.basics?.location === 'string' ? resumeData.basics.location : resumeData.basics?.location?.address}
                                onChange={(v: string) => updateBasics('location', v)}
                            />
                            <ImageUpload
                                label="Profile Picture"
                                value={resumeData.basics?.image || ''}
                                onChange={(v: string) => updateBasics('image', v)}
                                shape="circle"
                            />
                            <div className="pt-2 border-t border-[var(--border-dim)]">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="mono-label">SOCIAL PROFILES</span>
                                    <AnimatedButton variant="ghost" className="text-xs" onClick={() => {
                                        const profiles = resumeData.basics?.profiles || [];
                                        onChange({
                                            ...data,
                                            resume_data: { ...resumeData, basics: { ...resumeData.basics, profiles: [...profiles, { network: '', url: '' }] } }
                                        });
                                    }}>+ ADD</AnimatedButton>
                                </div>
                                <div className="space-y-2">
                                    {(resumeData.basics?.profiles || []).map((profile: any, idx: number) => (
                                        <div key={idx} className="flex gap-2">
                                            <input className="input-tech w-24 h-8 px-2" value={profile.network || ''} placeholder="Type" onChange={(e) => {
                                                const profiles = [...(resumeData.basics?.profiles || [])];
                                                profiles[idx] = { ...profiles[idx], network: e.target.value };
                                                updateBasics('profiles', profiles as any);
                                            }} />
                                            <input className="input-tech flex-1 h-8 px-2" value={profile.url || ''} placeholder="URL" onChange={(e) => {
                                                const profiles = [...(resumeData.basics?.profiles || [])];
                                                profiles[idx] = { ...profiles[idx], url: e.target.value };
                                                updateBasics('profiles', profiles as any);
                                            }} />
                                            <button onClick={() => {
                                                const profiles = [...(resumeData.basics?.profiles || [])];
                                                profiles.splice(idx, 1);
                                                updateBasics('profiles', profiles as any);
                                            }} className="text-[var(--text-muted)] hover:text-[var(--accent-error)]"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <TextArea label="Summary" value={resumeData.basics?.summary} onChange={(v: string) => updateBasics('summary', v)} />
                        </div>
                    </Section>

                    {schemaSections.map((sectionSchema: any) => renderDynamicSection(sectionSchema))}

                    {customSections.map((section: any, sectionIndex: number) => (
                        <Section
                            key={section.key || `custom_${sectionIndex} `}
                            title={section.title}
                            isExpanded={expandedSections.has(section.key)}
                            onToggle={() => toggleSection(section.key)}
                            onAdd={() => addCustomSectionItem(sectionIndex)}
                            onRemoveSection={() => removeCustomSection(sectionIndex)}
                            count={section.items?.length || 0}
                        >
                            {section.type === 'text-list' ? (
                                <div className="space-y-2">
                                    {(section.items || []).map((item: any, i: number) => (
                                        <div key={i} className="flex gap-2">
                                            <input className="input-tech flex-1 h-9 px-3" value={item.description || item.title || ''} onChange={(e) => updateCustomSectionItem(sectionIndex, i, 'description', e.target.value)} placeholder="Item text..." />
                                            <button onClick={() => removeCustomSectionItem(sectionIndex, i)} className="text-[var(--text-muted)] hover:text-[var(--accent-error)] px-2"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            ) : section.type === 'detailed' ? (
                                <div className="space-y-4">
                                    {(Array.isArray(section.items) ? section.items : []).map((item: any, i: number) => (
                                        <div key={i} className="p-3 border border-[var(--border-dim)] bg-[var(--bg-root)] space-y-2 rounded-sm">
                                            <div className="flex justify-between items-center pb-2 border-b border-[var(--border-dim)] mb-2">
                                                <span className="mono-label">ITEM #{i + 1}</span>
                                                <button onClick={() => removeCustomSectionItem(sectionIndex, i)} className="text-[var(--text-muted)] hover:text-[var(--accent-error)]"><Trash2 size={14} /></button>
                                            </div>
                                            <Input label="Title" value={item.title} onChange={(v: string) => updateCustomSectionItem(sectionIndex, i, 'title', v)} />
                                            <Input label="Subtitle" value={item.subtitle} onChange={(v: string) => updateCustomSectionItem(sectionIndex, i, 'subtitle', v)} />
                                            <div className="space-y-1">
                                                <label className="mono-label block">Date</label>
                                                <input
                                                    type="date"
                                                    className="input-tech w-full"
                                                    value={item.date || ''}
                                                    onChange={(e) => updateCustomSectionItem(sectionIndex, i, 'date', e.target.value)}
                                                />
                                            </div>
                                            <TextArea label="Description" value={item.description} onChange={(v: string) => updateCustomSectionItem(sectionIndex, i, 'description', v)} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(Array.isArray(section.items) ? section.items : []).map((item: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 p-2 bg-[var(--bg-root)] border border-[var(--border-dim)] rounded-sm">
                                            <input className="input-tech flex-1 h-8 px-2 min-w-0" value={item.name || ''} onChange={(e) => updateCustomSectionItem(sectionIndex, i, 'name', e.target.value)} placeholder="Skill/Tag Name" />
                                            {section.type === 'skill-bars' && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <input type="range" className="w-24 accent-[var(--text-main)]" value={item.level || 0} max="100" onChange={(e) => updateCustomSectionItem(sectionIndex, i, 'level', parseInt(e.target.value))} />
                                                    <span className="font-mono text-xs w-8 text-right">{item.level}%</span>
                                                </div>
                                            )}
                                            <button onClick={() => removeCustomSectionItem(sectionIndex, i)} className="text-[var(--text-muted)] hover:text-[var(--accent-error)] px-2"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>
                    ))}

                    <div className="bg-[var(--bg-surface)] p-4">
                        {!showAddSection ? (
                            <button onClick={() => setShowAddSection(true)} className="w-full py-2 border border-dashed border-[var(--border-mid)] text-[var(--text-muted)] text-sm font-mono hover:border-[var(--text-main)] hover:text-[var(--text-main)] transition-colors">
                                + ADD CUSTOM SECTION
                            </button>
                        ) : (
                            <div className="bg-[var(--bg-root)] border border-[var(--border-dim)] p-4 space-y-4">
                                <span className="mono-label">NEW SECTION CONFIG</span>
                                <Input label="Title" value={newSectionTitle} onChange={setNewSectionTitle} />
                                <div className="grid grid-cols-2 gap-2">
                                    {CUSTOM_SECTION_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setNewSectionType(type.id)}
                                            className={`text-left p-2 border text-xs font-mono transition-colors ${newSectionType === type.id ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-[var(--border-dim)] text-[var(--text-muted)]'} `}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <AnimatedButton onClick={addCustomSection} variant="primary" className="text-xs">CREATE</AnimatedButton>
                                    <AnimatedButton onClick={() => setShowAddSection(false)} variant="secondary" className="text-xs">CANCEL</AnimatedButton>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            )}

            <ConfirmationModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Section"
                message={`Are you sure you want to delete "${deleteConfirm?.title || 'this section'}"? This cannot be undone.`}
                confirmText="Delete"
                isDestructive={true}
            />
        </div>
    );
}

// Subcomponents

function SortableSectionItem({ section, onDelete, isCompact }: { section: TemplateSection, onDelete: () => void, isCompact?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center ${isCompact ? 'gap-2 p-2' : 'gap-3 p-3'} bg-[var(--bg-root)] border border-[var(--border-dim)] rounded hover:border-[var(--accent-primary)] transition-colors cursor-default group relative ${isDragging ? 'shadow-xl scale-[1.02]' : ''}`}
        >
            {/* Drag Handle */}
            <div className={`text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors opacity-50 cursor-grab active:cursor-grabbing hover:opacity-100 ${isCompact ? 'p-1' : 'p-2'}`} {...listeners} {...attributes}>
                <GripVertical className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
            </div>

            {/* Section Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <input
                    type="text"
                    defaultValue={section.name}
                    readOnly
                    className={`font-bold text-[var(--text-main)] bg-transparent border-b border-transparent focus:outline-none w-full truncate transition-colors opacity-90 cursor-not-allowed ${isCompact ? 'text-xs' : 'text-sm'}`}
                    onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-dim)] truncate max-w-full">{section.type}</span>
                </div>
            </div>

            {/* Delete Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className={`text-[var(--text-muted)] hover:text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 rounded transition-colors opacity-0 group-hover:opacity-100 ${isCompact ? 'p-1.5' : 'p-2'}`}
                title="Delete Section"
            >
                <Trash2 className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </button>
        </div>
    );
}

function Section({ id, title, children, onAdd, onRemoveSection, isExpanded, onToggle, count }: any) {
    const { ref: contentRef } = useAnime<HTMLDivElement>({
        height: isExpanded ? [0, 'auto'] : 0,
        opacity: isExpanded ? [0, 1] : 0,
        duration: 250,
        easing: 'easeOutQuad'
    }, [isExpanded]);

    // Since animejs overrides styles inline, we might need to be careful.
    // Actually, conditional rendering + simple CSS transition is better for height sometimes, but let's try animejs as requested.
    // However, for correct height calc, 'auto' works well with animejs.

    return (
        <div className="bg-[var(--bg-card)]">
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-[var(--bg-root)] transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : <ChevronRight size={14} className="text-[var(--text-muted)]" />}
                    <span className="font-mono font-bold text-sm tracking-tight">{title?.toUpperCase()}</span>
                    {count !== undefined && count > 0 && <span className="text-[10px] bg-[var(--border-dim)] px-1.5 py-0.5 rounded text-[var(--text-muted)] font-mono">{count}</span>}
                </div>
                <div className="flex items-center gap-2">
                    {onAdd && (
                        <button onClick={(e) => { e.stopPropagation(); onAdd(); }} className="p-1 hover:bg-[var(--border-dim)] rounded text-[var(--text-muted)] hover:text-[var(--text-main)]">
                            <Plus size={14} />
                        </button>
                    )}
                    {onRemoveSection && (
                        <button onClick={(e) => { e.stopPropagation(); onRemoveSection(); }} className="p-1 hover:bg-[var(--border-dim)] rounded text-[var(--text-muted)] hover:text-[var(--accent-error)]">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* We keep the div in DOM but animate it */}
            <div
                className="overflow-hidden border-t border-[var(--border-dim)]"
                style={{ height: isExpanded ? 'auto' : 0, display: isExpanded ? 'block' : 'none' }} // Initial state helper
            >
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

function Input({ label, value, onChange, placeholder }: any) {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="mono-label block">{label}</label>
                <button
                    onClick={() => setIsEditorOpen(true)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                    title="Open Rich Text Editor"
                >
                    <Maximize2 size={12} />
                </button>
            </div>
            <div className="relative">
                <input
                    className="input-tech w-full pr-8"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            </div>
            <RichTextModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={onChange}
                initialValue={value}
                label={label}
            />
        </div>
    );
}

function TextArea({ label, value, onChange }: any) {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const isHtml = /<[a-z][\s\S]*>/i.test(value || '');

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="mono-label block">{label}</label>
                <div className="flex items-center gap-2">
                    {isHtml && <span className="text-[10px] text-[var(--accent-primary)] font-mono uppercase bg-[var(--bg-root)] border border-[var(--accent-primary)] px-1 rounded">Rich Text</span>}
                    <button
                        onClick={() => setIsEditorOpen(true)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center gap-1"
                        title="Open Rich Text Editor"
                    >
                        <span className="text-[10px] font-mono uppercase">EXPAND</span>
                        <Maximize2 size={12} />
                    </button>
                </div>
            </div>

            {isHtml ? (
                <div className="input-tech w-full min-h-[80px] text-sm pr-2 bg-[var(--bg-root)] overflow-hidden relative group">
                    <div
                        className="prose prose-invert prose-sm max-w-none text-[var(--text-main)] [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0 opacity-90"
                        dangerouslySetInnerHTML={{ __html: value || '<span class="text-[var(--text-muted)] italic">Empty...</span>' }}
                    />
                </div>
            ) : (
                <textarea
                    className="input-tech w-full min-h-[80px] text-sm pr-8"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder="Type here..."
                />
            )}

            <RichTextModal
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={onChange}
                initialValue={value}
                label={label}
            />
        </div>
    );
}

function DotRating({ value, onChange, maxDots = 5, filledColor = 'var(--accent-primary)', emptyColor = 'var(--border-input)' }: any) {
    const dots = [];
    const filledCount = Math.round((value / 100) * maxDots);
    for (let i = 0; i < maxDots; i++) {
        const isFilled = i < filledCount;
        dots.push(
            <button
                key={i}
                onClick={() => onChange(Math.round(((i + 1) / maxDots) * 100))}
                className={`text-2xl transition-transform hover:scale-125 cursor-pointer leading-none px-0.5`}
                style={{ color: isFilled ? filledColor : emptyColor, opacity: isFilled ? 1 : 0.3 }}
            >●</button>
        );
    }
    return <div className="flex gap-1">{dots}</div>;
}

function StarRating({ value, onChange, maxStars = 5, color = 'var(--accent-primary)' }: any) {
    const stars = [];
    const filledCount = Math.round((value / 100) * maxStars);
    for (let i = 0; i < maxStars; i++) {
        const isFilled = i < filledCount;
        stars.push(
            <button
                key={i}
                onClick={() => onChange(Math.round(((i + 1) / maxStars) * 100))}
                className="text-xl transition-transform hover:scale-125 cursor-pointer leading-none px-0.5"
                style={{ color: isFilled ? color : 'var(--border-input)', opacity: isFilled ? 1 : 0.3 }}
            >{isFilled ? '★' : '☆'}</button>
        );
    }
    return <div className="flex gap-0.5">{stars}</div>;
}

function PercentageInput({ value, onChange }: any) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="number"
                min="0"
                max="100"
                value={value || 0}
                onChange={e => onChange(parseInt(e.target.value) || 0)}
                className="input-tech w-20 px-2 text-center"
            />
            <span className="text-[var(--text-muted)]">%</span>
        </div>
    );
}

function SelectInput({ value, onChange, options = [] }: any) {
    return (
        <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="input-tech w-full"
        >
            <option value="">Select...</option>
            {options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    );
}

function ImageUpload({ label, value, onChange, shape = 'square' }: { label: string; value: string; onChange: (v: string) => void; shape?: 'square' | 'circle' }) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be under 5MB');
            return;
        }

        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            onChange(base64);
            setIsLoading(false);
        };
        reader.onerror = () => {
            alert('Failed to read file');
            setIsLoading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleUrlInput = () => {
        const url = prompt('Enter image URL:', value || '');
        if (url !== null) {
            onChange(url);
        }
    };

    const handleRemove = () => {
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="mono-label block">{label}</label>
            <div className="flex items-start gap-3">
                <div
                    className={`w-20 h-20 border border-[var(--border-dim)] bg-[var(--bg-root)] flex items-center justify-center overflow-hidden cursor-pointer hover:border-[var(--text-main)] transition-colors ${shape === 'circle' ? 'rounded-full' : 'rounded-sm'} `}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isLoading ? (
                        <div className="text-xs text-[var(--text-muted)]">Loading...</div>
                    ) : value ? (
                        <img src={value} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center text-xs text-[var(--text-muted)] p-2">Click to upload</div>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-mono px-2 py-1 border border-[var(--border-dim)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-colors">
                        UPLOAD
                    </button>
                    <button type="button" onClick={handleUrlInput} className="text-xs font-mono px-2 py-1 border border-[var(--border-dim)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-colors">
                        URL
                    </button>
                    {value && (
                        <button type="button" onClick={handleRemove} className="text-xs font-mono px-2 py-1 border border-[var(--border-dim)] text-[var(--accent-error)] hover:border-[var(--accent-error)] transition-colors">
                            REMOVE
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
