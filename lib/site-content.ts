export const WHATSAPP_URL = `https://wa.me/60183875215?text=${encodeURIComponent(
  "Hi Wilson, I found your portfolio online and I'm interested in booking a shoot!"
)}`;
export const INSTAGRAM = { label: "IG @crisptakes", url: "https://instagram.com/crisptakes" };
// Xiaohongshu profile links need the numeric user id from the app; plain text until Wilson provides it.
export const XIAOHONGSHU = { label: "Xiaohongshu @crisptakes", url: null as string | null };

export const FEATURED_SHOOT = { genre: "concerts", event: "off-the-track" };
export const HERO_TAGS = "Events · Graduations · Concerts";
export const HERO_LINE = { plain: "Wilson. Event & concert photographer — ", italic: "events, graduations, and live sets." };
export const MARQUEE_TEXT = "Events · Graduations · Concerts · 48-hour sneak peek · Events · Graduations · Concerts · 48-hour sneak peek · ";

export const ABOUT = {
  lead: { plain: "I shoot the frames people actually repost — ", italic: "the speaker mid-gesture, the toga toss,", accent: "the chorus drop." },
  left: "I'm Wilson — I've spent the last few years in photo pits, lecture halls, and graduation lawns learning exactly which split-second makes someone stop scrolling.",
  right: "Every booking gets a fast turnaround: a 48-hour sneak peek of hero shots, then the full edited set. No waiting weeks to see if the shot landed.",
};

export const FAQ: { q: string; a: string; presetsOnly?: boolean }[] = [
  { q: "How fast do I get my photos?", a: "A 48-hour sneak peek of hero shots, then the full edited set." },
  { q: "How do I book?", a: "Tap Book a Shoot and message me on WhatsApp with your date, venue and what you’re shooting. I’ll confirm availability and send a quote." },
  { q: "Do you shoot group graduations?", a: "Yes. Solo portraits and group sessions are both welcome." },
  { q: "What do the presets work with?", a: "Lightroom Classic, Lightroom desktop and Lightroom mobile. You get a download link right after checkout.", presetsOnly: true },
];

// Switch on once there's a shop to send buyers to (fill in buyUrl for each preset).
export const PRESETS_ENABLED = false;
export const PRESETS: { name: string; tag: string; price: string; photo: string; buyUrl: string | null }[] = [
  { name: "Pit Red", tag: "For concerts + low light", price: "RM 29", photo: "concerts/off-the-track/cover", buyUrl: null },
  { name: "Lawn Gold", tag: "For graduations + daylight", price: "RM 29", photo: "graduation/wanyi/cover", buyUrl: null },
  { name: "Stage Clean", tag: "For events + mixed light", price: "RM 29", photo: "events/tedxapu-2025/cover", buyUrl: null },
];

export const CTA = { kicker: "Slots go fast during grad + gig season", line1: "Let's make", line2: "it ", italic: "crisp." };
