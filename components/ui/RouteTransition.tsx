import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./RouteTransition.module.css";

const TRANSITION_MS = 1250;

export default function RouteTransition() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const startedAt = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = null;
    };

    const start = (url: string) => {
      if (url === router.asPath) return;
      clearHideTimer();
      startedAt.current = Date.now();
      setActive(true);
    };

    const finish = () => {
      clearHideTimer();
      const minimum = reducedMotion ? 0 : TRANSITION_MS;
      const remaining = Math.max(0, minimum - (Date.now() - startedAt.current));
      hideTimer.current = setTimeout(() => setActive(false), remaining);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", finish);
    router.events.on("routeChangeError", finish);
    return () => {
      clearHideTimer();
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", finish);
      router.events.off("routeChangeError", finish);
    };
  }, [router, reducedMotion]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.25 }}
          role="status"
          aria-live="polite"
          aria-label="Opening Avalanche Scouting page"
        >
          <div className={styles.content}>
            <div className={styles.mark}>
              <Image
                src="/image.png"
                alt=""
                width={100}
                height={100}
                priority
              />
            </div>
            <p className={styles.wordmark}>
              AVALANCHE <span>SCOUTING</span>
            </p>
            <div className={styles.progress}>
              <span />
            </div>
            <p className={styles.caption}>OPENING YOUR NEXT VIEW</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
