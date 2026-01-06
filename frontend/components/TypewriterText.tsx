import React, { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
    texts: string[];
    typingSpeed?: number;
    deletingSpeed?: number;
    pauseDuration?: number; // Time to wait after finishing typing (ms)
    typoProbability?: number; // 0 to 1
}

const KEYBOARD_LAYOUT: { [key: string]: string } = {
    'a': 's', 'b': 'v', 'c': 'x', 'd': 'f', 'e': 'r', 'f': 'g', 'g': 'h',
    'h': 'j', 'i': 'o', 'j': 'k', 'k': 'l', 'l': 'k', 'm': 'n', 'n': 'b',
    'o': 'p', 'p': 'o', 'q': 'w', 'r': 'e', 's': 'a', 't': 'r', 'u': 'i',
    'v': 'c', 'w': 'q', 'x': 'z', 'y': 't', 'z': 'x',
    ' ': ' '
};

export function TypewriterText({
    texts,
    typingSpeed = 80,
    deletingSpeed = 40,
    pauseDuration = 20000,
    typoProbability = 0.05
}: TypewriterTextProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true); // For cursor animation or status

    // Refs to maintain state across timeouts without re-renders triggering effect loops
    const state = useRef({
        textIndex: 0,
        charIndex: 0,
        isDeleting: false,
        inTypoSequence: false, // true if we just made a typo and need to fix it
        typoData: '', // The wrong character we inserted
        targetText: texts[0]
    });

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const handleTyping = () => {
            const current = state.current;
            const fullText = texts[current.textIndex];

            // --- DELETING PHASE ---
            if (current.isDeleting) {
                if (current.charIndex > 0) {
                    setDisplayedText(prev => prev.slice(0, -1));
                    current.charIndex--;
                    timer = setTimeout(handleTyping, deletingSpeed);
                } else {
                    // Finished deleting, move to next text
                    current.isDeleting = false;
                    current.textIndex = (current.textIndex + 1) % texts.length;
                    current.targetText = texts[current.textIndex];
                    timer = setTimeout(handleTyping, 500); // Small pause before typing next
                }
                return;
            }

            // --- TYPO CORRECTION PHASE ---
            if (current.inTypoSequence) {
                // We just typed a wrong char, now we backspace it
                setDisplayedText(prev => prev.slice(0, -1));
                current.inTypoSequence = false;
                // Don't advance charIndex because we want to retry the correct one next
                timer = setTimeout(handleTyping, deletingSpeed * 2); // Deleting mistake is usually fast/reactive
                return;
            }

            // --- TYPING PHASE ---
            // If we haven't finished typing the current string
            if (current.charIndex < fullText.length) {
                const nextChar = fullText.charAt(current.charIndex);

                // CHECK FOR TYPO
                // Only make typos on letters, not space or punctuation for simplicity
                const shouldTypo = Math.random() < typoProbability && KEYBOARD_LAYOUT[nextChar.toLowerCase()];

                if (shouldTypo) {
                    const wrongChar = KEYBOARD_LAYOUT[nextChar.toLowerCase()];
                    setDisplayedText(prev => prev + wrongChar);
                    current.inTypoSequence = true; // Next tick will delete this
                    // We do NOT increment charIndex, so we retry this position next time

                    // Fast reaction time to notice error
                    timer = setTimeout(handleTyping, Math.random() * 200 + 50);
                } else {
                    // Correct typing
                    setDisplayedText(prev => prev + nextChar);
                    current.charIndex++;
                    timer = setTimeout(handleTyping, typingSpeed + (Math.random() * 50 - 25)); // randomize speed slightly
                }
            } else {
                // --- FINISHED TYPING PHASE ---
                current.isDeleting = true;
                // Wait for the long pauseDuration (15-30s requested, user passed param)
                // Add some randomness to the pause
                const waitTime = pauseDuration + (Math.random() * 5000);
                timer = setTimeout(handleTyping, waitTime);
            }
        };

        timer = setTimeout(handleTyping, 100);

        return () => clearTimeout(timer);
    }, []); // Empty dependency array, internal refs drive the logic

    return (
        <span className="font-mono">
            {displayedText}
            <span className="animate-pulse bg-[var(--accent-primary)] text-[var(--bg-root)] ml-1 px-1 select-none"> </span>
        </span>
    );
}
