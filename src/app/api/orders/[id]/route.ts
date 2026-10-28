import { NextResponse } from 'next/server';
import { getOrders, saveOrders } from '@/lib/serverStore';
import { isNeonConfigured, getNeonOrders } from '@/lib/db';
import { OrderStatus } from '@/types';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  let orders = getOrders();
  if (isNeonConfigured()) {
    try {
      const neonOrders = await getNeonOrders();
      if (neonOrders !== null) {
        orders = neonOrders;
      }
    } catch (e) {}
  }

  const order = orders.find((o) => o.id === id || o.orderCode === id);

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const {
      orderStatus,
      paymentStatus,
      notes,
      assignedRider,
      rejectReason,
      riderCoordinates,
      safetyCheckVerified,
    } = body;

    const orders = getOrders();
    const index = orders.findIndex((o) => o.id === id || o.orderCode === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentOrder = orders[index];
    const updatedOrder = {
      ...currentOrder,
      ...(orderStatus && { orderStatus: orderStatus as OrderStatus }),
      ...(paymentStatus && { paymentStatus }),
      ...(notes !== undefined && { notes }),
      ...(assignedRider !== undefined && { assignedRider }),
      ...(rejectReason !== undefined && { rejectReason }),
      ...(riderCoordinates !== undefined && { riderCoordinates }),
      ...(safetyCheckVerified !== undefined && { safetyCheckVerified }),
      updatedAt: new Date().toISOString(),
    };

    orders[index] = updatedOrder;
    saveOrders(orders);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Failed to update order', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
