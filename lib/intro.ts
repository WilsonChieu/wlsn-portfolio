export const INTRO_SEEN_KEY = "ct-intro-seen";

// The intro is opt-in: the pre-paint script marks the page "play", and everything else
// (no JS, client-side navigation, repeat visit, reduced motion, background tab, nothing to reveal)
// falls back to the settled hero so the page can never be left covered.
export function shouldPlayIntro({
  flag,
  seen,
  reducedMotion,
  hidden,
  frames,
}: {
  flag: string | undefined;
  seen: boolean;
  reducedMotion: boolean;
  hidden: boolean;
  frames: number;
}): boolean {
  return flag === "play" && !seen && !reducedMotion && !hidden && frames > 0;
}

// Runs before first paint. Includes its own safety net so a failed JS bundle can't leave the page hidden.
export const INTRO_SCRIPT = `(function(){var d=document.documentElement;try{if(sessionStorage.getItem('${INTRO_SEEN_KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return;d.dataset.intro='play';setTimeout(function(){if(d.dataset.intro==='play')d.dataset.intro='skip'},6000)}catch(e){}})()`;
