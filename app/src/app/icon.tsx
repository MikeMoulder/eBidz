import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 32,
                    height: 32,
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                }}
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 28 28"
                    fill="none"
                >
                    <defs>
                        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F1A1FF" />
                            <stop offset="100%" stopColor="#6D45FF" />
                        </linearGradient>
                    </defs>
                    {/* outer frame */}
                    <rect x="0.5" y="0.5" width="27" height="27" stroke="url(#g)" strokeWidth="1" fill="none" />
                    {/* "e" — 3 horizontal bars */}
                    <rect x="5" y="6" width="18" height="3" fill="url(#g)" />
                    <rect x="5" y="12.5" width="11" height="3" fill="url(#g)" />
                    <rect x="5" y="19" width="18" height="3" fill="url(#g)" />
                    {/* seal dot */}
                    <circle cx="23" cy="14" r="1.5" fill="#F1A1FF" />
                </svg>
            </div>
        ),
        { ...size },
    );
}
