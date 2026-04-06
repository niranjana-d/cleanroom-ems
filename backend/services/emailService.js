const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'emsupside@gmail.com',  // YOUR SENDER (Must match App Password)
        pass: 'nyedodhjsfcxtvfp'   // YOUR APP PASSWORD
    }
});

// We hardcode the receiver here to be 100% safe
const RECEIVER_EMAIL = 'sihhacksmiths@gmail.com'; 

const sendAlertEmail = async (roomName, temperature) => {
    try {
        console.log(`📧 ATTEMPTING to send email for ${roomName}...`);

        const info = await transporter.sendMail({
            from: '"EMS SECURITY" <emsupside@gmail.com>',
            to: RECEIVER_EMAIL,
            subject: `🚨 CRITICAL ALERT: ${roomName} is Overheating!`,
            text: `URGENT WARNING:\n\nThe sensor in ${roomName} has detected a temperature of ${temperature}°C.\n\nThis exceeds the safety threshold.\nPlease investigate immediately.`
        });

        console.log(`✅ EMAIL SENT! ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ EMAIL FAILED TO SEND:", error);
        return false;
    }
};

module.exports = sendAlertEmail;