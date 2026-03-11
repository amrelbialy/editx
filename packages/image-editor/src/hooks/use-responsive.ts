import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export interface ResponsiveState {
  isMobile: boolean;
  width: number;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => ({
    isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
  }));

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handler = () => {
      setState({
        isMobile: window.innerWidth < MOBILE_BREAKPOINT,
        width: window.innerWidth,
      });
    };

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return state;
}
