import bcrypt from "bcryptjs";

// generate hash
export async function generateBcryptHash(value) {
  const hash = await bcrypt.hash(value, 10);
  return hash;
}

// compare
export async function compareWithBcryptHash(compareValue, hashValue) {
  const isMatch = await bcrypt.compare(compareValue, hashValue);
  return isMatch;
}
