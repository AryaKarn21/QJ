const nodemailer = require("nodemailer");
const sendMail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // or any SMTP provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Job Portal" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
};

module.exports = sendMail;
