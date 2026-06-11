import Hashids from "hashids";

const SALT = process.env.HASHID_SALT || "fallback-change-in-env";
const MIN_LENGTH = 6;

// Separate namespaces — same int gives different hash per entity
const attemptH = new Hashids(SALT + ":attempt", MIN_LENGTH);
const testH = new Hashids(SALT + ":test", MIN_LENGTH);
const courseH = new Hashids(SALT + ":course", MIN_LENGTH);

export const encodeAttempt = (id) => (id ? attemptH.encode(id) : "");
export const decodeAttempt = (hash) => {
  const result = attemptH.decode(hash);
  return result[0] ?? null;
};

export const encodeTest = (id) => (id ? testH.encode(id) : "");
export const decodeTest = (hash) => {
  const result = testH.decode(hash);
  return result[0] ?? null;
};

export const encodeCourse = (id) => (id ? courseH.encode(id) : "");
export const decodeCourse = (hash) => {
  const result = courseH.decode(hash);
  return result[0] ?? null;
};
