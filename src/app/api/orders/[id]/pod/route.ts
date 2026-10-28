import { NextResponse } from 'next/server';
import { getOrders, saveOrders, getStoreSettings, saveStoreSettings } from '@/lib/serverStore';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const { proofPhoto, notes, codCollected } = body;

    const orders = getOrders();
    const index = orders.findIndex((o) => o.id === id || o.orderCode === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentOrder = orders[index];
    const riderId = currentOrder.assignedRider?.id;

    // Update order status to DELIVERED
    const updatedOrder = {
      ...currentOrder,
      orderStatus: 'DELIVERED' as const,
      paymentStatus: (codCollected ? 'PAID' : currentOrder.paymentStatus) as any,
      safetyCheckVerified: true,
      notes: notes
        ? `${currentOrder.notes || ''} [POD: ${notes}]`.trim()
        : currentOrder.notes,
      paymentScreenshot: proofPhoto || currentOrder.paymentScreenshot,
      updatedAt: new Date().toISOString(),
    };

    orders[index] = updatedOrder;
    saveOrders(orders);

    // Free up the rider in store settings
    if (riderId) {
      const settings = getStoreSettings();
      if (settings.riders) {
        const rider = settings.riders.find((r) => r.id === riderId);
        if (rider) {
          rider.status = 'AVAILABLE';
          saveStoreSettings(settings);
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Proof of Delivery recorded and order marked DELIVERED',
    });
  } catch (error) {
    console.error('Failed to submit Proof of Delivery:', error);
    return NextResponse.json(
      { error: 'Failed to record Proof of Delivery' },
      { status: 500 }
    );
  }
}
