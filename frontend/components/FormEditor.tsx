import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Trash2, GripVertical, AlertTriangle, Plus, Columns, Sidebar, Sparkles, LayoutTemplate, ChevronDown, ChevronRight, Settings2, ArrowUp, ArrowDown, Maximize2 } from 'lucide-react';
import DynamicRenderer, { renderDynamicField } from './DynamicRenderer';
import { parseTemplateSections, reorderSections, swapSections, TemplateSection } from '../utils/templateParser';
import RichTextModal from './RichTextModal';
import LoadingOverlay from './LoadingOverlay';
import ConfirmationModal from './ConfirmationModal';

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

    // Layout Management - Swap two adjacent sections in the template
    const handleMoveSection = (index: number, direction: 'up' | 'down') => {
        const sections = parseTemplateSections(data.html_template);
        if (!sections || sections.length < 2) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sections.length) return;

        // Use swapSections (which internally uses reorderSections) to swap the two template blocks
        const newHtml = swapSections(data.html_template, sections[index], sections[targetIndex]);
        onChange({ ...data, html_template: newHtml });
    };

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
        // Ensure we don't accidentally create an "undefined" type if state is weird, default to text-list
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

    // Normalize unknown field types to closest known type
    const normalizeFieldType = (type: string): string => {
        const knownTypes = ['text', 'email', 'tel', 'textarea', 'image', 'url', 'date',
            'slider', 'dots', 'stars', 'rating', 'percentage', 'select'];
        if (knownTypes.includes(type)) return type;

        // Map unknown types to closest known type
        if (type?.includes('bar') || type?.includes('progress') || type?.includes('gauge') || type?.includes('circle')) {
            return 'slider';  // Progress-like elements become sliders
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
        // Default fallback to text for completely unknown types
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

        // Find the level field schema for compact sections
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
                            // Determine field names dynamically
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
                                    {/* If level field has custom render, use DynamicRenderer */}
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
                                        // If field has a custom render config, use DynamicRenderer
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

    // Sync local sections when data changes (unless we have pending changes?)
    // Actually, if we have pending changes, we don't want to overwrite them if data.html_template re-renders.
    // But data.html_template only changes on SAVE or Edit.
    useEffect(() => {
        if (!isReorderPending && data.html_template) {
            const parsed = parseTemplateSections(data.html_template);
            // Filter custom sections logic moved here to keep consistent
            const filtered = parsed.filter(s => {
                if (s.type === 'custom') {
                    return data.resume_data?.customSections?.length > 0;
                }
                return true;
            });
            setLocalSections(filtered);
        }
    }, [data.html_template, data.resume_data, isReorderPending]);

    const renderLayoutEditor = () => {
        // Use localSections for rendering the UI
        const sidebarSections = localSections.filter(s => s.slot === 'sidebar');
        const mainSections = localSections.filter(s => s.slot !== 'sidebar');
        const hasSidebar = sidebarSections.length > 0;

        // VISUAL ONLY Reorder Handler
        const onReorderVisual = (reorderedSubset: TemplateSection[]) => {
            // Determine if we are reordering Sidebar or Main
            // We assume reorderedSubset is EITHER Sidebar OR Main items
            if (reorderedSubset.length === 0) return;

            const isSidebarMove = reorderedSubset[0].slot === 'sidebar';

            let newFullOrder: TemplateSection[] = [];

            if (isSidebarMove) {
                // Keep Main as is, replace sidebar with new order
                newFullOrder = [...mainSections, ...reorderedSubset];
            } else {
                // Keep Sidebar as is, replace main with new order
                newFullOrder = [...reorderedSubset, ...sidebarSections];
            }

            setLocalSections(newFullOrder);
            setIsReorderPending(true);
        };

        // ACTUAL AI COMMITER
        const applyReorder = async () => {
            setIsReordering(true);
            try {
                // Send JUST the IDs to the backend
                const orderIds = localSections.map(s => s.id);

                // API Call
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
                    setIsReorderPending(false); // Reset pending state
                }
            } catch (err) {
                console.error("Reorder error:", err);
            } finally {
                setIsReordering(false);
            }
        };

        // Rename section handler
        const handleRenameSection = (section: TemplateSection, newName: string) => {
            // Visual only
        };

        // Delete section handler
        const handleDeleteSection = (section: TemplateSection) => {
            // Confirm logic is now in the parser for safety, but UI needs to trigger it
            setDeleteConfirm({
                type: 'template_section',
                index: -1,
                section,
                title: section.name
            });
        };

        const SectionItem = ({ section, isCompact = false }: { section: TemplateSection, isCompact?: boolean }) => (
            <Reorder.Item
                key={section.id}
                value={section}
                whileDrag={{
                    scale: 1.02,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                    zIndex: 50
                }}
                className={`flex items-center ${isCompact ? 'gap-2 p-2' : 'gap-3 p-3'} bg-[var(--bg-root)] border border-[var(--border-dim)] rounded hover:border-[var(--accent-primary)] transition-colors cursor-grab active:cursor-grabbing group`}
            >
                {/* Drag Handle */}
                <div className={`text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors opacity-50 ${isCompact ? 'p-1' : 'p-2'}`}>
                    <GripVertical className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
                </div>

                {/* Section Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {/* Editable Name (Visual Only) */}
                    <input
                        type="text"
                        defaultValue={section.name}
                        readOnly
                        title="Renaming disabled in safety mode"
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
                        handleDeleteSection(section);
                    }}
                    className={`text-[var(--text-muted)] hover:text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 rounded transition-colors opacity-0 group-hover:opacity-100 ${isCompact ? 'p-1.5' : 'p-2'}`}
                    title="Delete Section"
                >
                    <Trash2 className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                </button>
            </Reorder.Item>
        );

        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 p-6 relative"
            >
                {/* AI Reorder Loading Overlay (Brutalist Style) */}
                {isReordering && (
                    <LoadingOverlay message="PROCESSING" subMessage="RESTRUCTURING_HTML_NODES..." />
                )}

                {/* Confirm Changes Info Bar (Brutalist Style) */}
                {isReorderPending && (
                    <div className="border-2 border-[var(--accent-primary)] bg-[var(--bg-surface)] p-3 shadow-[4px_4px_0px_0px_var(--accent-primary)] mb-6 animate-in fade-in slide-in-from-top-2">
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
                {/* Intro/Helper Text (Optional, removed Safety Mode warning) */}

                {hasSidebar ? (
                    <div className="space-y-6">
                        {/* MAIN CONTENT ROW */}
                        <div className="bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-dim)] space-y-3">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono text-xs uppercase border-b border-[var(--border-dim)] pb-2 mb-2">
                                <Columns size={14} /> Main Content
                            </div>
                            <Reorder.Group axis="y" values={mainSections} onReorder={onReorderVisual} className="space-y-2 min-h-[50px]">
                                {mainSections.map(s => <SectionItem key={s.id} section={s} />)}
                            </Reorder.Group>
                        </div>

                        {/* SIDEBAR ROW */}
                        <div className="bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-dim)] space-y-3">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono text-xs uppercase border-b border-[var(--border-dim)] pb-2 mb-2">
                                <Sidebar size={14} /> Sidebar
                            </div>
                            <Reorder.Group axis="y" values={sidebarSections} onReorder={onReorderVisual} className="space-y-2 min-h-[50px]">
                                {sidebarSections.map(s => <SectionItem key={s.id} section={s} isCompact={true} />)}
                            </Reorder.Group>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Reorder.Group axis="y" values={localSections} onReorder={onReorderVisual} className="space-y-2">
                            {localSections.map((section) => <SectionItem key={section.id} section={section} />)}
                        </Reorder.Group>

                        {localSections.length === 0 && (
                            <div className="text-center p-8 text-[var(--text-muted)] border border-dashed border-[var(--border-dim)] rounded">
                                No reorderable sections found.
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className={disabled ? "opacity-50 pointer-events-none grayscale transition-all duration-300" : "transition-all duration-300"}>
            {/* TAB SWITCHER with animated underline */}
            <div className="sticky top-0 z-10 bg-[var(--bg-root)] border-b border-[var(--border-dim)] flex items-center px-6 relative">
                <button
                    onClick={() => setActiveTab('content')}
                    className={`h-14 px-4 text-sm font-bold transition-colors relative ${activeTab === 'content' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    CONTENT EDITOR
                    {activeTab === 'content' && (
                        <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-main)]"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('layout')}
                    className={`h-14 px-4 text-sm font-bold transition-colors relative ${activeTab === 'layout' ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    PAGE LAYOUT
                    {activeTab === 'layout' && (
                        <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-main)]"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    )}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'layout' ? (
                    <motion.div key="layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {renderLayoutEditor()}
                    </motion.div>
                ) : (
                    <motion.div key="content" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                        <div className="p-6 pb-20 space-y-px bg-[var(--border-dim)]"> {/* Gap using 1px border color background */}

                            {/* Personal Details */}
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

                                    {/* Profile Picture Upload */}
                                    <ImageUpload
                                        label="Profile Picture"
                                        value={resumeData.basics?.image || ''}
                                        onChange={(v: string) => updateBasics('image', v)}
                                        shape="circle"
                                    />

                                    <div className="pt-2 border-t border-[var(--border-dim)]">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="mono-label">SOCIAL PROFILES</span>
                                            <button onClick={() => {
                                                const profiles = resumeData.basics?.profiles || [];
                                                onChange({
                                                    ...data,
                                                    resume_data: { ...resumeData, basics: { ...resumeData.basics, profiles: [...profiles, { network: '', url: '' }] } }
                                                });
                                            }} className="text-xs text-[var(--accent-primary)] font-mono hover:underline">+ ADD</button>
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

                            {/* Dynamic Sections */}
                            {schemaSections.map((sectionSchema: any) => renderDynamicSection(sectionSchema))}

                            {/* Custom Sections */}
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
                                    {/* Render custom items similar to dynamic sections, omitted for brevity but using same "tech" inputs */}
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
                                        /* Tags or Skill Bars */
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

                            {/* Add Section Button */}
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
                                                    className={`text - left p - 2 border text - xs font - mono transition - colors ${newSectionType === type.id ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-[var(--border-dim)] text-[var(--text-muted)]'} `}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={addCustomSection} className="btn-tech-primary text-xs">CREATE</button>
                                            <button onClick={() => setShowAddSection(false)} className="btn-tech-secondary text-xs">CANCEL</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        <ConfirmationModal
                            isOpen={!!deleteConfirm}
                            onClose={() => setDeleteConfirm(null)}
                            onConfirm={handleConfirmDelete}
                            title="Delete Section"
                            message={`Are you sure you want to delete "${deleteConfirm?.title || 'this section'}"? This cannot be undone.`}
                            confirmText="Delete"
                            isDestructive={true}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Tech-styled Section
function Section({ id, title, children, onAdd, onRemoveSection, isExpanded, onToggle, count }: any) {
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
            {isExpanded && (
                <div className="p-4 border-t border-[var(--border-dim)]">
                    {children}
                </div>
            )}
        </div>
    );
}

// Tech Input
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

    // Check if content looks like HTML (optimized regex)
    // If it has HTML tags, we treat it as rich text.
    const isHtml = /<[a-z][\s\S]*>/i.test(value || '');

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <label className="mono-label block">{label}</label>
                <div className="flex items-center gap-2">
                    {/* Clear visual indicator if rich text */}
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

            {/* Hybrid Input Area */}
            {isHtml ? (
                /* HTML Preview (Read Only) - Allows text selection, does NOT auto-open modal */
                <div
                    className="input-tech w-full min-h-[80px] text-sm pr-2 bg-[var(--bg-root)] overflow-hidden relative group"
                >
                    <div
                        className="prose prose-invert prose-sm max-w-none text-[var(--text-main)] [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0 opacity-90"
                        dangerouslySetInnerHTML={{ __html: value || '<span class="text-[var(--text-muted)] italic">Empty...</span>' }}
                    />

                    {/* Hover Overlay to suggest editing */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex items-end justify-end p-2">
                        {/* Visual cue only */}
                    </div>
                </div>
            ) : (
                /* Standard Textarea for plain text edits */
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

// Dot Rating Input (●●●○○)
function DotRating({ value, onChange, maxDots = 5, filledColor = 'var(--accent-primary)', emptyColor = 'var(--border-input)' }: any) {
    const dots = [];
    const filledCount = Math.round((value / 100) * maxDots);
    for (let i = 0; i < maxDots; i++) {
        const isFilled = i < filledCount;
        dots.push(
            <button
                key={i}
                onClick={() => onChange(Math.round(((i + 1) / maxDots) * 100))}
                className={`text - 2xl transition - transform hover: scale - 125 cursor - pointer leading - none px - 0.5`}
                style={{ color: isFilled ? filledColor : emptyColor, opacity: isFilled ? 1 : 0.3 }}
            >●</button>
        );
    }
    return <div className="flex gap-1">{dots}</div>;
}

// Star Rating Input (★★★☆☆)
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

// Percentage Input
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

// Select Input
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

// Image Upload Input
function ImageUpload({ label, value, onChange, shape = 'square' }: { label: string; value: string; onChange: (v: string) => void; shape?: 'square' | 'circle' }) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be under 5MB');
            return;
        }

        setIsLoading(true);

        // Convert to base64 for local preview (will be replaced with Vercel Blob URL in production)
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
                {/* Preview */}
                <div
                    className={`w - 20 h - 20 border border - [var(--border - dim)]bg - [var(--bg - root)] flex items - center justify - center overflow - hidden cursor - pointer hover: border - [var(--text - main)]transition - colors ${shape === 'circle' ? 'rounded-full' : 'rounded-sm'} `}
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

                {/* Actions */}
                <div className="flex flex-col gap-1">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-mono px-2 py-1 border border-[var(--border-dim)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-colors"
                    >
                        UPLOAD
                    </button>
                    <button
                        type="button"
                        onClick={handleUrlInput}
                        className="text-xs font-mono px-2 py-1 border border-[var(--border-dim)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)] transition-colors"
                    >
                        URL
                    </button>
                    {value && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="text-xs font-mono px-2 py-1 border border-[var(--border-dim)] text-[var(--accent-error)] hover:border-[var(--accent-error)] transition-colors"
                        >
                            REMOVE
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export { ImageUpload };
