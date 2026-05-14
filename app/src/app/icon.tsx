import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

async function loadSpaceGrotesk(weight: number): Promise<ArrayBuffer> {
    const css = await fetch(
        `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@${weight}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } },
    ).then((r) => r.text());
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:woff2?|truetype|opentype)'\)/);
    if (!match) throw new Error('Space Grotesk font URL not found');
    return fetch(match[1]).then((r) => r.arrayBuffer());
}

export default async function Icon() {
    const fontData = await loadSpaceGrotesk(700);

    return new ImageResponse(
        (
            <div
                style={{
                    width: 32,
                    height: 32,
                    background: '#3D24A3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingBottom: 5,
                    color: '#FFFFFF',
                    fontSize: 28,
                    fontWeight: 700,
                    fontFamily: 'Space Grotesk',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                }}
            >
                e
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'Space Grotesk',
                    data: fontData,
                    weight: 700,
                    style: 'normal',
                },
            ],
        },
    );
}
