import nodemailer from 'nodemailer';

/**
 * Sends a 6-digit OTP verification code to the target email.
 * If EMAIL_USER and EMAIL_PASS are set in environment variables, it uses Gmail SMTP.
 * Otherwise, it defaults to a local presentation-mode bypass (printing the OTP to console) 
 * so testing and offline modes continue to function seamlessly.
 */
export const sendOTP = async (
  otp: string,
  toEmail: string
): Promise<{ success: true; info: { messageId: string } } | { success: false; error: string }> => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: emailUser,
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
      return { success: true, info: { messageId: info.messageId } };
    } catch (error: any) {
      console.error("Error sending OTP email:", error);
      return { success: false, error: error.message || String(error) };
    }
  } else {
    // PRESENTATION MODE BYPASS
    console.log("-----------------------------------------");
    console.log(`[BYPASS] Registration for: ${toEmail}`);
    console.log(`[BYPASS] Verification Code is: ${otp}`);
    console.log("-----------------------------------------");

    return {
      success: true,
      info: { messageId: 'presentation-simulated-id' }
    };
  }
};