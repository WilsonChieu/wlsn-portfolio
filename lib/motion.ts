import type { Variants } from "framer-motion";

export const easeStandard: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
export const easeLoader: [number, number, number, number] = [0.76, 0, 0.24, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeStandard },
  },
};

export const lineReveal: Variants = {
  hidden: { y: "110%" },
  visible: {
    y: 0,
    transition: { duration: 0.9, ease: easeStandard },
  },
};
