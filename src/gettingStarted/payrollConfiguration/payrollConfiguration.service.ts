import { firestore } from "firebase-admin";
import logger from "../../utils/logger";
import { PayrollConfiguration } from "./payrollConfiguration.model";

const db = firestore();
const collection = db.collection("payrollConfigurations").doc("main");


export const getPayrollConfigurationFromDB = async () => {
  const ref = collection;
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data() as PayrollConfiguration;
};

export const upsertPayrollConfigurationInDB = async (
  payload: Omit<PayrollConfiguration, "updatedAt" | "updatedBy" | "createdAt">,
  updatedBy: string
) => {
  const ref = collection;
  const now = new Date().toISOString();

  const existing = await ref.get();
  const oldData = existing.exists ? (existing.data() as PayrollConfiguration) : null;

  const data: PayrollConfiguration = {
    ...payload,
    updatedBy,
    updatedAt: now,
    createdAt: oldData?.createdAt || now, // preserve createdAt if already exists
  };

  await ref.set(data, { merge: false }); // force overwrite
  logger.info(`Payroll configuration upserted by ${updatedBy}`);
  return data;
};
