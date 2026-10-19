import { useEffect, useState } from 'react';

type ScrollHideState = {
  isHidden: boolean;
  lastY: number;
  downStartY: number;
};

export function useHideOnScroll(threshold: number) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let state: ScrollHideState = {
      isHidden: false,
      lastY: scrollY,
      downStartY: scrollY,
    };

    function handleScroll() {
      state = nextScrollHideState(state, scrollY, threshold);
      setIsHidden(state.isHidden);
    }

    addEventListener('scroll', handleScroll, { passive: true });
    return () => removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isHidden;
}

// *** nextScrollHideState ***
// Counting from where the scroll down started, not from the top, so a reader
// who scrolls up mid-page keeps the dock until they move on again.
function nextScrollHideState(
  state: ScrollHideState,
  y: number,
  threshold: number,
): ScrollHideState {
  if (y < state.lastY) return { isHidden: false, lastY: y, downStartY: y };

  return {
    ...state,
    isHidden: state.isHidden || y - state.downStartY > threshold,
    lastY: y,
  };
}

export { nextScrollHideState };
