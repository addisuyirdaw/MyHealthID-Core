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

/**
 * Sends an approval or rejection notice to a facility application contact email.
 * Decision  : "approved" | "rejected"
 * tenantId  : populated on approval; undefined on rejection.
 * reason    : populated on rejection; undefined on approval.
 *
 * Falls back to a console-bypass when EMAIL_USER / EMAIL_PASS are absent
 * so dev / presentation flows continue to work with no SMTP configuration.
 */
export const sendApplicationNotification = async (opts: {
  toEmail: string;
  facilityName: string;
  decision: "approved" | "rejected";
  tenantId?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> => {
  const { toEmail, facilityName, decision, tenantId, reason } = opts;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  const isApproved = decision === "approved";

  const subject = isApproved
    ? `✅ Facility Application Approved — ${facilityName}`
    : `❌ Facility Application Rejected — ${facilityName}`;

  const textBody = isApproved
    ? `Congratulations! Your application for "${facilityName}" has been approved.\n\nYour Tenant ID is: ${tenantId}\n\nA system administrator will contact you with next steps for onboarding your staff.`
    : `We regret to inform you that your application for "${facilityName}" has been rejected.\n\nReason: ${reason ?? "No reason provided."}\n\nYou may re-apply after addressing the issues noted above.`;

  const htmlBody = isApproved
    ? `
      <div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#16a34a">&#x2705; Application Approved</h2>
        <p>Congratulations! Your facility application for <strong>${facilityName}</strong> has been <strong>approved</strong>.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:13px;color:#166534">Your Tenant ID (keep this secure):</p>
          <p style="margin:8px 0 0;font-size:18px;font-weight:700;letter-spacing:2px;color:#15803d">${tenantId}</p>
        </div>
        <p style="color:#475569;font-size:14px">A system administrator will reach out with next steps for onboarding your clinical staff onto the MyHealthID platform.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
        <p style="color:#94a3b8;font-size:12px">MyHealthID Platform &mdash; Clinical Operations</p>
      </div>`
    : `
      <div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#dc2626">&#x274C; Application Not Approved</h2>
        <p>We regret to inform you that your facility application for <strong>${facilityName}</strong> was <strong>not approved</strong> at this time.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:13px;color:#991b1b">Reason from reviewer:</p>
          <p style="margin:8px 0 0;font-size:14px;color:#7f1d1d">${reason ?? "No specific reason was provided."}</p>
        </div>
        <p style="color:#475569;font-size:14px">You are welcome to re-apply after addressing the issues noted above. If you believe this is in error, please contact the MyHealthID support team.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
        <p style="color:#94a3b8;font-size:12px">MyHealthID Platform &mdash; Clinical Operations</p>
      </div>`;

  if (emailUser && emailPass) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: emailUser, pass: emailPass },
    });
    try {
      await transporter.sendMail({ from: emailUser, to: toEmail, subject, text: textBody, html: htmlBody });
      return { success: true };
    } catch (error: any) {
      console.error('[sendApplicationNotification] SMTP error:', error);
      return { success: false, error: error.message || String(error) };
    }
  } else {
    // PRESENTATION MODE BYPASS
    console.log('─────────────────────────────────────────────');
    console.log(`[BYPASS] Application notification to: ${toEmail}`);
    console.log(`[BYPASS] Subject: ${subject}`);
    console.log(`[BYPASS] Body: ${textBody}`);
    console.log('─────────────────────────────────────────────');
    return { success: true };
  }
};