import { getDB } from "../../config/db.js";
import bcrypt from "bcryptjs";

async function verifyOTP(req, res) {
  try {
    const { OTP } = req.body;

    if (!OTP) {
      return res
        .status(400)
        .json({ status: false, message: "OTP is required" });
    }

    const db = getDB();
    const collection = db.collection("users");

    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({
        status: false,
        message: "Token payload is missing email",
      });
    }

    const existingUser = await collection.findOne({ email });

    if (!existingUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (
      !existingUser.verificationOTP ||
      !existingUser.verificationOTPExpiry ||
      existingUser.isVerified
    ) {
      return res
        .status(400)
        .json({ status: false, message: "User already verified" });
    }

    if (Date.now() > existingUser.verificationOTPExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(OTP, existingUser.verificationOTP);

    if (isMatch) {
      const updateResponse = await collection.updateOne(
        { email },
        {
          $set: {
            isVerified: true,
            updatedAt: new Date(),
          },
          $unset: {
            verificationOTP: "",
            verificationOTPExpiry: "",
          },
        },
      );

      if (updateResponse.modifiedCount === 0) {
        return res
          .status(500)
          .json({ status: false, message: "Failed to update user" });
      }

      res.clearCookie("tempToken");
      res.clearCookie("token");

      return res
        .status(200)
        .json({ status: true, message: "Verification successful" });
    } else {
      res.status(400).json({
        status: false,
        message: "Your OTP is invalid",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export default verifyOTP;
