// check-services.js
import fs from "fs";

const firebasePkgs = [
  "firebase-admin",
  "firebase-functions",
  "firebase",
  "@google-cloud/firestore",
  "@google-cloud/storage",
  "@google-cloud/pubsub"
];

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const firebaseServices = [];
const nonFirebaseServices = [];

Object.keys(allDeps).forEach(dep => {
  if (firebasePkgs.includes(dep)) {
    firebaseServices.push(dep);
  } else {
    nonFirebaseServices.push(dep);
  }
});

console.log("✅ Firebase Services:");
firebaseServices.forEach(s => console.log("  -", s));

console.log("\n⚠️ Non-Firebase Services:");
nonFirebaseServices.forEach(s => console.log("  -", s));
