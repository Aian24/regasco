import { NextResponse } from 'next/server';
import { getStoreSettings, saveStoreSettings } from '@/lib/serverStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { riderId, status } = body;

    if (!riderId || !status) {
      return NextResponse.json(
        { error: 'Missing riderId or status' },
        { status: 400 }
      );
    }

    const settings = getStoreSettings();
    if (!settings.riders) {
      return NextResponse.json({ error: 'No riders configured' }, { status: 404 });
    }

    const rider = settings.riders.find((r) => r.id === riderId);
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    rider.status = status;
    saveStoreSettings(settings);

    return NextResponse.json({ success: true, rider });
  } catch (error) {
    console.error('Failed to update rider status:', error);
    return NextResponse.json(
      { error: 'Failed to update rider status' },
      { status: 500 }
    );
  }
}
