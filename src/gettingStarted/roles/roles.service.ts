import admin from "../../firebase";
import { Role } from "./roles.model";

const db = admin.firestore();
const collection = db.collection("roles");

export const createRole = async (role: Role): Promise<string> => {
  const docRef = await collection.add(role);
  return docRef.id;
};

export const getAllRoles = async (): Promise<Role[]> => {
  const snapshot = await collection.get();
  if (snapshot.empty) return [];
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Role) }));
};

// new function to get by id
export const getRoleById = async (id: string): Promise<Role | null> => {
  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;
  return { roleId: doc.id, ...(doc.data() as Role) };
};

export const updateRole = async (
  id: string,
  updates: Partial<Role>
): Promise<boolean> => {
  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;
  await docRef.update(updates);
  return true;
};

export const deactivateRole = async (
  id: string
): Promise<{ ok: boolean; oldStatus?: string; newStatus?: string }> => {
  const docRef = collection.doc(id);
  const doc = await docRef.get();

  if (!doc.exists) return { ok: false };

  const currentData = doc.data();
  const currentStatus = currentData?.status || "inactive";

  const newStatus = currentStatus === "active" ? "inactive" : "active";
  await docRef.update({ status: newStatus });

  return { ok: true, oldStatus: currentStatus, newStatus };
};
