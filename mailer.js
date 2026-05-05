const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || '11.qservers.net',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true' || true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log('❌ SMTP Error:', error.message);
    } else {
        console.log('✅ SMTP Connection Successful!');

        // Now try sending an email
        transporter.sendMail({
            from: 'no-reply@Eden.com.ng',
            to: 'folorunshoa08@gmail.com',  // ← Change this
            subject: 'Test Email from EdenHome',
            html: '<h1>Success!</h1><p>Your SMTP is working</p>'
        }, (error, info) => {
            if (error) {
                console.log('❌ Send Error:', error.message);
            } else {
                console.log('✅ Email Sent:', info.response);
            }
        });
    }
});