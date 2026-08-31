import { ImageResponse } from 'next/og';

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sizeParam = searchParams.get('size') || '512';
  const size = parseInt(sizeParam, 10);
  const fontSize = size / 2;
  const borderRadius = size / 4;

  return new ImageResponse(
    (
      <div style={{ background: '#2563eb', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize, fontWeight: 800, borderRadius }}>
        F
      </div>
    ),
    { width: size, height: size }
  );
}
