export const WHATSAPP_URL = `https://wa.me/60183875215?text=${encodeURIComponent(
  "Hi Wilson, I found your portfolio online and I'm interested in booking a shoot!"
)}`;
export const INSTAGRAM = { label: "IG @crisptakes", url: "https://instagram.com/crisptakes" };
// Xiaohongshu profile links need the numeric user id from the app; plain text until Wilson provides it.
export const XIAOHONGSHU = { label: "Xiaohongshu @crisptakes", url: null as string | null };

export const FEATURED_SHOOT = { genre: "concerts", event: "off-the-track" };
export const HERO_TAGS = "Events · Graduations · Concerts";
export const HERO_LINE = { plain: "Wilson. Photographer in Kuala Lumpur & Seremban — ", italic: "events, graduations, and live sets." };
export const MARQUEE_TEXT = "Events · Graduations · Concerts · 48-hour sneak peek · Events · Graduations · Concerts · 48-hour sneak peek · ";

export const ABOUT = {
  lead: { plain: "I shoot the frames people actually repost — ", italic: "the speaker mid-gesture, the toga toss,", accent: "the chorus drop." },
  left: "I'm Wilson, the photographer behind CRISPTAKES, serving Kuala Lumpur and Seremban. I photograph events, concerts and graduations — from speakers on stage and live performances to solo portraits and group graduation sessions.",
  right: "Every booking gets a fast turnaround: a 48-hour sneak peek of hero shots, then the full edited set. No waiting weeks to see if the shot landed.",
};

export const FAQ: { q: string; a: string; presetsOnly?: boolean }[] = [
  { q: "Where can I book a photography session?", a: "CRISPTAKES serves Kuala Lumpur and Seremban for event, concert and graduation photography. Send Wilson your date, venue and shoot details on WhatsApp to check availability and get a quote." },
  { q: "What photography can I book?", a: "Wilson at CRISPTAKES photographs events, concerts and graduations, including solo graduation portraits and group sessions. Browse the Concerts, Events and Graduation galleries to see past shoots." },
  { q: "How fast do I get my photos?", a: "A 48-hour sneak peek of hero shots, then the full edited set." },
  { q: "How do I book?", a: "Tap Book a Shoot and message me on WhatsApp with your date, venue and what you’re shooting. I’ll confirm availability and send a quote." },
  { q: "Do you shoot group graduations?", a: "Yes. Solo portraits and group sessions are both welcome." },
  { q: "What do the presets work with?", a: "Lightroom Classic, Lightroom desktop and Lightroom mobile. Check the preset listings for included files, before-and-after examples and purchase options.", presetsOnly: true },
];

export const CTA = { kicker: "Slots go fast during grad + gig season", line1: "Let's make", line2: "it ", italic: "crisp." };
