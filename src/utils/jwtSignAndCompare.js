import jwt from "jsonwebtoken";

export function generateTempToken(dataObj) {
  const temporaryJWTToken = jwt.sign(dataObj, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });
  return temporaryJWTToken;
}

export function generateAccessToken(dataObj) {
  const accessToken = jwt.sign(dataObj, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  return accessToken;
}
