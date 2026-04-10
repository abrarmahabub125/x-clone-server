import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { sendSuccess } from "../utils/apiResponse.js";

const PROFILES_COLLECTION = "profiles";
const FOLLOW_COLLECTION = "relations";

const COMPACT_PROFILE_PROJECTION = {
  userId: 1,
  fullName: 1,
  username: 1,
  profilePic: 1,
};
const EXTENDED_PROFILE_PROJECTION = {
  ...COMPACT_PROFILE_PROJECTION,
  bio: 1,
};

async function findSuggestedProfiles({
  loggedInUserId,
  limit,
  projection,
  sort,
}) {
  const cursor = getDB()
    .collection(PROFILES_COLLECTION)
    .find({ userId: { $ne: new ObjectId(loggedInUserId) } }, { projection });

  if (sort) {
    cursor.sort(sort);
  }

  return cursor.limit(limit).toArray();
}

export async function getWhoToFollow(req, res, next) {
  try {
    const loggedInUserId = req.user.id;

    // Keep this payload small because it is rendered in compact suggestion UIs.
    const suggestedProfiles = await findSuggestedProfiles({
      loggedInUserId,
      limit: 3,
      projection: COMPACT_PROFILE_PROJECTION,
      sort: { username: 1 },
    });

    return sendSuccess(res, {
      message: "Suggested users retrieved successfully.",
      data: suggestedProfiles,
      meta: {
        count: suggestedProfiles.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getWhoToConnect(req, res, next) {
  const loggedInUserId = req.user.id;
  try {
    const suggestedProfiles = await findSuggestedProfiles({
      loggedInUserId,
      limit: 30,
      projection: EXTENDED_PROFILE_PROJECTION,
    });

    return sendSuccess(res, {
      message: "Suggested connections retrieved successfully.",
      data: suggestedProfiles,
      meta: {
        count: suggestedProfiles.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCreators(req, res, next) {
  const loggedInUserId = req.user.id;
  try {
    const suggestedProfiles = await findSuggestedProfiles({
      loggedInUserId,
      limit: 15,
      projection: EXTENDED_PROFILE_PROJECTION,
    });

    return sendSuccess(res, {
      message: "Suggested creators retrieved successfully.",
      data: suggestedProfiles,
      meta: {
        count: suggestedProfiles.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ------------------------- Follow controllers ---------------------------

// Check is following
export async function getFollowStatus(req, res, next) {
  const db = getDB();
  const followerId = new ObjectId(req.user.id);
  const followingId = new ObjectId(req.params.followingId);

  const exists = await db.collection(FOLLOW_COLLECTION).findOne({
    followerId,
    followingId,
  });

  res.json({ isFollowing: !!exists });
}

// Follow user
export async function followUser(req, res, next) {
  const db = getDB();
  const followerId = new ObjectId(req.user.id); // er user er following update hobe +1
  const followingId = new ObjectId(req.params.followingId); // ei user er follower update hobe +1

  // check is user trying to follow yourself
  if (followerId.equals(followingId)) {
    return res.status(400).json({ message: "You cannot follow yourself." });
  }

  try {
    const existing = await db.collection(FOLLOW_COLLECTION).findOne({
      followerId,
      followingId,
    });

    if (existing) {
      return res.status(409).json({ message: "Already following." });
    }

    await db.collection(FOLLOW_COLLECTION).insertOne({
      followerId,
      followingId,
      createdAt: new Date(),
    });

    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followerId },
      {
        $addToSet: { following: followingId },
      },
    );

    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followingId },
      {
        $addToSet: { followers: followerId },
      },
    );

    return res.status(201).json({ message: "Followed successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Something went wrong." });
  }
}
// Unfollow user
export async function unfollowUser(req, res, next) {
  const db = getDB();
  const followerId = new ObjectId(req.user.id);
  const followingId = new ObjectId(req.params.followingId);

  try {
    const result = await db.collection(FOLLOW_COLLECTION).deleteOne({
      followerId,
      followingId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Not following this user." });
    }

    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followerId },
      {
        $pull: { following: followingId },
      },
    );

    await db.collection(PROFILES_COLLECTION).updateOne(
      { userId: followingId },
      {
        $pull: { followers: followerId },
      },
    );

    return res.status(200).json({ message: "Unfollowed successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Something went wrong." });
  }
}
