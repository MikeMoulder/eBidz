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
                    background: 'linear-gradient(135deg, #6D45FF 0%, #4A2FBF 100%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-end',
                    padding: 4,
                    borderRadius: 8,
                }}
            >
                <div
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        background: '#F1A1FF',
                    }}
                />
            </div>
        ),
        { ...size },
    );
}
