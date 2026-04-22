import nodemailer from 'nodemailer';

/**
 * PRESENTATION MODE BYPASS
 * This version skips Gmail entirely to avoid SMTP authentication errors.
 */
export const sendOTP = async (otp: string, toEmail: string) => {
  // Log the OTP to the console so you can see it in your terminal while recording
  console.log("-----------------------------------------");
  console.log(`[BYPASS] Registration for: ${toEmail}`);
  console.log(`[BYPASS] Verification Code is: ${otp}`);
  console.log("-----------------------------------------");

  // We return success immediately without calling nodemailer
  return {
    success: true,
    info: { messageId: 'presentation-simulated-id' }
  };
};