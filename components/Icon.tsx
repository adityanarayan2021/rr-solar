type Props = { name: string; className?: string };

const paths: Record<string, React.ReactNode> = {
  panel: (
    <>
      <path d="M3 16h18l-2.2-9.2A2 2 0 0 0 16.85 5H7.15a2 2 0 0 0-1.95 1.8L3 16Z" />
      <path d="M12 5v11M4.6 10.5h14.8M10 20h4M12 16v4" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 10.5 12 4l8.5 6.5V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-8.5Z" />
      <path d="M9.5 13.5h5v6h-5z" />
    </>
  ),
  factory: (
    <>
      <path d="M3 20V9l5.5 3.5V9L14 12.5V6h3.2a1 1 0 0 1 1 .9L20 20H3Z" />
      <path d="M7 16h1.5M11.5 16H13M16 16h1.5" />
    </>
  ),
  pump: (
    <>
      <path d="M5 5h7a4 4 0 0 1 4 4v1" />
      <path d="M4 4h2M14.5 10h3.5" />
      <path d="M16.2 14.4c0 1.6 1.3 2.6 2.6 2.6s2.6-1 2.6-2.6c0-1.6-2.6-4.4-2.6-4.4s-2.6 2.8-2.6 4.4Z" />
      <path d="M8.5 5v15" />
    </>
  ),
  meter: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M7.5 15.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
      <path d="M12 15.5 15 12.5" />
    </>
  ),
  streetlight: (
    <>
      <path d="M5 20V8" />
      <path d="M5 8h6.5a3.5 3.5 0 0 1 3.5 3.5V13" />
      <path d="M11.5 13h7l-1.5 3.5h-4L11.5 13Z" />
      <path d="M3 20h4" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18.01 5.99l-1.56 1.56M7.55 16.45l-1.56 1.56M18.01 18.01l-1.56-1.56M7.55 7.55 5.99 5.99" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7" />
      <path d="m8.5 11 1.3 1.3 2.2-2.4M8.5 16l1.3 1.3 2.2-2.4M14.8 11h2.2M14.8 16h2.2" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
      <path d="M8 8h2M14 8h2M8 12h2M14 12h2M10.5 20.5v-4h3v4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 5.8v5.4c0 4.3 2.9 8.1 7 9.3 4.1-1.2 7-5 7-9.3V5.8L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  phone: <path d="M5 3.5h3.2l1.6 4-2 1.4a12.5 12.5 0 0 0 5.8 5.8l1.4-2 4 1.6V18a2.5 2.5 0 0 1-2.7 2.5C9.6 19.8 4.2 14.4 3.5 6.2A2.5 2.5 0 0 1 5 3.5Z" />,
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.8 7 8.2 6 8.2-6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.6 12h16.8M12 3.5c4.5 4.7 4.5 12.3 0 17-4.5-4.7-4.5-12.3 0-17Z" />
    </>
  ),
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6" />
    </>
  ),
};

export default function Icon({ name, className = 'h-6 w-6' }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] ?? paths.sun}
    </svg>
  );
}
