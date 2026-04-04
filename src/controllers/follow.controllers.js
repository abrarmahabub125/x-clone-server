import { getDB } from "../config/db.js";

export async function getWhoToFollow(req, res, next) {
  try {
    const db = getDB();
    const usersCollection = db.collection("profiles");

    const suggestedUserProfiles = await usersCollection
      .find(
        {},
        { projection: { userId: 1, fullName: 1, username: 1, profilePic: 1 } },
      )
      .limit(3)
      .sort({ username: 1 })
      .toArray();

    res.status(200).json(suggestedUserProfiles);
  } catch (err) {
    next(err);
  }
}
