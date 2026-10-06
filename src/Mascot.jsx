export function Mascot({ live }) {
  return (
    <div className={`figure ${live ? "is-live" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 280 320">
        <defs>
          <radialGradient id="aura" cx="50%" cy="42%" r="52%">
            <stop offset="0%" stopColor="#c8f54a" stopOpacity="0.42" />
            <stop offset="48%" stopColor="#e7a15a" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#c8f54a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6f1e6" />
            <stop offset="100%" stopColor="#c9c0b1" />
          </linearGradient>
          <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2c3228" />
            <stop offset="100%" stopColor="#12150f" />
          </linearGradient>
          <clipPath id="visorClip">
            <rect x="108" y="98" width="64" height="20" rx="10" />
          </clipPath>
        </defs>

        <ellipse cx="140" cy="156" rx="108" ry="112" fill="url(#aura)" />

        <path
          d="M98 198c-16 16-24 40-20 62"
          fill="none"
          stroke="#ddd4c6"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <circle cx="78" cy="264" r="7" fill="#171910" stroke="#e7a15a" strokeWidth="2" />

        <path
          d="M182 190c22-16 34-42 28-68"
          fill="none"
          stroke="#ddd4c6"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M210 122c10-12 24-12 32-4"
          fill="none"
          stroke="#f4efe4"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M232 112l12-8M236 120l14-1M234 128l12 7"
          fill="none"
          stroke="#1a1d14"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <rect x="96" y="186" width="88" height="96" rx="30" fill="url(#shell)" />
        <path
          d="M140 214l16 16-16 16-16-16z"
          fill="none"
          stroke="#c4843a"
          strokeWidth="2.5"
        />
        <circle cx="140" cy="230" r="3.2" fill="#c8f54a" />

        <rect x="84" y="56" width="112" height="116" rx="42" fill="url(#shell)" />
        <circle cx="76" cy="114" r="13" fill="#f4efe4" stroke="#e7a15a" strokeWidth="3" />
        <circle cx="204" cy="114" r="13" fill="#f4efe4" stroke="#e7a15a" strokeWidth="3" />
        <rect x="98" y="76" width="84" height="78" rx="28" fill="url(#plate)" />
        <rect x="108" y="98" width="64" height="20" rx="10" fill="#070806" />
        <g clipPath="url(#visorClip)">
          {live ? (
            <rect className="sweep" x="92" y="98" width="16" height="20" fill="#c8f54a" />
          ) : (
            <rect x="116" y="105" width="26" height="6" rx="3" fill="#c8f54a" />
          )}
        </g>
        <rect x="122" y="128" width="36" height="3" rx="1.5" fill="#e7a15a" opacity="0.9" />

        <line
          x1="140"
          y1="56"
          x2="140"
          y2="34"
          stroke="#cfc6b6"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="140" cy="28" r="5" fill={live ? "#c8f54a" : "#e7a15a"} />

        <ellipse cx="140" cy="296" rx="54" ry="7" fill="#000" opacity="0.28" />
      </svg>
    </div>
  );
}
