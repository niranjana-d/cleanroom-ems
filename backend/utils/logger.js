const pool = require('../db'); // Ensures we use your existing db connection

const logAction = async (action, details, userId) => {
    try {
        await pool.query(
            'INSERT INTO audit_logs (action_type, details, user_id) VALUES ($1, $2, $3)',
            [action, details, userId]
        );
        console.log(`📝 Audit Log: ${action}`);
    } catch (err) {
        console.error("Audit Log Failed:", err);
    }
};

module.exports = logAction;