import { useRef, useState, useEffect } from "react";
import { debounce } from "lodash";

const useResizeObserver = (delay = 100) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const observeTarget = ref.current;
    if (!observeTarget) return;

    const handleResize = debounce((entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    }, delay);

    const resizeObserver = new ResizeObserver(handleResize);

    resizeObserver.observe(observeTarget);

    return () => {
      resizeObserver.unobserve(observeTarget);
      handleResize.cancel(); // デバウンスされた関数のキャンセル
    };
  }, [delay]);

  return { ref, dimensions };
};

export default useResizeObserver;
