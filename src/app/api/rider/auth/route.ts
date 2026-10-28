import { NextResponse } from 'next/server';
import { getStoreSettings } from '@/lib/serverStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, pin } = body;

    if (!identifier || !pin) {
      return NextResponse.json(
        { error: 'Please enter your phone number / rider ID and 4-digit PIN' },
        { status: 400 }
      );
    }

    const settings = getStoreSettings();
    const riders = settings.riders || [];

    const cleanInput = identifier.trim().toLowerCase().replace(/[\s-]/g, '');

    const matchedRider = riders.find((r) => {
      const cleanPhone = (r.phone || '').toLowerCase().replace(/[\s-]/g, '');
      const cleanPlate = (r.plateNumber || '').toLowerCase().replace(/[\s-]/g, '');
      const cleanUsername = (r.username || '').toLowerCase().replace(/[\s-]/g, '');
      const cleanId = (r.id || '').toLowerCase().replace(/[\s-]/g, '');

      return (
        cleanInput === cleanPhone ||
        cleanInput === cleanPlate ||
        cleanInput === cleanUsername ||
        cleanInput === cleanId
      );
    });

    if (!matchedRider) {
      return NextResponse.json(
        { error: 'Rider account not found. Please verify your phone number or plate number.' },
        { status: 404 }
      );
    }

    // Default PIN fallback is 1234
    const validPin = matchedRider.pin || '1234';
    if (pin.trim() !== validPin) {
      return NextResponse.json(
        { error: 'Incorrect 4-digit PIN. Please try again.' },
        { status: 401 }
      );
    }

    // Return sanitized rider session info
    const sessionRider = {
      id: matchedRider.id,
      name: matchedRider.name,
      phone: matchedRider.phone,
      plateNumber: matchedRider.plateNumber,
      status: matchedRider.status || 'AVAILABLE',
    };

    return NextResponse.json({
      success: true,
      rider: sessionRider,
      message: `Welcome back, ${matchedRider.name}!`,
    });
  } catch (error) {
    console.error('Rider authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication service error' },
      { status: 500 }
    );
  }
}
