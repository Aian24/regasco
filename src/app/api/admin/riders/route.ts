import { NextResponse } from 'next/server';
import { getStoreSettings, saveStoreSettings, getOrders } from '@/lib/serverStore';
import { DispatchRider } from '@/types';

// GET /api/admin/riders - Retrieve all registered fleet riders with mission counts
export async function GET() {
  try {
    const settings = getStoreSettings();
    const orders = getOrders();
    const riders = settings.riders || [];

    const enrichedRiders = riders.map((r) => {
      const activeCount = orders.filter(
        (o) =>
          o.assignedRider?.id === r.id &&
          (o.orderStatus === 'OUT_FOR_DELIVERY' || o.orderStatus === 'PREPARING')
      ).length;

      return {
        ...r,
        pin: r.pin || '1234',
        activeMissionsCount: activeCount,
      };
    });

    return NextResponse.json({ success: true, riders: enrichedRiders });
  } catch (error) {
    console.error('Failed to load riders list:', error);
    return NextResponse.json({ error: 'Failed to load fleet riders' }, { status: 500 });
  }
}

// POST /api/admin/riders - Create new Fleet Rider Account
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, plateNumber, pin, username, status } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Rider full name is required.' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Rider mobile phone number is required.' }, { status: 400 });
    }
    if (!plateNumber || !plateNumber.trim()) {
      return NextResponse.json({ error: 'Vehicle plate number is required.' }, { status: 400 });
    }

    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const cleanPlate = plateNumber.trim().toUpperCase();

    const settings = getStoreSettings();
    const existingRiders = settings.riders || [];

    // Check for duplicate phone or plate number
    const duplicatePhone = existingRiders.find(
      (r) => (r.phone || '').replace(/[\s-]/g, '') === cleanPhone
    );
    if (duplicatePhone) {
      return NextResponse.json(
        { error: `Phone number is already registered to rider "${duplicatePhone.name}".` },
        { status: 400 }
      );
    }

    const duplicatePlate = existingRiders.find(
      (r) => (r.plateNumber || '').trim().toUpperCase() === cleanPlate
    );
    if (duplicatePlate) {
      return NextResponse.json(
        { error: `Plate number "${cleanPlate}" is already registered to rider "${duplicatePlate.name}".` },
        { status: 400 }
      );
    }

    const newRider: DispatchRider = {
      id: `rider-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      plateNumber: cleanPlate,
      status: (status as any) || 'AVAILABLE',
      pin: pin && pin.trim().length === 4 ? pin.trim() : '1234',
      username: username?.trim() || cleanPlate.toLowerCase(),
    };

    const updatedRiders = [...existingRiders, newRider];
    settings.riders = updatedRiders;
    saveStoreSettings(settings);

    return NextResponse.json({
      success: true,
      rider: newRider,
      riders: updatedRiders,
      message: `Rider account for ${newRider.name} created successfully! PIN is ${newRider.pin}.`,
    });
  } catch (error) {
    console.error('Failed to create rider account:', error);
    return NextResponse.json({ error: 'Failed to create rider account' }, { status: 500 });
  }
}

// PATCH /api/admin/riders - Update Rider Details or Reset PIN
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, phone, plateNumber, pin, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rider ID is required.' }, { status: 400 });
    }

    const settings = getStoreSettings();
    const riders = settings.riders || [];
    const index = riders.findIndex((r) => r.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Rider account not found.' }, { status: 404 });
    }

    const target = riders[index];

    // Check unique phone if changed
    if (phone && phone.trim() !== target.phone) {
      const cleanPhone = phone.trim().replace(/[\s-]/g, '');
      const duplicate = riders.find(
        (r) => r.id !== id && (r.phone || '').replace(/[\s-]/g, '') === cleanPhone
      );
      if (duplicate) {
        return NextResponse.json(
          { error: `Phone number is already assigned to "${duplicate.name}".` },
          { status: 400 }
        );
      }
    }

    // Check unique plate if changed
    if (plateNumber && plateNumber.trim().toUpperCase() !== target.plateNumber.toUpperCase()) {
      const cleanPlate = plateNumber.trim().toUpperCase();
      const duplicate = riders.find(
        (r) => r.id !== id && (r.plateNumber || '').trim().toUpperCase() === cleanPlate
      );
      if (duplicate) {
        return NextResponse.json(
          { error: `Plate number "${cleanPlate}" is already assigned to "${duplicate.name}".` },
          { status: 400 }
        );
      }
    }

    const updatedRider: DispatchRider = {
      ...target,
      name: name !== undefined ? name.trim() : target.name,
      phone: phone !== undefined ? phone.trim() : target.phone,
      plateNumber: plateNumber !== undefined ? plateNumber.trim().toUpperCase() : target.plateNumber,
      pin: pin !== undefined && pin.trim().length === 4 ? pin.trim() : target.pin || '1234',
      status: status !== undefined ? status : target.status,
    };

    riders[index] = updatedRider;
    settings.riders = riders;
    saveStoreSettings(settings);

    return NextResponse.json({
      success: true,
      rider: updatedRider,
      riders,
      message: `Rider account for ${updatedRider.name} updated successfully!`,
    });
  } catch (error) {
    console.error('Failed to update rider:', error);
    return NextResponse.json({ error: 'Failed to update rider account' }, { status: 500 });
  }
}

// DELETE /api/admin/riders - Delete Rider Account
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rider ID is required.' }, { status: 400 });
    }

    const orders = getOrders();
    const hasActiveDelivery = orders.some(
      (o) => o.assignedRider?.id === id && o.orderStatus === 'OUT_FOR_DELIVERY'
    );

    if (hasActiveDelivery) {
      return NextResponse.json(
        { error: 'Cannot delete rider while they have an active delivery in transit.' },
        { status: 400 }
      );
    }

    const settings = getStoreSettings();
    const currentRiders = settings.riders || [];
    const filtered = currentRiders.filter((r) => r.id !== id);

    if (filtered.length === currentRiders.length) {
      return NextResponse.json({ error: 'Rider not found.' }, { status: 404 });
    }

    settings.riders = filtered;
    saveStoreSettings(settings);

    return NextResponse.json({
      success: true,
      riders: filtered,
      message: 'Rider account successfully removed.',
    });
  } catch (error) {
    console.error('Failed to delete rider:', error);
    return NextResponse.json({ error: 'Failed to delete rider account' }, { status: 500 });
  }
}
