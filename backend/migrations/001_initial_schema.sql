-- Blocmerce Phase 1 Initial Database Schema
-- This creates all the tables needed for the ecommerce platform with blockchain integration

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    CONSTRAINT users_wallet_check CHECK (wallet_address IS NULL OR wallet_address ~* '^0x[a-fA-F0-9]{40}$')
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    image_url VARCHAR(500),
    category VARCHAR(100) DEFAULT 'general',
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    blockchain_hash VARCHAR(66),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT products_blockchain_hash_check CHECK (
        blockchain_hash IS NULL OR blockchain_hash ~* '^0x[a-fA-F0-9]{64}$'
    )
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_id VARCHAR(255),
    blockchain_tx VARCHAR(66),
    shipping_address JSONB,
    billing_address JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT orders_payment_status_check CHECK (
        payment_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'shipped', 'delivered')
    ),
    CONSTRAINT orders_blockchain_tx_check CHECK (
        blockchain_tx IS NULL OR blockchain_tx ~* '^0x[a-fA-F0-9]{64}$'
    )
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    blockchain_verified BOOLEAN DEFAULT FALSE,
    blockchain_tx VARCHAR(66),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(product_id, user_id),
    CONSTRAINT reviews_blockchain_tx_check CHECK (
        blockchain_tx IS NULL OR blockchain_tx ~* '^0x[a-fA-F0-9]{64}$'
    ),
    CONSTRAINT reviews_content_length CHECK (LENGTH(content) >= 10)
);

-- Blockchain Records Table
CREATE TABLE IF NOT EXISTS blockchain_records (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    contract_address VARCHAR(42),
    data_hash VARCHAR(66),
    record_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT blockchain_records_tx_hash_check CHECK (tx_hash ~* '^0x[a-fA-F0-9]{64}$'),
    CONSTRAINT blockchain_records_contract_check CHECK (
        contract_address IS NULL OR contract_address ~* '^0x[a-fA-F0-9]{40}$'
    ),
    CONSTRAINT blockchain_records_status_check CHECK (
        status IN ('pending', 'confirmed', 'failed', 'cancelled')
    ),
    CONSTRAINT blockchain_records_type_check CHECK (
        record_type IN ('product', 'review', 'order', 'user')
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_verified ON products(verified);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(blockchain_verified);
CREATE INDEX IF NOT EXISTS idx_blockchain_records_type ON blockchain_records(record_type);
CREATE INDEX IF NOT EXISTS idx_blockchain_records_status ON blockchain_records(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_records_created ON blockchain_records(created_at);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, role, created_at, updated_at) 
VALUES (
    'admin@blocmerce.com', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj05gHKvjYE6', -- bcrypt hash for 'admin123'
    'admin',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, price, category, stock_quantity, created_at) VALUES
    ('Blockchain T-Shirt', 'High-quality cotton t-shirt with blockchain design', 29.99, 'clothing', 100, NOW()),
    ('Crypto Mug', 'Ceramic mug perfect for your morning coffee while trading', 15.99, 'accessories', 50, NOW()),
    ('Smart Contract Book', 'Learn smart contract development with this comprehensive guide', 49.99, 'books', 25, NOW()),
    ('NFT Artwork Print', 'Beautiful print of popular NFT artwork', 89.99, 'art', 10, NOW()),
    ('Hardware Wallet', 'Secure your cryptocurrency with this hardware wallet', 119.99, 'electronics', 30, NOW())
ON CONFLICT DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust username as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO blocmerce_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO blocmerce_user;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Blocmerce database schema created successfully!';
    RAISE NOTICE 'Default admin user: admin@blocmerce.com (password: admin123)';
    RAISE NOTICE 'Sample products have been inserted.';
END $$; 