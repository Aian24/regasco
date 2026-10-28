import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/serverStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riderId = searchParams.get('riderId');

  try {
    const orders = getOrders();

    if (riderId) {
      // Find orders specifically assigned to this rider
      const assigned = orders.filter((o) => o.assignedRider?.id === riderId);

      // Separate active vs delivered
      const active = assigned.filter(
        (o) => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'
      );
      const delivered = assigned.filter((o) => o.orderStatus === 'DELIVERED');

      // Unassigned orders ready for pickup / delivery
      const availableForPickup = orders.filter(
        (o) =>
          !o.assignedRider &&
          (o.orderStatus === 'ORDER_CONFIRMED' || o.orderStatus === 'PREPARING')
      );

      return NextResponse.json({
        active,
        delivered,
        availableForPickup,
      });
    }

    // If no riderId provided, return all active dispatch orders
    const activeDispatches = orders.filter(
      (o) => o.orderStatus === 'OUT_FOR_DELIVERY' || o.orderStatus === 'PREPARING'
    );

    return NextResponse.json({ orders: activeDispatches });
  } catch (error) {
    console.error('Failed to get rider orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rider orders' },
      { status: 500 }
    );
  }
}
