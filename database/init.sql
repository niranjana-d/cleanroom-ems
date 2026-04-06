CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'supervisor', 'operator')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'green', -- green, yellow, red
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    temp_min DECIMAL(5,2) DEFAULT 18.00,
    temp_max DECIMAL(5,2) DEFAULT 24.00,
    humidity_min DECIMAL(5,2) DEFAULT 30.00,
    humidity_max DECIMAL(5,2) DEFAULT 60.00,
    press_min DECIMAL(5,2) DEFAULT 10.00,
    press_max DECIMAL(5,2) DEFAULT 50.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    pressure DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    parameter VARCHAR(50),
    value DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'active', -- active, acknowledged, resolved
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_logs (
    id SERIAL PRIMARY KEY,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20),
    method VARCHAR(50)
);

-- SEED DATA
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin User', 'admin@ems.com', '$2b$10$X7V...hashedpassword...', 'admin'); -- pw: admin123

INSERT INTO rooms (name) VALUES ('Cleanroom A (Filling)'), ('Cleanroom B (Packaging)');
INSERT INTO settings (room_id) VALUES (1), (2);

-- Batch Tracking Table
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    batch_code VARCHAR(50) NOT NULL,
    room_id INTEGER REFERENCES rooms(id),
    product_name VARCHAR(100),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in-progress'
);

