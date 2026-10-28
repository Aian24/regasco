import { NextResponse } from 'next/server';
import { getRoadRoute } from '@/lib/routing';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromLat = parseFloat(searchParams.get('fromLat') || '14.6852');
  const fromLng = parseFloat(searchParams.get('fromLng') || '121.0368');
  const toLat = parseFloat(searchParams.get('toLat') || '14.6585');
  const toLng = parseFloat(searchParams.get('toLng') || '121.0252');

  try {
    const route = await getRoadRoute([fromLat, fromLng], [toLat, toLng]);
    return NextResponse.json(route);
  } catch (error) {
    console.error('Route calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to compute road route' },
      { status: 500 }
    );
  }
}
