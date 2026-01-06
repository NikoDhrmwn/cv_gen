'use client';

import React, { useRef, MouseEvent } from 'react';
import { animate } from 'animejs';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
    children: React.ReactNode;
}

export const AnimatedButton = ({
    variant = 'primary',
    children,
    className = '',
    onClick,
    ...props
}: AnimatedButtonProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleMouseEnter = () => {
        if (!buttonRef.current) return;
        animate(buttonRef.current, {
            scale: 1.05,
            duration: 400,
            easing: 'easeOutElastic(1, .5)',
            boxShadow: variant === 'ghost' || variant === 'icon'
                ? 'none'
                : '6px 6px 0px 0px var(--accent-primary)',
            translateY: -2,
            translateX: -2,
        });
    };

    const handleMouseLeave = () => {
        if (!buttonRef.current) return;
        animate(buttonRef.current, {
            scale: 1,
            duration: 300,
            easing: 'easeOutQuad',
            boxShadow: 'none',
            translateY: 0,
            translateX: 0,
        });
    };

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
        if (!buttonRef.current) return;

        // Click press effect using v4 promises for sequencing if available, or just callbacks/multiple calls
        // v4 animate likely returns a promise-like object or we can use callbacks

        animate(buttonRef.current, {
            scale: 0.95,
            duration: 100,
            easing: 'easeOutQuad',
            onComplete: () => {
                if (buttonRef.current) {
                    animate(buttonRef.current, {
                        scale: 1.05,
                        duration: 300,
                        easing: 'easeOutElastic(1, .5)'
                    });
                }
            }
        });

        if (onClick) onClick(e);
    };

    // Base styles
    const baseClass = "relative transition-colors focus:outline-none";

    // Variant styles (Brutalist)
    const variants = {
        primary: "bg-[var(--text-main)] text-[var(--bg-root)] font-bold px-4 py-2 border-2 border-[var(--text-main)]",
        secondary: "bg-[var(--bg-surface)] text-[var(--text-main)] font-bold px-4 py-2 border-2 border-[var(--text-main)]",
        danger: "text-[var(--text-muted)] hover:text-[var(--accent-error)] px-2 py-1",
        ghost: "text-[var(--text-muted)] hover:text-[var(--text-main)] px-2 py-1",
        icon: "p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center"
    };

    const finalClass = `${baseClass} ${variants[variant]} ${className}`;

    return (
        <button
            ref={buttonRef}
            className={finalClass}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            {...props}
        >
            {children}
        </button>
    );
};
