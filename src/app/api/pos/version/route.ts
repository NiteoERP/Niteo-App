import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'downloads', 'version.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
    return NextResponse.json(
      {
        version: '1.0.0',
        download_url: 'https://niteo-app.vercel.app/downloads/niteo-pos-setup.exe',
        changelog: [],
        mandatory: false,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 });
  }
}
