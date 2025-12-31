"use client";

import React from 'react';

/**
 * DynamicRenderer - Interprets rich configuration from the AI agent
 * and renders appropriate input controls with maximum flexibility.
 * 
 * This is the core of Strategy 2.5 - giving the agent freedom to design
 * any UI through a declarative schema, while remaining safe and performant.
 */

interface RenderConfig {
    type: string;
    field?: string;
    label?: string;
    className?: string;
    style?: React.CSSProperties;
    children?: RenderConfig[];
    props?: Record<string, any>;
}

interface DynamicRendererProps {
    config: RenderConfig;
    data: Record<string, any>;
    onChange: (field: string, value: any) => void;
    disabled?: boolean;
}

// Symbol library - agent can reference these by name
const SYMBOLS: Record<string, string> = {
    'dot': '●',
    'dot-empty': '○',
    'circle': '●',
    'circle-empty': '○',
    'star': '★',
    'star-empty': '☆',
    'heart': '♥',
    'heart-empty': '♡',
    'square': '■',
    'square-empty': '□',
    'diamond': '◆',
    'diamond-empty': '◇',
    'check': '✓',
    'cross': '✗',
    'arrow-right': '→',
    'arrow-up': '↑',
    'bullet': '•',
    'dash': '—',
    'plus': '+',
    'minus': '-',
};

// Get symbol by name or return the string itself
const getSymbol = (s: string): string => SYMBOLS[s] || s;

export default function DynamicRenderer({ config, data, onChange, disabled }: DynamicRendererProps) {
    const renderElement = (cfg: RenderConfig, key?: number): React.ReactNode => {
        const { type, field, label, className, style, children, props = {} } = cfg;
        const value = field ? data[field] : undefined;

        switch (type) {
            // ==================== LAYOUT ELEMENTS ====================
            case 'container':
            case 'row':
            case 'column':
            case 'flex':
            case 'grid':
            case 'group':
                return (
                    <div key={key} className={className} style={style}>
                        {children?.map((child, i) => renderElement(child, i))}
                    </div>
                );

            case 'label':
                return (
                    <label key={key} className={className || "mono-label block"} style={style}>
                        {props.text || label}
                    </label>
                );

            case 'spacer':
                return <div key={key} className={className} style={{ flex: 1, ...style }} />;

            // ==================== TEXT INPUTS ====================
            case 'text':
            case 'text-input':
            case 'input':
                return (
                    <input
                        key={key}
                        type={props.inputType || 'text'}
                        className={className || "input-tech"}
                        style={style}
                        value={value || ''}
                        placeholder={props.placeholder}
                        disabled={disabled}
                        onChange={(e) => field && onChange(field, e.target.value)}
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        key={key}
                        className={className || "input-tech min-h-[80px]"}
                        style={style}
                        value={value || ''}
                        placeholder={props.placeholder}
                        disabled={disabled}
                        onChange={(e) => field && onChange(field, e.target.value)}
                    />
                );

            case 'number':
            case 'number-input':
                return (
                    <input
                        key={key}
                        type="number"
                        className={className || "input-tech w-20 text-center"}
                        style={style}
                        value={value ?? props.default ?? 0}
                        min={props.min}
                        max={props.max}
                        step={props.step}
                        disabled={disabled}
                        onChange={(e) => field && onChange(field, parseFloat(e.target.value) || 0)}
                    />
                );

            // ==================== RANGE/SLIDER ====================
            case 'slider':
            case 'range':
                return (
                    <div key={key} className={className || "flex items-center gap-2"} style={style}>
                        <input
                            type="range"
                            className="flex-1 accent-[var(--text-main)]"
                            value={value ?? 0}
                            min={props.min ?? 0}
                            max={props.max ?? 100}
                            step={props.step ?? 1}
                            disabled={disabled}
                            onChange={(e) => field && onChange(field, parseInt(e.target.value))}
                        />
                        {props.showValue !== false && (
                            <span className="font-mono text-xs w-10 text-right">
                                {value ?? 0}{props.suffix || ''}
                            </span>
                        )}
                    </div>
                );

            // ==================== VISUAL INDICATORS ====================
            case 'dots':
            case 'dot-rating':
            case 'symbol-rating':
                return (
                    <SymbolRating
                        key={key}
                        value={value ?? 0}
                        onChange={(v) => field && onChange(field, v)}
                        count={props.count ?? props.maxDots ?? 5}
                        filledSymbol={getSymbol(props.filledSymbol || props.filled || 'dot')}
                        emptySymbol={getSymbol(props.emptySymbol || props.empty || 'dot-empty')}
                        filledColor={props.filledColor || 'var(--accent-primary)'}
                        emptyColor={props.emptyColor || 'var(--border-input)'}
                        size={props.size || 'text-xl'}
                        className={className}
                        style={style}
                        disabled={disabled}
                    />
                );

            case 'stars':
            case 'star-rating':
                return (
                    <SymbolRating
                        key={key}
                        value={value ?? 0}
                        onChange={(v) => field && onChange(field, v)}
                        count={props.count ?? props.maxStars ?? 5}
                        filledSymbol={getSymbol(props.filledSymbol || 'star')}
                        emptySymbol={getSymbol(props.emptySymbol || 'star-empty')}
                        filledColor={props.filledColor || props.color || 'var(--accent-primary)'}
                        emptyColor={props.emptyColor || 'var(--border-input)'}
                        size={props.size || 'text-xl'}
                        className={className}
                        style={style}
                        disabled={disabled}
                    />
                );

            case 'hearts':
            case 'heart-rating':
                return (
                    <SymbolRating
                        key={key}
                        value={value ?? 0}
                        onChange={(v) => field && onChange(field, v)}
                        count={props.count ?? 5}
                        filledSymbol={getSymbol('heart')}
                        emptySymbol={getSymbol('heart-empty')}
                        filledColor={props.filledColor || '#FF6B6B'}
                        emptyColor={props.emptyColor || '#374151'}
                        size={props.size || 'text-xl'}
                        className={className}
                        style={style}
                        disabled={disabled}
                    />
                );

            case 'progress-bar':
            case 'progress-bar':
            case 'bar':
                return (
                    <div
                        key={key}
                        className={className}
                        style={{
                            background: props.backgroundColor || '#374151',
                            height: props.height || '8px',
                            borderRadius: props.borderRadius || '0px', // Brutalist default
                            overflow: 'hidden',
                            border: '1px solid var(--border-dim)', // Added border for visibility
                            ...style
                        }}
                    >
                        <div
                            style={{
                                width: `${value ?? 0}%`,
                                height: '100%',
                                background: props.fillColor || 'var(--accent-primary)',
                                borderRadius: props.borderRadius || '0px',
                                transition: 'width 0.3s ease'
                            }}
                        />
                    </div>
                );

            // ==================== SELECTION ====================
            case 'select':
            case 'dropdown':
                return (
                    <select
                        key={key}
                        className={className || "input-tech"}
                        style={style}
                        value={value || ''}
                        disabled={disabled}
                        onChange={(e) => field && onChange(field, e.target.value)}
                    >
                        <option value="">{props.placeholder || 'Select...'}</option>
                        {(props.options || []).map((opt: string | { value: string; label: string }) => {
                            const optValue = typeof opt === 'string' ? opt : opt.value;
                            const optLabel = typeof opt === 'string' ? opt : opt.label;
                            return <option key={optValue} value={optValue}>{optLabel}</option>;
                        })}
                    </select>
                );

            case 'radio-group':
                return (
                    <div key={key} className={className || "flex gap-2 flex-wrap"} style={style}>
                        {(props.options || []).map((opt: string | { value: string; label: string }) => {
                            const optValue = typeof opt === 'string' ? opt : opt.value;
                            const optLabel = typeof opt === 'string' ? opt : opt.label;
                            return (
                                <label key={optValue} className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={field}
                                        checked={value === optValue}
                                        disabled={disabled}
                                        onChange={() => field && onChange(field, optValue)}
                                    />
                                    <span className="text-sm">{optLabel}</span>
                                </label>
                            );
                        })}
                    </div>
                );

            case 'button-group':
            case 'segmented':
                return (
                    <div key={key} className={className || "flex"} style={style}>
                        {(props.options || []).map((opt: string | { value: string; label: string }, i: number) => {
                            const optValue = typeof opt === 'string' ? opt : opt.value;
                            const optLabel = typeof opt === 'string' ? opt : opt.label;
                            const isActive = value === optValue;
                            return (
                                <button
                                    key={optValue}
                                    type="button"
                                    disabled={disabled}
                                    className={`px-3 py-1 text-xs font-mono border transition-colors ${
                                        // Brutalist: No rounded corners on groups
                                        ''
                                        } ${isActive
                                            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-black font-bold'
                                            : 'bg-transparent border-[var(--border-dim)] text-[var(--text-muted)] hover:border-[var(--text-main)]'
                                        }`}
                                    onClick={() => field && onChange(field, optValue)}
                                >
                                    {optLabel}
                                </button>
                            );
                        })}
                    </div>
                );

            // ==================== TOGGLE/BOOLEAN ====================
            case 'toggle':
            case 'switch':
            case 'checkbox':
                return (
                    <label key={key} className={className || "flex items-center gap-2 cursor-pointer"} style={style}>
                        <input
                            type="checkbox"
                            checked={!!value}
                            disabled={disabled}
                            onChange={(e) => field && onChange(field, e.target.checked)}
                            className="accent-[var(--accent-primary)]"
                        />
                        {label && <span className="text-sm">{label}</span>}
                    </label>
                );

            // ==================== DISPLAY ELEMENTS ====================
            case 'text-display':
            case 'value':
                return (
                    <span key={key} className={className || "font-mono text-sm"} style={style}>
                        {props.prefix || ''}{value}{props.suffix || ''}
                    </span>
                );

            case 'badge':
            case 'tag':
                return (
                    <span
                        key={key}
                        className={className || "px-2 py-0.5 text-xs font-mono uppercase"} // No rounded
                        style={{
                            backgroundColor: props.backgroundColor || 'var(--border-dim)',
                            color: props.textColor || 'var(--text-main)',
                            border: '1px solid var(--text-muted)', // Added border
                            ...style
                        }}
                    >
                        {props.text || value}
                    </span>
                );

            // ==================== IMAGE/ICON UPLOAD ====================
            case 'image':
            case 'icon':
            case 'avatar':
            case 'photo':
            case 'picture':
                return (
                    <ImageInput
                        key={key}
                        value={value || ''}
                        onChange={(v) => field && onChange(field, v)}
                        shape={props.shape || (type === 'avatar' || type === 'photo' ? 'circle' : 'square')}
                        size={props.size || '80px'}
                        className={className}
                        style={style}
                        disabled={disabled}
                    />
                );


            // ==================== CUSTOM/UNKNOWN ====================
            default:
                // For unknown types, render as a container with children or as text
                if (children?.length) {
                    return (
                        <div key={key} className={className} style={style}>
                            {children.map((child, i) => renderElement(child, i))}
                        </div>
                    );
                }
                // Fallback to text display
                return (
                    <span key={key} className={className} style={style}>
                        {props.text || value || `[${type}]`}
                    </span>
                );
        }
    };

    return <>{renderElement(config)}</>;
}

// ==================== SYMBOL RATING COMPONENT ====================
interface SymbolRatingProps {
    value: number;
    onChange: (value: number) => void;
    count: number;
    filledSymbol: string;
    emptySymbol: string;
    filledColor: string;
    emptyColor: string;
    size: string;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
}

function SymbolRating({
    value, onChange, count, filledSymbol, emptySymbol,
    filledColor, emptyColor, size, className, style, disabled
}: SymbolRatingProps) {
    // Convert 0-100 value to filled count
    const filledCount = Math.round((value / 100) * count);

    return (
        <div className={className || "flex gap-1"} style={style}>
            {Array.from({ length: count }, (_, i) => {
                const isFilled = i < filledCount;
                return (
                    <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(Math.round(((i + 1) / count) * 100))}
                        className={`${size} transition-all hover:scale-110 cursor-pointer border-0 bg-transparent p-0 leading-none`}
                        style={{ color: isFilled ? filledColor : emptyColor, opacity: isFilled ? 1 : 0.3 }}
                    >
                        {isFilled ? filledSymbol : emptySymbol}
                    </button>
                );
            })}
        </div >
    );
}

// ==================== IMAGE INPUT COMPONENT ====================
interface ImageInputProps {
    value: string;
    onChange: (value: string) => void;
    shape?: 'square' | 'circle';
    size?: string;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
}

function ImageInput({ value, onChange, shape = 'square', size = '80px', className, style, disabled }: ImageInputProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            onChange(event.target?.result as string);
            setIsLoading(false);
        };
        reader.onerror = () => {
            alert('Failed to read file');
            setIsLoading(false);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className={className} style={style}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled}
            />
            <div
                onClick={() => !disabled && fileInputRef.current?.click()}
                style={{
                    width: size,
                    height: size,
                    borderRadius: shape === 'circle' ? '50%' : '0px', // Brutalist default
                    border: '1px solid var(--border-dim)',
                    background: 'var(--bg-root)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: disabled ? 'default' : 'pointer',
                    transition: 'border-color 0.2s',
                    boxShadow: shape === 'circle' ? 'none' : '4px 4px 0px 0px var(--accent-primary)' // Add shadow for photos
                }}
                onMouseEnter={(e) => !disabled && (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-dim)'}
            >
                {isLoading ? (
                    <span style={{ fontSize: '0.7em', color: 'var(--text-muted)' }}>Loading...</span>
                ) : value ? (
                    <img src={value} alt="Upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ fontSize: '0.65em', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>Click to upload</span>
                )}
            </div>
        </div>
    );
}

// ==================== HELPER: RENDER FIELD FROM SCHEMA ====================
export function renderDynamicField(
    fieldSchema: any,
    value: any,
    onChange: (value: any) => void,
    disabled?: boolean
): React.ReactNode {
    // If field has a render config, use DynamicRenderer
    if (fieldSchema.render) {
        return (
            <DynamicRenderer
                config={fieldSchema.render}
                data={{ [fieldSchema.name]: value }}
                onChange={(_, v) => onChange(v)}
                disabled={disabled}
            />
        );
    }

    // Otherwise, convert field schema to render config
    const config = fieldSchemaToRenderConfig(fieldSchema, value);
    return (
        <DynamicRenderer
            config={config}
            data={{ value }}
            onChange={(_, v) => onChange(v)}
            disabled={disabled}
        />
    );
}

// Convert legacy field schema to render config
function fieldSchemaToRenderConfig(fieldSchema: any, _value: any): RenderConfig {
    const { type, name, ...rest } = fieldSchema;

    const typeMap: Record<string, string> = {
        'text': 'text-input',
        'email': 'text-input',
        'tel': 'text-input',
        'url': 'text-input',
        'textarea': 'textarea',
        'slider': 'slider',
        'percentage': 'slider',
        'rating': 'slider',
        'dots': 'dot-rating',
        'stars': 'star-rating',
        'hearts': 'heart-rating',
        'select': 'select',
        'image': 'image',
        'icon': 'icon',
        'avatar': 'avatar',
        'photo': 'photo',
    };

    return {
        type: typeMap[type] || 'text-input',
        field: 'value',
        props: {
            ...rest,
            inputType: type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text',
            suffix: type === 'percentage' ? '%' : rest.suffix,
        }
    };
}
