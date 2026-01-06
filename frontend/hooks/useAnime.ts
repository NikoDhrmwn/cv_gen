import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

export const useAnime = <T extends HTMLElement>(
    params: any,
    deps: any[] = []
) => {
    const ref = useRef<T>(null);
    const animationRef = useRef<any>(null);

    useEffect(() => {
        if (!ref.current) return;

        // Clean up previous animation if exists
        if (animationRef.current) {
            animationRef.current.pause();
        }

        // v4 Syntax: animate(targets, parameters)
        animationRef.current = animate(ref.current, {
            ...params
        });

        return () => {
            if (animationRef.current) {
                animationRef.current.pause();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    const play = () => animationRef.current?.play();
    const pause = () => animationRef.current?.pause();
    const restart = () => animationRef.current?.restart();

    return { ref, play, pause, restart, instance: animationRef.current };
};

// Export stagger for use in components
export { stagger };

// Hook for stagger animations on lists
export const useStaggerAnime = <T extends HTMLElement>(
    params: any,
    deps: any[] = []
) => {
    const listRef = useRef<T>(null);
    const animationRef = useRef<any>(null);

    useEffect(() => {
        if (!listRef.current) return;

        // Cleanup old animation if exists
        if (animationRef.current) {
            animationRef.current.pause();
        }

        // v4 Syntax: animate(targets, parameters)
        // targets can be a NodeList or array
        animationRef.current = animate(listRef.current.children, {
            ...params
        });

        return () => {
            if (animationRef.current) {
                animationRef.current.pause();
            }
        };

    }, deps);

    return listRef;
}
