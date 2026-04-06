const AWS = require('aws-sdk');
const AdmZip = require('adm-zip');
const cron = require('node-cron');
const pool = require('../db');

// Configure AWS (We will set env variables later)
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: 'ap-south-1'
});

const performBackup = async () => {
    try {
        const rooms = await pool.query('SELECT * FROM rooms');

        // Create Zip
        const zip = new AdmZip();
        zip.addFile("rooms.json", Buffer.from(JSON.stringify(rooms.rows)));

        const buffer = zip.toBuffer();
        const fileName = `backup-${new Date().toISOString().split('T')[0]}.zip`;

        // Upload to S3
        await s3.upload({
            Bucket: 'ems-backup-bucket', // Change to your bucket name
            Key: fileName,
            Body: buffer
        }).promise();

        console.log("✅ AWS Backup Successful");
    } catch (err) {
        console.log("⚠️ Backup skipped (Check AWS Config)");
    }
};

// Schedule: Run every night at midnight
cron.schedule('0 0 * * *', performBackup);

module.exports = performBackup;