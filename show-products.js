import { pool } from './db.js';

const result = await pool.query(`
  SELECT 
    id,
    user_id,
    product_url,
    product_name,
    product_image_url,
    brand,
    color,
    capacity,
    vendor,
    current_price,
    target_price,
    status,
    expires_at,
    extracted_at,
    created_at,
    updated_at
  FROM tracked_products 
  WHERE user_id = 'b5e7wHFfyZg2On72tL0mAMScGmO2'
  ORDER BY id DESC
`);

console.log('\n📦 ALL DATA FOR PRODUCTS ADDED TO stibbins99@gmail.com:\n');
console.log('='.repeat(80));

result.rows.forEach((row, i) => {
  console.log(`\n🛍️  PRODUCT ${i + 1}:`);
  console.log('─'.repeat(80));
  Object.entries(row).forEach(([key, value]) => {
    const displayValue = value === null ? '(null)' : value;
    console.log(`  ${key.padEnd(20)}: ${displayValue}`);
  });
  console.log('='.repeat(80));
});

console.log(`\n📊 Total products: ${result.rows.length}\n`);

await pool.end();

