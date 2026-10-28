import { NextResponse } from 'next/server';
import { updateRiderTelemetry } from '@/lib/serverStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { riderId, orderId, latitude, longitude, speed, heading } = body;

    if (!riderId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required location parameters (riderId, latitude, longitude)' },
        { status: 400 }
      );
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    updateRiderTelemetry(
      riderId,
      [lat, lng],
      orderId || undefined,
      speed !== undefined ? Number(speed) : undefined,
      heading !== undefined ? Number(heading) : undefined
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      coordinates: [lat, lng],
    });
  } catch (error) {
    console.error('Failed to update rider location:', error);
    return NextResponse.json(
      { error: 'Failed to record rider location' },
      { status: 500 }
    );
  }
}
