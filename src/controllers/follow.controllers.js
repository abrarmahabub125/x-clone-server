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

// who to connect
export async function getWhoToConnect(req, res, next) {
  try {
    const db = getDB();
    const usersCollection = db.collection("profiles");

    const suggestedConnectProfiles = await usersCollection
      .find(
        {},
        {
          projection: {
            userId: 1,
            fullName: 1,
            username: 1,
            profilePic: 1,
            bio: 1,
          },
        },
      )
      .limit(30)
      .toArray();

    res.status(200).json(suggestedConnectProfiles);
  } catch (err) {
    next(err);
  }
}

// creators for user
export async function getCreators(req, res, next) {
  try {
    const db = getDB();
    const usersCollection = db.collection("profiles");

    const suggestedConnectProfiles = await usersCollection
      .find(
        {},
        {
          projection: {
            userId: 1,
            fullName: 1,
            username: 1,
            profilePic: 1,
            bio: 1,
          },
        },
      )
      .limit(15)
      .toArray();

    res.status(200).json(suggestedConnectProfiles);
  } catch (err) {
    next(err);
  }
}
