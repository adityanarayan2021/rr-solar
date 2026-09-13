import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'RR Solar Solutions — Complete Solar Energy Partner, Lucknow';

/** Generated at build time, so link previews on WhatsApp, LinkedIn and X
 *  show a branded card instead of a bare URL. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0E2A5C 0%, #071634 100%)',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 8, background: '#F5911E', borderRadius: 4 }} />
          <div style={{ color: '#F5911E', fontSize: 24, fontWeight: 700, letterSpacing: 4 }}>MNRE APPROVED</div>
        </div>

        <div style={{ display: 'flex', fontSize: 82, fontWeight: 900, color: '#fff', marginTop: 28, letterSpacing: -2 }}>
          R R&nbsp;<span style={{ color: '#F5911E' }}>SOLAR</span>&nbsp;SOLUTIONS
        </div>

        <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 30, marginTop: 20 }}>
          Complete Solar Energy Partner · Lucknow, Uttar Pradesh
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 48, flexWrap: 'wrap' }}>
          {['Rooftop Solar', 'Commercial & Industrial', 'Net Metering', 'EPC Turnkey'].map((t) => (
            <div
              key={t}
              style={{
                display: 'flex',
                border: '2px solid rgba(255,255,255,0.22)',
                borderRadius: 999,
                padding: '12px 26px',
                color: '#fff',
                fontSize: 24,
              }}
            >
              {t}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', color: '#2E9E4F', fontSize: 30, fontWeight: 700, marginTop: 48 }}>
          Go Solar Today — Save Money, Save Environment
        </div>
      </div>
    ),
    size,
  );
}
