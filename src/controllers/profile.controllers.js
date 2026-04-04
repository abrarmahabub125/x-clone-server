import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

export async function getProfile(req, res, next) {
  try {
    const id = req.params.id;
    const db = getDB();

    // ✅ Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const objectId = new ObjectId(id);

    // ✅ Fetch user name
    const userFullName = await db
      .collection("users")
      .findOne({ _id: objectId }, { projection: { fullName: 1 } });

    if (!userFullName) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ✅ Fetch profile
    const userProfile = await db.collection("profiles").findOne({
      userId: objectId,
    });

    if (!userProfile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    // ✅ Merge data safely
    const profile = {
      ...userProfile,
      fullName: userFullName.fullName,
    };

    return res.status(200).json(profile);
  } catch (error) {
    // ✅ Pass to centralized error handler
    next(error);
  }
}
