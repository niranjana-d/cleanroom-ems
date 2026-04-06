const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const { Parser } = require('json2csv');
const sendAlertEmail = require('./services/emailService');
const lastEmailTime = {};
// --- 1. CONFIGURATION ---
const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// Database Connection (Updated to match your local setup)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres', // Defaulting to postgres as per your setup
  password: process.env.DB_PASS || 'niranjana',     // Defaulting to admin
  port: 5432,
});

// --- 2. MIDDLEWARE ---
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).send('Access Denied');
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};

const authorize = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).send('Forbidden');
  next();
};

// --- 3. ROUTES: AUTH ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;

  // 🔍 DEBUG: Log the attempt to the terminal so you can see it
  console.log(`👉 LOGIN ATTEMPT: Email="${email}" Password="${password}" Role="${role}"`);

  try {
    // 1. Find user by Email (We ignore Role in the query to avoid mismatches)
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
        console.log("❌ Login Failed: Email not found in database.");
        return res.status(400).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // 2. Simple Password Check (Direct string comparison for hackathon)
    if (user.password !== password) { 
        console.log(`❌ Login Failed: Wrong Password. (Input: ${password} vs DB: ${user.password})`);
        return res.status(400).json({ error: 'Invalid password' });
    }

    // 3. Generate Token
    const token = jwt.sign(
        { id: user.id, role: user.role }, 
        process.env.JWT_SECRET || 'secret', 
        { expiresIn: '8h' }
    );
    
    console.log("✅ LOGIN SUCCESS! Token sent.");
    
    // 4. Send Response (Note: We send back the role FROM THE DATABASE to ensure consistency)
    res.json({ 
        token, 
        user: { id: user.id, name: user.email, role: user.role } 
    });

  } catch (err) { 
    console.error("❌ SERVER ERROR:", err.message);
    res.status(500).json({ error: err.message }); 
  }
});

// --- 4. ROUTES: DASHBOARD & ROOMS (UPDATED FOR LIVE DATA) ---
app.get('/api/rooms', authenticate, async (req, res) => {
  try {
      // Fetches Room Info + Settings + LATEST Reading (Temp, Hum, Pressure)
      const result = await pool.query(`
        SELECT DISTINCT ON (r.id) 
            r.id, r.name, r.status,
            COALESCE(rd.temperature, 0) as temperature, 
            COALESCE(rd.humidity, 0) as humidity,
            COALESCE(rd.pressure, 0) as pressure
        FROM rooms r 
        LEFT JOIN readings rd ON r.id = rd.room_id
        ORDER BY r.id, rd.timestamp DESC
      `);
      res.json(result.rows);
  } catch (err) { res.status(500).json(err); }
});
// --- 4. ROUTES: DASHBOARD & ROOMS ---
app.get('/api/rooms', authenticate, async (req, res) => {
  try {
      // Join with settings to get thresholds
      const result = await pool.query(`
        SELECT r.*, s.temp_min, s.temp_max, s.humidity_max 
        FROM rooms r 
        LEFT JOIN settings s ON r.id = s.room_id 
        ORDER BY r.id ASC
      `);
      res.json(result.rows);
  } catch (err) { res.status(500).json(err); }
});

// --- 5. ROUTES: HISTORY & ALERTS ---
// --- REPLACE THIS BLOCK IN SECTION 5 ---
app.get('/api/data/history/:roomId', authenticate, async (req, res) => {
  try {
      // FIX: Query the 'readings' table (where sensor data lives), NOT 'audit_logs'
      const result = await pool.query(
          'SELECT temperature, humidity, pressure, created_at FROM room_logs WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50', 
          [req.params.roomId]
      );
      
      // Rename 'created_at' to 'timestamp' in the response so the frontend graph doesn't break
       const formattedRows = result.rows.map(row => ({
            ...row,
            timestamp: row.created_at 
        }));

      // Reverse the array so the graph draws correctly (Left=Oldest, Right=Newest)
      res.json(result.rows.reverse()); 
  } catch (err) { 
      console.error("History Error:", err.message);
      res.json([]); 
  }
});

app.get('/api/alerts', authenticate, async (req, res) => {
  try {
      // Joining with rooms to get room names
      // Ensure 'alerts' table exists, or return empty
      const result = await pool.query('SELECT * FROM audit_logs WHERE action_type = $1 ORDER BY timestamp DESC', ['ALERT']);
      res.json(result.rows);
  } catch (err) { res.json([]); }
});

// --- REPLACE THIS BLOCK IN SECTION 5 (server.js) ---
// --- REPLACE THE DELETE BLOCK IN SECTION 5 WITH THIS ---
app.put('/api/alerts/:id/resolve', authenticate, async (req, res) => {
    try {
        // Mark as resolved instead of deleting
        await pool.query("UPDATE audit_logs SET status = 'resolved' WHERE id = $1", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Resolve Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- 6. ROUTES: BATCHES ---
// --- REPLACE SECTION 6: BATCHES ---
app.get('/api/batches', authenticate, async (req, res) => {
    try {
        // Fetch batches + Room Name (Joined)
        const result = await pool.query(`
            SELECT b.*, r.name as room_name 
            FROM batches b 
            LEFT JOIN rooms r ON b.room_id = r.id 
            ORDER BY b.start_time DESC
        `);
        res.json(result.rows);
    } catch (err) { res.json([]); }
});

app.post('/api/batches', authenticate, async (req, res) => {
    const { batchCode, roomId, productName } = req.body;
    try {
        // Insert new batch with Status='in-progress' and StartTime=NOW()
        await pool.query(
            'INSERT INTO batches (batch_code, room_id, product_name, status, start_time) VALUES ($1, $2, $3, $4, NOW())', 
            [batchCode, roomId, productName, 'in-progress']
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/batches/:id/stop', authenticate, async (req, res) => {
    try {
        // Update to 'completed' and set EndTime=NOW()
        await pool.query(
            "UPDATE batches SET status = 'completed', end_time = NOW() WHERE id = $1", 
            [req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
});

// --- 7. ROUTES: SETTINGS ---
app.get('/api/settings/:roomId', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings WHERE room_id = $1', [req.params.roomId]);
        res.json(result.rows[0] || {});
    } catch (err) { res.json({}); }
});

app.put('/api/settings/:roomId', authenticate, async (req, res) => {
    const { roomId } = req.params;
    const { temp_min, temp_max, humidity_min, humidity_max, press_min, press_max } = req.body;
    try {
        // Upsert logic (Insert if not exists, Update if exists)
        await pool.query(`
            INSERT INTO settings (room_id, temp_min, temp_max, humidity_min, humidity_max, press_min, press_max)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (room_id) 
            DO UPDATE SET temp_min=$2, temp_max=$3, humidity_min=$4, humidity_max=$5, press_min=$6, press_max=$7`,
            [roomId, temp_min, temp_max, humidity_min, humidity_max, press_min, press_max]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
});

// --- 8. ROUTES: USER MANAGEMENT ---
app.get('/api/users', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, role FROM users ORDER BY id ASC');
        const users = result.rows.map(u => ({...u, name: u.email.split('@')[0]})); 
        res.json(users);
    } catch (err) { res.status(500).json(err); }
});

app.post('/api/users', authenticate, authorize(['admin']), async (req, res) => {
    const { email, password, role } = req.body;
    try {
        await pool.query('INSERT INTO users (email, password, role) VALUES ($1, $2, $3)', [email, password, role]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id/role', authenticate, authorize(['admin']), async (req, res) => {
    const { role } = req.body;
    try {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
});

app.delete('/api/users/:id', authenticate, authorize(['admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
});

// --- 9. ROUTES: BACKUP & DIGITAL SIGNATURE (NEW FEATURES) ---
app.post('/api/backup/run', authenticate, authorize(['admin']), async (req, res) => {
    // Simulated Backup
    console.log("☁️ Uploading backup to AWS S3...");
    await new Promise(r => setTimeout(r, 1500)); // Fake delay
    res.json({ success: true });
});

app.post('/api/verify-signature', async (req, res) => {
    const { password } = req.body;
    if (password === "admin123" || password === "admin") {
        console.log("✅ Digital Signature Verified");
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// --- RECEIVER FOR PYTHON SIMULATION ---
// --- RECEIVER FOR PYTHON SIMULATION (With Email Alerts) ---
// --- 🚨 THE UNIVERSAL DATA RECEIVER (Paste this to handle ALL routes) ---

// 1. Define the logic ONCE so it works everywhere
const handleIncomingData = async (req, res) => {
    try {
        // Handle different variable names (Python might send 'roomId', Frontend might send 'room_id')
        const roomId = req.body.roomId || req.body.room_id; 
        const { temperature, humidity, pressure } = req.body;

        // A. LOG SAYS "I AM HERE!"
        console.log(`📥 HIT RECEIVED! Room: ${roomId} | Temp: ${temperature}°C`);

        // B. SAVE TO READINGS TABLE
        const newReading = await pool.query(
            "INSERT INTO room_logs (room_id, temperature, humidity, pressure, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
            [roomId, temperature, humidity, pressure]
        );

        // C. UPDATE ROOM STATUS (Live Dashboard)
        const status = temperature > 25 ? 'alert' : 'active';
        await pool.query(
            "UPDATE rooms SET temperature = $1, humidity = $2, pressure = $3, status = $4 WHERE id = $5",
            [temperature, humidity, pressure, status, roomId]
        );

        // D. TRIGGER EMAIL (The Loud Part)
        if (temperature > 25) {
            console.log(`🔥 HIGH TEMP (${temperature}) DETECTED! Checking email cooldown...`);
            
            const currentTime = Date.now();
            const lastTime = lastEmailTime[roomId] || 0;

            try {
        // This is what the app.get('/api/alerts') function is looking for!
                await pool.query(
                    "INSERT INTO audit_logs (action_type, details, timestamp, status) VALUES ($1, $2, NOW(), $3)",
                    ['ALERT', `⚠️ High Temp in Room ${roomId}: ${temperature}°C`, 'pending']
                    );
                console.log("✅ Alert logged to audit_logs table.");
                } catch (dbErr) {
                    console.error("❌ Error logging alert to DB:", dbErr.message);
                }

            if (currentTime - lastTime > 60000) { // 60-second timer
                console.log(`📧 SENDING EMAIL NOW...`);
                await sendAlertEmail(`Room ${roomId}`, temperature);
                lastEmailTime[roomId] = currentTime;
                console.log(`✅ EMAIL SENT COMMAND FINISHED`);
            } else {
                console.log(`⏳ Email skipped (Spam protection active)`);
            }
        }

        res.json(newReading.rows[0]);

    } catch (err) {
        console.error("❌ DATA ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 2. CONNECT BOTH DOORS TO THE LOGIC
// Whether Simulator uses Door A or Door B, it WILL work.
app.post('/api/readings', authenticate, handleIncomingData);
app.post('/api/data/record', handleIncomingData); // Simulator usually uses this one

// Helper function to log alerts
const logAlert = async (roomId, type, value) => {
    // Only log if there isn't already an active alert for this room/type
    // (Skipping complexity for hackathon: just insert)
    await pool.query(
        'INSERT INTO audit_logs (action_type, details, user_id) VALUES ($1, $2, $3)', 
        ['ALERT', `⚠️ ${type} in Room ${roomId}: ${value}`, 1]
    );
};

// --- ADD THIS TO server.js ---

// Create a new room
// --- REPLACE THIS BLOCK IN server.js ---

// --- ADD/REPLACE THIS IN server.js ---

app.post('/api/rooms', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    
    // 1. Validate input
    if (!name) return res.status(400).json({ error: "Room name is required" });

    // 2. Insert ONLY name and status. 
    // The database will auto-generate the ID.
    // We do NOT insert temperature/humidity here (that belongs in 'readings').
    const newRoom = await pool.query(
      "INSERT INTO rooms (name, status) VALUES ($1, 'active') RETURNING *",
      [name]
    );

    res.json(newRoom.rows[0]);
  } catch (err) {
    console.error("Add Room Error:", err.message); 
    res.status(500).send("Server Error: " + err.message);
  }
});

// --- REPLACE THE '/api/readings' BLOCK ---
// This ensures that if the Simulator uses this route, IT WILL EMAIL.

// --- ADD THIS AUTH ROUTE ---

// 6. API: LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    
    try {
        // Query the DB: Does this user exist?
        // Note: We match 'username' in DB with 'email' from frontend
        const result = await pool.query(
            "SELECT * FROM users WHERE username = $1 AND password = $2 AND role = $3", 
            [email, password, role]
        );

        if (result.rows.length > 0) {
            // SUCCESS: Found the user!
            const user = result.rows[0];
            res.json({ 
                user: { email: user.username, role: user.role }, 
                token: 'demo-token-123' 
            });
        } else {
            // FAILURE: Wrong password or email
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).send("Server Error");
    }
});

// ==========================================
// ☁️ AUTO-BACKUP MODULE
// ==========================================

const { createClient } = require('@supabase/supabase-js');

// 1. Supabase Config (PASTE YOUR KEYS HERE)
const SUPABASE_URL = 'https://zxpuglcotakiourlfijd.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4cHVnbGNvdGFraW91cmxmaWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODM4NTYsImV4cCI6MjA4MzI1OTg1Nn0.upSazEXKak2SMlwJBGntOQga_29TWGbrPsmjCabL84s';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. The Backup Logic
async function performBackup() {
    console.log("⏳ Starting Cloud Backup...");
    try {
        // A. Fetch data from Local DB (All Room Logs)
        const result = await pool.query("SELECT * FROM room_logs ORDER BY created_at DESC");
        
        if (result.rows.length === 0) {
            console.log("⚠️ Database is empty, skipping backup.");
            return { success: false, message: "Database empty" };
        }

        const jsonData = JSON.stringify(result.rows, null, 2);

        // B. Generate Filename (e.g., backup_2025-01-06_14-30.json)
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-');
        const fileName = `backup_${timestamp}.json`;

        // C. Upload to Supabase 'backups' bucket
        const { data, error } = await supabase
            .storage
            .from('backups') 
            .upload(fileName, jsonData, {
                contentType: 'application/json',
                upsert: true
            });

        if (error) throw error;

        console.log(`✅ Backup Uploaded: ${fileName}`);
        return { success: true, file: fileName };

    } catch (err) {
        console.error("❌ Backup Failed:", err.message);
        return { success: false, error: err.message };
    }
}

// 3. SCHEDULER: Run Daily at 2:00 AM
// Format: Minute Hour Day Month Weekday
cron.schedule('0 2 * * *', () => {
    performBackup();
});

// 4. API TRIGGER (For Manual Backup Button)
app.post('/api/backup/trigger', async (req, res) => {
    const result = await performBackup();
    if (result.success) {
        res.json({ message: "Backup Successful!", file: result.file });
    } else {
        res.status(500).json({ message: "Backup Failed", error: result.error });
    }
});
// ==========================================

// DELETE A ROOM AND ALL ITS DATA
app.delete('/api/rooms/:id', authenticate, authorize(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Delete dependent data first to avoid Foreign Key violations
        await pool.query("DELETE FROM room_logs WHERE room_id = $1", [id]);
        await pool.query("DELETE FROM settings WHERE room_id = $1", [id]);
        
        // 2. Delete the room itself
        const result = await pool.query("DELETE FROM rooms WHERE id = $1 RETURNING *", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Room not found" });
        }

        console.log(`🗑️ Room ${id} deleted by Admin`);
        res.json({ success: true, message: "Room and all logs deleted" });
    } catch (err) {
        console.error("Delete Room Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(5000, () => console.log('✅ Server running on port 5000'));