import { NextResponse } from 'next/server';
import {
  getStoreSettings,
  saveStoreSettings,
  getProducts,
  saveProducts,
  getCustomers,
} from '@/lib/serverStore';

export async function GET() {
  const settings = getStoreSettings();
  const products = getProducts();
  const customers = getCustomers();
  return NextResponse.json({ settings, products, customers });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { settings, products } = body;

    if (settings) {
      saveStoreSettings(settings);
    }
    if (products) {
      saveProducts(products);
    }

    return NextResponse.json({
      success: true,
      settings: getStoreSettings(),
      products: getProducts(),
    });
  } catch (error) {
    console.error('Failed to save settings', error);
    return NextResponse.json(
      { error: 'Failed to update store settings' },
      { status: 500 }
    );
  }
}
