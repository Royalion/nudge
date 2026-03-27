import svgPaths from "./svg-ouag2489bx";

export default function Subtract() {
  return (
    <div className="relative size-full" data-name="Subtract">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Subtract">
          <path d={svgPaths.pf24700} fill="url(#paint0_radial_54_18)" />
          <path d={svgPaths.p3dc95c00} fill="url(#paint1_radial_54_18)" />
          <path d={svgPaths.p326a8b00} stroke="url(#paint2_radial_54_18)" strokeOpacity="0.1" strokeWidth="0.5" />
        </g>
        <defs>
          <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id="paint0_radial_54_18" r="1">
            <stop stopColor="#56EFFF" />
            <stop offset="1" stopColor="#004A53" />
          </radialGradient>
          <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id="paint1_radial_54_18" r="1">
            <stop stopColor="#56EFFF" />
            <stop offset="1" stopColor="#004A53" />
          </radialGradient>
          <radialGradient cx="0" cy="0" gradientTransform="translate(24 24) rotate(90) scale(24)" gradientUnits="userSpaceOnUse" id="paint2_radial_54_18" r="1">
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}