import { getDB } from "../config/db.js";
import { sendSuccess } from "../utils/apiResponse.js";

const PROFILES_COLLECTION = "profiles";
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

async function findSuggestedProfiles({ limit, projection, sort }) {
  const cursor = getDB()
    .collection(PROFILES_COLLECTION)
    .find({}, { projection });

  if (sort) {
    cursor.sort(sort);
  }

  return cursor.limit(limit).toArray();
}

export async function getWhoToFollow(req, res, next) {
  try {
    // Keep this payload small because it is rendered in compact suggestion UIs.
    const suggestedProfiles = await findSuggestedProfiles({
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
  try {
    const suggestedProfiles = await findSuggestedProfiles({
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
  try {
    const suggestedProfiles = await findSuggestedProfiles({
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
