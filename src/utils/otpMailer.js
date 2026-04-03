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
  <div style="margin:0;padding:20px 0;background-color:#eef2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

    <div style="max-width:500px;margin:40px auto;background:#ffffff;border-radius:12px;padding:32px;">

      <!-- Logo -->
      <div style="text-align:center;font-size:26px;font-weight:700;color:#4f46e5;margin-bottom:20px;">
        X.com
      </div>

      <!-- Title -->
      <div style="font-size:22px;font-weight:600;color:#111827;margin-bottom:10px;text-align:center;">
        Verify Your Email
      </div>

      <!-- Text -->
      <div style="font-size:14px;color:#4b5563;margin-bottom:20px;line-height:1.6;text-align:center;">
        Enter the OTP below to complete your verification. This code is valid for a short time.
      </div>

      <!-- OTP BOX -->
      <div style="text-align:center;font-size:32px;letter-spacing:8px;font-weight:700;color:#4f46e5;background:#f8f8ff;padding:18px 0;border-radius:10px;margin:25px 0;">
        ${otp}
      </div>

      <!-- Expiry -->
      <div style="font-size:13px;color:#6b7280;text-align:center;margin-bottom:15px;">
        ⏳ This OTP will expire in <strong>10 minutes</strong>
      </div>

      <!-- Warning -->
      <div style="font-size:13px;color:#dc2626;background:#fef2f2;padding:10px;border-radius:6px;text-align:center;margin-bottom:20px;">
        ⚠️ Never share your OTP with anyone. We will never ask for it.
      </div>

      <!-- Divider -->
      <div style="height:1px;background:#e5e7eb;margin:20px 0;"></div>

      <!-- Footer text -->
      <div style="font-size:14px;color:#4b5563;text-align:center;margin-bottom:10px;">
        Didn’t request this? You can safely ignore this email.
      </div>

      <!-- Footer -->
      <div style="font-size:12px;color:#9ca3af;text-align:center;">
        © 2026 <strong style="color:#4f46e5;">x.com</strong>. All rights reserved.
      </div>

    </div>

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
