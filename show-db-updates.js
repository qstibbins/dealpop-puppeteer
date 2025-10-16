import { pool } from './db.js';

console.log('\n📊 UPDATED DATABASE RECORDS\n');
console.log('='.repeat(80));

// Get tracked products
const products = await pool.query(`
  SELECT 
    id,
    product_name,
    product_url,
    vendor,
    current_price,
    target_price,
    status,
    updated_at
  FROM tracked_products 
  WHERE user_id = 'test-quinton'
  ORDER BY id DESC
`);

console.log('\n🛍️  TRACKED PRODUCTS (stibbins99@gmail.com):\n');
products.rows.forEach(p => {
  const priceChanged = p.current_price !== p.target_price;
  const belowTarget = p.current_price <= p.target_price;
  
  console.log(`Product ID: ${p.id}`);
  console.log(`  Name: ${p.product_name}`);
  console.log(`  URL: ${p.product_url}`);
  console.log(`  Current Price: $${p.current_price} ${belowTarget ? '🎉 (Below target!)' : ''}`);
  console.log(`  Target Price: $${p.target_price}`);
  console.log(`  Status: ${p.status}`);
  console.log(`  Last Updated: ${p.updated_at}`);
  console.log('');
});

// Get price history
const history = await pool.query(`
  SELECT 
    ph.id,
    tp.product_name,
    ph.price,
    ph.in_stock,
    ph.recorded_at
  FROM price_history ph
  JOIN tracked_products tp ON ph.product_id = tp.id
  WHERE tp.user_id = 'test-quinton'
  ORDER BY ph.recorded_at DESC
  LIMIT 10
`);

console.log('='.repeat(80));
console.log(`\n📈 PRICE HISTORY (Last ${history.rows.length} entries):\n`);
history.rows.forEach(h => {
  console.log(`[${h.recorded_at.toISOString()}] ${h.product_name}: $${h.price}`);
});

// Check alerts
const alerts = await pool.query(`
  SELECT 
    a.id,
    a.product_name,
    a.current_price,
    a.target_price,
    a.status,
    a.created_at
  FROM alerts a
  WHERE a.user_id = 'test-quinton'
  ORDER BY a.created_at DESC
  LIMIT 5
`);

console.log('\n' + '='.repeat(80));
console.log(`\n🔔 ALERTS (Last ${alerts.rows.length} entries):\n`);
if (alerts.rows.length > 0) {
  alerts.rows.forEach(a => {
    console.log(`Alert ID: ${a.id}`);
    console.log(`  Product: ${a.product_name}`);
    console.log(`  Current: $${a.current_price} | Target: $${a.target_price}`);
    console.log(`  Status: ${a.status}`);
    console.log(`  Created: ${a.created_at}`);
    console.log('');
  });
} else {
  console.log('  No alerts found (they may not have been created yet)\n');
}

console.log('='.repeat(80));
console.log('\n✅ Database query complete!\n');

await pool.end();

