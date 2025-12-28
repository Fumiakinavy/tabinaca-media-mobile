import { useEffect, useRef, useState } from "react";

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const {
    threshold = 0.1,
    rootMargin = "0px 0px -50px 0px",
    triggerOnce = true,
    delay = 0,
  } = options;

  useEffect(() => {
    const currentElement = elementRef.current;
    if (!currentElement) return;

    // 初期状態で要素がすでにビューポート内にあるかチェック（モバイル対応）
    const checkInitialVisibility = () => {
      const rect = currentElement.getBoundingClientRect();
      const windowHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const windowWidth =
        window.innerWidth || document.documentElement.clientWidth;

      // 要素がビューポート内にあるかチェック（より寛容な条件）
      const isInViewport =
        rect.top < windowHeight * 1.2 && // 少し下まで許容
        rect.bottom > -windowHeight * 0.2 && // 少し上まで許容
        rect.left < windowWidth &&
        rect.right > 0;

      if (isInViewport && !hasAnimated) {
        // モバイルでは少し遅延を入れてアニメーションを確実に表示
        const animationDelay = delay > 0 ? delay : 150;
        setTimeout(() => {
          setIsVisible(true);
          if (triggerOnce) {
            setHasAnimated(true);
          }
        }, animationDelay);
      }
    };

    // 初期チェックを実行（DOMが完全に読み込まれた後）
    const timeoutId = setTimeout(() => {
      checkInitialVisibility();
    }, 100);

    // IntersectionObserverの設定（モバイル用にrootMarginを調整）
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640; // sm breakpoint
    const adjustedRootMargin = isMobile ? "0px 0px -10% 0px" : rootMargin;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              if (triggerOnce) {
                setHasAnimated(true);
              }
            }, delay);
          } else {
            setIsVisible(true);
            if (triggerOnce) {
              setHasAnimated(true);
            }
          }
        } else if (!triggerOnce && !hasAnimated) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: adjustedRootMargin,
      },
    );

    observer.observe(currentElement);

    return () => {
      clearTimeout(timeoutId);
      observer.unobserve(currentElement);
    };
  }, [threshold, rootMargin, triggerOnce, delay, hasAnimated]);

  return { elementRef, isVisible };
};

// Batch animation hook for multiple elements
export const useBatchScrollAnimation = (
  count: number,
  options: UseScrollAnimationOptions = {},
) => {
  const [visibleItems, setVisibleItems] = useState<boolean[]>(
    new Array(count).fill(false),
  );
  const elementRefs = useRef<(HTMLDivElement | null)[]>(
    new Array(count).fill(null),
  );

  const {
    threshold = 0.1,
    rootMargin = "0px 0px -50px 0px",
    triggerOnce = true,
  } = options;

  useEffect(() => {
    const observers = elementRefs.current.map((_, index) => {
      return new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleItems((prev) => {
              const newState = [...prev];
              newState[index] = true;
              return newState;
            });
          } else if (!triggerOnce) {
            setVisibleItems((prev) => {
              const newState = [...prev];
              newState[index] = false;
              return newState;
            });
          }
        },
        {
          threshold,
          rootMargin,
        },
      );
    });

    // elementRefs.currentを変数にコピーしてクリーンアップ関数で使用
    const currentElementRefs = elementRefs.current;

    currentElementRefs.forEach((element, index) => {
      if (element && observers[index]) {
        observers[index].observe(element);
      }
    });

    return () => {
      observers.forEach((observer, index) => {
        const element = currentElementRefs[index];
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [threshold, rootMargin, triggerOnce]);

  const setElementRef = (index: number) => (ref: HTMLDivElement | null) => {
    elementRefs.current[index] = ref;
  };

  return { setElementRef, visibleItems };
};

// Stagger animation hook
export const useStaggerAnimation = (
  count: number,
  staggerDelay: number = 100,
) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedItems, setAnimatedItems] = useState<boolean[]>(
    new Array(count).fill(false),
  );
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Stagger the animation of child elements
          for (let i = 0; i < count; i++) {
            setTimeout(() => {
              setAnimatedItems((prev) => {
                const newState = [...prev];
                newState[i] = true;
                return newState;
              });
            }, i * staggerDelay);
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      },
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [count, staggerDelay]);

  return { elementRef, isVisible, animatedItems };
};

// Page transition hook
export const usePageTransition = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return { isLoaded };
};

// Scroll progress hook
export const useScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return scrollProgress;
};

export const useStaggeredCardAnimation = (
  options: {
    delay?: number;
    threshold?: number;
    staggerDelay?: number;
    hideDelay?: number;
  } = {},
) => {
  const {
    delay = 0,
    threshold = 0.1,
    staggerDelay = 200,
    hideDelay = 2000,
  } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [showSlider, setShowSlider] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);

          // 最初のカードを表示
          setCurrentCard(0);

          // 各カードを順番に表示・非表示
          const showNextCard = (index: number) => {
            if (index < 3) {
              setCurrentCard(index);

              // 一定時間表示後、次のカードに移行
              setTimeout(() => {
                showNextCard(index + 1);
              }, hideDelay);
            } else {
              // すべてのカード表示完了後、スライダーモードに切り替え
              setTimeout(() => {
                setShowSlider(true);
              }, 500);
            }
          };

          // 最初のカードから開始
          setTimeout(() => {
            showNextCard(0);
          }, delay);
        }
      },
      { threshold },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay, threshold, staggerDelay, hideDelay, isVisible]);

  return { ref, isVisible, currentCard, showSlider };
};
