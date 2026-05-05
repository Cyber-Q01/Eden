const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: '11.qservers.net',           // ← Your server
    port: 465,                          // ← Port 465 (SSL)
    secure: true,                       // ← true for 465
    auth: {
        user: 'no-reply@shalomdatatech.com',  // ← CHANGE THIS
        pass: 'CL3zER^zp.7_[(ZF'               // ← CHANGE THIS
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