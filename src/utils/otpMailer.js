import nodemailer from "nodemailer";

const sendOTP = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "You OTP Code",
      html: `
      <div style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa; padding: 30px 0;">
    <tr>
      <td align="center">
        <table width="400" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; padding:30px; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <h2 style="margin:0; color:#1a73e8;">Verify Your Account</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="color:#555555; font-size:16px; line-height:1.6; padding-bottom:25px;">
              Hi,<br><br>
              Use the following OTP to verify your email address. This OTP is valid for <strong style="color:#1a73e8;">10 minutes</strong>.
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding-bottom:25px;">
              <div style="display:inline-block; background-color:#e8f0fe; border-radius:8px; padding:15px 30px; font-size:28px; letter-spacing:6px; font-weight:bold; color:#1a73e8; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </td>
          </tr>

          <!-- Footer / Note -->
          <tr>
            <td style="color:#999999; font-size:14px; line-height:1.5; text-align:center; padding-bottom:10px;">
              If you did not request this code, please ignore this email.<br>
              This is an automated message, please do not reply.
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding-top:10px; text-align:center; color:#555555; font-size:16px;">
              Thank you,<br>
              <strong>Your Company Name</strong>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);

    return info;
  } catch (err) {
    console.log("Mail error", err);
  }
};

export default sendOTP;
