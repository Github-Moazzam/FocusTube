import { ImageResponse } from 'next/og';
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';
export default function Icon() {
  return new ImageResponse(
    <div style={{ background: '#2563eb', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 96, fontWeight: 800, borderRadius: 48 }}>F</div>,
    { ...size }
  );
}
