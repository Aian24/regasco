import { NextResponse } from 'next/server';
import { getProducts, saveProducts } from '@/lib/serverStore';

export async function GET() {
  try {
    const products = getProducts();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Failed to get products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { products } = body;
    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'Products must be an array' }, { status: 400 });
    }
    saveProducts(products);
    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('Failed to save products:', error);
    return NextResponse.json({ error: 'Failed to update products' }, { status: 500 });
  }
}
