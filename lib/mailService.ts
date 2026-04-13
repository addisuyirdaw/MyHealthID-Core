import nodemailer from 'nodemailer';

export const sendOTP = async (otp: string, toEmail: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Your MyHealthID Verification Code',
    text: `Your Verification Code is: ${otp}\n\nThis code is valid for 10 minutes. Please do not share this code with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">MyHealthID Verification</h2>
        <p>Your Verification Code is:</p>
        <h1 style="font-size: 36px; letter-spacing: 5px; color: #1e293b; text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
          ${otp}
        </h1>
        <p style="color: #64748b; font-size: 14px;">This code is valid for 10 minutes. Please do not share this code with anyone.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error: any) {
    console.error("Error sending OTP email:", error);
    return { success: false, error: error.message };
  }
};
