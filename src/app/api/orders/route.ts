import { NextResponse } from 'next/server';
import { getOrders, saveOrders, getStoreSettings } from '@/lib/serverStore';
import { isNeonConfigured, getNeonOrders } from '@/lib/db';
import { Order } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const id = searchParams.get('id');

  let orders = getOrders();
  if (isNeonConfigured()) {
    try {
      const neonOrders = await getNeonOrders();
      if (neonOrders !== null) {
        orders = neonOrders;
      }
    } catch (e) {
      console.warn('Neon orders fetch fallback to local store', e);
    }
  }

  if (code) {
    const order = orders.find(
      (o) => o.orderCode.toLowerCase() === code.trim().toLowerCase()
    );
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ order });
  }

  if (id) {
    const order = orders.find((o) => o.id === id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ order });
  }

  // Return sorted orders (latest first)
  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return NextResponse.json({ orders: sorted });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      location,
      items,
      paymentMethod,
      paymentScreenshot,
      paymentRefNumber,
      notes,
    } = body;

    if (!customerName || !customerPhone || !location?.address || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required order fields' },
        { status: 400 }
      );
    }

    const settings = getStoreSettings();

    // Calculate subtotal
    const subtotal = items.reduce(
      (sum: number, item: { unitPrice: number; quantity: number }) =>
        sum + item.unitPrice * item.quantity,
      0
    );

    // Delivery fee
    const deliveryFee =
      subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
    const totalAmount = subtotal + deliveryFee;

    // Generate random 4-digit order code e.g. REG-4921
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `REG-${randomDigits}`;

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      location: {
        address: location.address.trim(),
        landmark: location.landmark?.trim() || '',
        latitude: location.latitude || 14.6852,
        longitude: location.longitude || 121.0368,
      },
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PENDING_VERIFICATION',
      paymentScreenshot: paymentScreenshot || undefined,
      paymentRefNumber: paymentRefNumber?.trim() || undefined,
      orderStatus: paymentMethod === 'COD' ? 'ORDER_CONFIRMED' : 'PENDING_PAYMENT',
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const currentOrders = getOrders();
    currentOrders.unshift(newOrder);
    saveOrders(currentOrders);

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error) {
    console.error('Failed to create order', error);
    return NextResponse.json(
      { error: 'Internal server error while creating order' },
      { status: 500 }
    );
  }
}
