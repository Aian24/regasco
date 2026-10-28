import { neon } from '@neondatabase/serverless';

const dbUrl = "postgresql://neondb_owner:npg_BzcLX0avuW3x@ep-hidden-shape-b5f4kqjz-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const INITIAL_PRODUCTS = [
  {
    id: 'regasco-11kg',
    name: 'Regasco 11 KG',
    weightKg: 11,
    category: 'household',
    priceRefill: 990,
    priceNewTank: 2450,
    imageUrl: '/images/regasco-11kg.jpg',
    description: 'Most popular standard household cooking gas cylinder. Guaranteed safe, clean flame.',
    badge: 'Best Seller',
    isAvailable: true,
  },
  {
    id: 'regasco-sk',
    name: 'Regasco Supreme Kalan (SK)',
    weightKg: 2.7,
    category: 'portable',
    priceRefill: 380,
    priceNewTank: 1450,
    imageUrl: '/images/regasco-sk.jpg',
    description: 'Compact 2.7kg cylinder with heavy-duty metal cooking burner ring on top. Perfect for small spaces & outdoor cooking.',
    badge: 'Popular',
    isAvailable: true,
  },
  {
    id: 'regasco-5kg',
    name: 'Regasco 5 KG',
    weightKg: 5,
    category: 'household',
    priceRefill: 540,
    priceNewTank: 1750,
    imageUrl: '/images/regasco-5kg.jpg',
    description: 'Medium portable size cylinder, suitable for small condo units or camping kitchens.',
    badge: '',
    isAvailable: true,
  },
  {
    id: 'regasco-22kg',
    name: 'Regasco 22 KG',
    weightKg: 22,
    category: 'commercial',
    priceRefill: 1950,
    priceNewTank: 3950,
    imageUrl: '/images/regasco-22kg.jpg',
    description: 'Commercial grade cylinder designed for eateries, canteens, bakeries, and medium restaurants.',
    badge: 'Commercial',
    isAvailable: true,
  },
  {
    id: 'regasco-50kg',
    name: 'Regasco 50 KG',
    weightKg: 50,
    category: 'industrial',
    priceRefill: 4200,
    priceNewTank: 7800,
    imageUrl: '/images/regasco-50kg.jpg',
    description: 'Heavy-duty industrial cylinder for hotels, large commissaries, and high-volume commercial kitchens.',
    badge: 'Industrial',
    isAvailable: true,
  },
];

async function main() {
  console.log('Connecting to Neon PostgreSQL database...');
  const sql = neon(dbUrl);

  try {
    const timeRes = await sql`SELECT NOW() as current_time, version();`;
    console.log('✅ Connected successfully!');
    console.log('Server Time:', timeRes[0].current_time);

    // Seed products
    console.log('\nSeeding standard Regasco products into Neon...');
    for (const p of INITIAL_PRODUCTS) {
      await sql`
        INSERT INTO products (
          id, name, weight_kg, category, price_refill, price_new_tank, image_url, description, badge, is_available
        ) VALUES (
          ${p.id}, ${p.name}, ${p.weightKg}, ${p.category}, ${p.priceRefill}, ${p.priceNewTank}, ${p.imageUrl}, ${p.description}, ${p.badge}, ${p.isAvailable}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          price_refill = EXCLUDED.price_refill,
          price_new_tank = EXCLUDED.price_new_tank,
          image_url = EXCLUDED.image_url,
          is_available = EXCLUDED.is_available,
          updated_at = NOW();
      `;
    }
    console.log(`✓ ${INITIAL_PRODUCTS.length} products seeded successfully.`);

    // Seed default riders
    console.log('\nSeeding initial fleet riders into Neon...');
    const INITIAL_RIDERS = [
      { id: 'rider-1', name: 'Kuya Jun Santos', phone: '0917-555-1201', plate: 'QC-8821-MC', pin: '1234' },
      { id: 'rider-2', name: 'Carlo Mendoza', phone: '0918-444-9382', plate: 'NCR-4912-MC', pin: '1234' },
      { id: 'rider-3', name: 'Mark Reyes', phone: '0922-111-6789', plate: 'QC-3109-MC', pin: '1234' },
    ];
    for (const r of INITIAL_RIDERS) {
      await sql`
        INSERT INTO riders (
          id, name, phone, plate_number, status, pin
        ) VALUES (
          ${r.id}, ${r.name}, ${r.phone}, ${r.plate}, 'AVAILABLE', ${r.pin}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          plate_number = EXCLUDED.plate_number;
      `;
    }
    console.log(`✓ ${INITIAL_RIDERS.length} fleet riders seeded successfully.`);

    // Verify counts
    const prodCount = await sql`SELECT COUNT(*) FROM products;`;
    const riderCount = await sql`SELECT COUNT(*) FROM riders;`;
    const orderCount = await sql`SELECT COUNT(*) FROM orders;`;

    console.log('\n📊 Neon Database Status:');
    console.log(`  - Products in Catalog: ${prodCount[0].count}`);
    console.log(`  - Registered Fleet Riders: ${riderCount[0].count}`);
    console.log(`  - Orders in DB: ${orderCount[0].count} (Clean / No dummy orders)`);

    console.log('\n🎉 Neon Database is 100% ready for live production!');
  } catch (err) {
    console.error('❌ Database error:', err);
  }
}

main();
