const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all rooms
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json(err); }
});

// Add a new room
router.post('/', async (req, res) => {
    const { name } = req.body;
    try {
        await pool.query('INSERT INTO rooms (name) VALUES ($1)', [name]);
        res.json({ message: "Room Added" });
    } catch (err) { res.status(500).json(err); }
});

module.exports = router;