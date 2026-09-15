const WHATSAPP_NUMBER = "60183875215";
const WHATSAPP_MESSAGE =
  "Hi Wilson, I found your portfolio online and I'm interested in booking a shoot!";

export default function BookingModal() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring mt-10 inline-block rounded-full bg-olive px-8 py-4 font-mono text-[12px] uppercase tracking-[0.16em] text-ink transition-transform hover:scale-105"
    >
      Book a Shoot →
    </a>
  );
}
