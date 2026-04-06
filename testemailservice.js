// backend/test-email.js
const nodemailer = require('nodemailer');

async function test() {
    console.log("⏳ 1. Starting Email Test...");

    // 1. SETUP - Replace these with YOUR details
    const senderEmail = 'emsupside@gmail.com'; // <--- MUST MATCH THE APP PASSWORD ACCOUNT
    const appPassword = 'nyedodhjsfcxtvfp'; // <--- PASTE YOUR 16-CHAR APP PASSWORD HERE
    const receiverEmail = 'sihhacksmiths@gmail.com'; // <--- YOUR INBOX

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: senderEmail,
            pass: appPassword
        }
    });

    try {
        console.log("⏳ 2. Attempting to authenticate with Google...");
        // Verify connection configuration
        await transporter.verify();
        console.log("✅ 3. Login SUCCESS! Password is correct.");

        console.log("⏳ 4. Sending test message...");
        const info = await transporter.sendMail({
            from: `"EMS Test" <${senderEmail}>`,
            to: receiverEmail,
            subject: 'EMS System Test Email',
            text: 'Success! If you read this, your email alerts are working.'
        });

        console.log("🎉 5. EMAIL SENT SUCCESSFULLY!");
        console.log("Message ID:", info.messageId);
        console.log("Check your Inbox (and Spam folder) for:", receiverEmail);

    } catch (error) {
        console.log("\n❌ ERROR FAILED!");
        console.log("---------------------------------------------------");
        if (error.code === 'EAUTH') {
            console.log("🔴 AUTHENTICATION ERROR: Your Email or App Password is wrong.");
            console.log("   - Check if 'user' matches the account you generated the password for.");
            console.log("   - Make sure there are no extra spaces in the password.");
        } else {
            console.error(error);
        }
        console.log("---------------------------------------------------");
    }
}

test();