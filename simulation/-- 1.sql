-- 1. Create Audit Logs Table (For History)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50),
    details TEXT,
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Rooms Table (For Managing Rooms)
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    calibration_offset DECIMAL(4,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add Default Rooms (So your dashboard isn't empty)
INSERT INTO rooms (name) VALUES ('Vaccine Room'), ('Packaging Hall') 
ON CONFLICT DO NOTHING;