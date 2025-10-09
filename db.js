import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Only use SSL if DB_SSL is explicitly set to 'true' or 'require'
  ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL === 'require' 
    ? { rejectUnauthorized: false } 
    : false
});

// Export the pool for direct access
export { pool };

// Create a db object with the methods that the routes expect
export const db = {
  any: async (query, params) => {
    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },
  
  one: async (query, params) => {
    try {
      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        throw new Error('No data returned from the query');
      }
      if (result.rows.length > 1) {
        throw new Error('Multiple rows returned when only one expected');
      }
      return result.rows[0];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },
  
  oneOrNone: async (query, params) => {
    try {
      const result = await pool.query(query, params);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },
  
  none: async (query, params) => {
    try {
      await pool.query(query, params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
};

export async function createTables() {
  await pool.query(`
    -- Users table (extends Firebase Auth)
    CREATE TABLE IF NOT EXISTS users (
      firebase_uid VARCHAR PRIMARY KEY,  -- From Firebase Auth
      email VARCHAR NOT NULL,
      display_name VARCHAR,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Enhanced tracked products table
    CREATE TABLE IF NOT EXISTS tracked_products (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(firebase_uid) ON DELETE CASCADE,
      product_url TEXT NOT NULL,
      product_name VARCHAR NOT NULL,
      product_image_url TEXT,
      brand VARCHAR,
      color VARCHAR,
      capacity VARCHAR,
      vendor VARCHAR NOT NULL,
      current_price DECIMAL(10,2),
      target_price DECIMAL(10,2),
      status VARCHAR DEFAULT 'tracking',  -- 'tracking', 'paused', 'completed'
      expires_at TIMESTAMP NOT NULL,
      extracted_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Comprehensive alerts system
    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(firebase_uid) ON DELETE CASCADE,
      product_id INTEGER REFERENCES tracked_products(id) ON DELETE CASCADE,
      product_name VARCHAR NOT NULL,
      product_url TEXT NOT NULL,
      product_image_url TEXT,
      current_price DECIMAL(10,2) NOT NULL,
      target_price DECIMAL(10,2) NOT NULL,
      alert_type VARCHAR NOT NULL, -- 'price_drop', 'price_increase', 'stock_alert', 'expiry_alert'
      status VARCHAR DEFAULT 'active', -- 'active', 'triggered', 'dismissed', 'expired'
      notification_preferences JSONB NOT NULL DEFAULT '{"email": true, "push": true, "sms": false}',
      thresholds JSONB NOT NULL DEFAULT '{"priceDropPercentage": 10, "absolutePriceDrop": 10}',
      expires_at TIMESTAMP,
      triggered_at TIMESTAMP,
      last_checked_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Alert history for tracking all alert events
    CREATE TABLE IF NOT EXISTS alert_history (
      id SERIAL PRIMARY KEY,
      alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
      event_type VARCHAR NOT NULL, -- 'created', 'triggered', 'dismissed', 'updated', 'expired'
      old_price DECIMAL(10,2),
      new_price DECIMAL(10,2),
      price_change DECIMAL(10,2),
      price_change_percentage DECIMAL(5,2),
      message TEXT,
      timestamp TIMESTAMP DEFAULT NOW()
    );
    
    -- User alert preferences
    CREATE TABLE IF NOT EXISTS user_alert_preferences (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(firebase_uid) ON DELETE CASCADE,
      email_notifications BOOLEAN DEFAULT TRUE,
      push_notifications BOOLEAN DEFAULT TRUE,
      sms_notifications BOOLEAN DEFAULT FALSE,
      phone_number VARCHAR(25), -- E.164 format phone number for SMS (e.g., +123456789012345678901)
      phone_verified BOOLEAN DEFAULT FALSE, -- Whether phone number has been verified
      default_price_drop_percentage DECIMAL(5,2) DEFAULT 10.0,
      default_absolute_price_drop DECIMAL(10,2) DEFAULT 10.0,
      check_frequency VARCHAR DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
      quiet_hours JSONB DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00"}',
      timezone VARCHAR DEFAULT 'UTC',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id)
    );
    
    -- Notification logs for tracking all sent notifications
    CREATE TABLE IF NOT EXISTS notification_logs (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(firebase_uid) ON DELETE CASCADE,
      alert_id INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
      notification_type VARCHAR NOT NULL, -- 'price_drop_alert', 'price_increase_alert', 'stock_alert', 'welcome_email', 'price_check_reminder'
      channel VARCHAR NOT NULL, -- 'email', 'push', 'sms'
      status VARCHAR NOT NULL, -- 'sent', 'failed', 'pending'
      sent_at TIMESTAMP,
      provider_response JSONB, -- Store response from email provider
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Price history tracking
    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES tracked_products(id) ON DELETE CASCADE,
      price DECIMAL(10,2) NOT NULL,
      in_stock BOOLEAN DEFAULT TRUE,
      recorded_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Saved searches
    CREATE TABLE IF NOT EXISTS saved_searches (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(firebase_uid) ON DELETE CASCADE,
      name VARCHAR NOT NULL,
      search_query TEXT NOT NULL, -- JSON or search params
      category VARCHAR,
      created_at TIMESTAMP DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE
    );
    
    -- A/B Testing analytics
    CREATE TABLE IF NOT EXISTS ab_test_events (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(firebase_uid) ON DELETE SET NULL,
      session_id VARCHAR NOT NULL,
      test_name VARCHAR NOT NULL, -- 'login_page', 'product_card', etc.
      variant VARCHAR NOT NULL, -- 'original', 'v2', etc.
      event_type VARCHAR NOT NULL, -- 'view', 'signup', 'click', etc.
      event_data JSONB,
      timestamp TIMESTAMP DEFAULT NOW()
    );
    
    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_tracked_products_user_id ON tracked_products(user_id);
    CREATE INDEX IF NOT EXISTS idx_tracked_products_status ON tracked_products(status);
    CREATE INDEX IF NOT EXISTS idx_tracked_products_vendor ON tracked_products(vendor);
    CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_product_id ON alerts(product_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON alert_history(alert_id);
    CREATE INDEX IF NOT EXISTS idx_ab_test_events_test_variant ON ab_test_events(test_name, variant);
    CREATE INDEX IF NOT EXISTS idx_ab_test_events_timestamp ON ab_test_events(timestamp);
    
    -- Full-text search indexes
    CREATE INDEX IF NOT EXISTS idx_tracked_products_search ON tracked_products USING gin(to_tsvector('english', product_name || ' ' || COALESCE(brand, '') || ' ' || COALESCE(vendor, '')));
  `);
}

export async function seed() {
  // Seed users
  await pool.query(`
    INSERT INTO users (firebase_uid, email, display_name)
    VALUES 
      ('test-user-123', 'test@example.com', 'Test User'),
      ('mock-user-456', 'mock@example.com', 'Mock User')
    ON CONFLICT (firebase_uid) DO NOTHING;
  `);

  // Seed tracked products
  await pool.query(`
    INSERT INTO tracked_products (user_id, product_url, product_name, product_image_url, brand, vendor, current_price, target_price, status, expires_at)
    VALUES 
      ('test-user-123', 'https://example.com/product', 'Example Product', 'https://example.com/images/product.jpg', 'ExampleBrand', 'Example Store', 24.99, 19.99, 'tracking', NOW() + INTERVAL '30 days'),
      ('mock-user-456', 'https://amazon.com/mixer', 'Kitchen Mixer', 'https://amazon.com/images/mixer.jpg', 'KitchenPro', 'Amazon', 325.00, 300.00, 'tracking', NOW() + INTERVAL '30 days'),
      ('mock-user-456', 'https://techcorp.com/headphones', 'Bluetooth Headphones', 'https://techcorp.com/images/headphones.jpg', 'TechSound', 'TechCorp', 89.99, 79.99, 'tracking', NOW() + INTERVAL '30 days'),
      ('mock-user-456', 'https://fittech.com/watch', 'Smart Fitness Watch', 'https://fittech.com/images/watch.jpg', 'FitTech', 'FitTech Store', 199.99, 179.99, 'tracking', NOW() + INTERVAL '30 days'),
      ('mock-user-456', 'https://powerplus.com/powerbank', 'Portable Power Bank', 'https://powerplus.com/images/powerbank.jpg', 'PowerPlus', 'PowerPlus Store', 29.99, 25.00, 'tracking', NOW() + INTERVAL '30 days'),
      ('mock-user-456', 'https://beautyco.com/skincare', 'Skincare Cream', 'https://beautyco.com/images/cream.jpg', 'BeautyCo', 'BeautyCo Store', 24.99, 19.99, 'tracking', NOW() + INTERVAL '30 days'),
      ('mock-user-456', 'https://compworld.com/laptop', 'Gaming Laptop', 'https://compworld.com/images/laptop.jpg', 'CompWorld', 'CompWorld Store', 949.99, 899.99, 'tracking', NOW() + INTERVAL '30 days'),
      ('mock-user-456', 'https://homestore.com/sofa', 'Modern Sofa', 'https://homestore.com/images/sofa.jpg', 'HomeStore', 'HomeStore', 749.99, 699.99, 'tracking', NOW() + INTERVAL '30 days')
    ON CONFLICT DO NOTHING;
  `);

  // Seed alerts
  await pool.query(`
    INSERT INTO alerts (user_id, product_id, product_name, product_url, product_image_url, current_price, target_price, alert_type, status, expires_at)
    VALUES 
      ('mock-user-456', 2, 'Kitchen Mixer', 'https://amazon.com/mixer', 'https://amazon.com/images/mixer.jpg', 325.00, 300.00, 'price_drop', 'active', NOW() + INTERVAL '30 days'),
      ('mock-user-456', 3, 'Bluetooth Headphones', 'https://techcorp.com/headphones', 'https://techcorp.com/images/headphones.jpg', 89.99, 79.99, 'price_drop', 'active', NOW() + INTERVAL '30 days'),
      ('test-user-123', 1, 'Example Product', 'https://example.com/product', 'https://example.com/images/product.jpg', 24.99, 19.99, 'price_drop', 'active', NOW() + INTERVAL '30 days')
    ON CONFLICT DO NOTHING;
  `);

  // Seed user alert preferences
  await pool.query(`
    INSERT INTO user_alert_preferences (user_id, email_notifications, push_notifications, sms_notifications)
    VALUES 
      ('test-user-123', true, true, false),
      ('mock-user-456', true, true, true)
    ON CONFLICT (user_id) DO NOTHING;
  `);

  // Seed price history for some products
  await pool.query(`
    INSERT INTO price_history (product_id, price, in_stock, recorded_at)
    VALUES 
      (1, 29.99, true, NOW() - INTERVAL '7 days'),
      (1, 26.99, true, NOW() - INTERVAL '3 days'),
      (1, 24.99, true, NOW()),
      (2, 349.99, true, NOW() - INTERVAL '5 days'),
      (2, 335.00, true, NOW() - INTERVAL '2 days'),
      (2, 325.00, true, NOW()),
      (3, 99.99, true, NOW() - INTERVAL '4 days'),
      (3, 94.99, true, NOW() - INTERVAL '1 day'),
      (3, 89.99, true, NOW())
    ON CONFLICT DO NOTHING;
  `);

  console.log('✅ Database seeded successfully!');
}
