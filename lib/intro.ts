export const INTRO_SEEN_KEY = "ct-intro-seen";

export type IntroAction = "play" | "wait" | "skip";

// The intro is opt-in: the pre-paint script marks the page "play", and everything else
// (no JS, client-side navigation, repeat visit, reduced motion, nothing to reveal) falls back to the
// settled hero so the page can never be left covered. A hidden page — pre-rendered by the browser or
// opened in the background, which phones do a lot — waits until it is actually shown, rather than
// giving up (and being marked as seen) before anyone could watch it.
export function introAction({
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
}): IntroAction {
  if (flag !== "play" || seen || reducedMotion || frames === 0) return "skip";
  return hidden ? "wait" : "play";
}

// Runs before first paint. Its safety net only starts counting once the page is visible, so a page
// pre-rendered in the background isn't released before its intro gets a chance to play.
export const INTRO_SCRIPT = `(function(){var d=document.documentElement;try{if(sessionStorage.getItem('${INTRO_SEEN_KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.dataset.intro='play';var arm=function(){setTimeout(function(){if(d.dataset.intro==='play')d.dataset.intro='skip'},6000)};if(!document.hidden)arm();else document.addEventListener('visibilitychange',function f(){if(!document.hidden){document.removeEventListener('visibilitychange',f);arm()}})}catch(e){}})()`;
