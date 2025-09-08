import { Request, Response } from "express";
import logger from "../../utils/logger";
import {
  getPayrollConfigurationFromDB,
  upsertPayrollConfigurationInDB,
} from "./payrollConfiguration.service";

export const getPayrollConfiguration = async (req: Request, res: Response) => {
  try {
    const doc = await getPayrollConfigurationFromDB();
    if (!doc) {
      return res
        .status(200)
        .json({ data: null, message: "No configuration set yet" });
    }

    return res.status(200).json({ data: doc });
  } catch (err: any) {
    logger.error("getPayrollConfiguration error", err);
    return res
      .status(500)
      .json({ error: err.message || "Something went wrong" });
  }
};

export const updatePayrollConfiguration = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid as string | undefined;
    if (!uid) return res.status(401).json({ error: "Unauthenticated" });

    const {
      amountRoundingOff,
      taxCalculationMode,
      payrollDaysMode,
      esicWagesMode,
      investmentWindowMonthly,
      poiWindowFY,
    } = req.body;

    const saved = await upsertPayrollConfigurationInDB(
      {
        amountRoundingOff,
        taxCalculationMode,
        payrollDaysMode,
        esicWagesMode,
        investmentWindowMonthly,
        poiWindowFY,
      },
      uid
    );

    return res
      .status(200)
      .json({ message: "Payroll configuration saved"});
  } catch (err: any) {
    logger.error("updatePayrollConfiguration error", err);
    return res
      .status(500)
      .json({ error: err.message || "Something went wrong" });
  }
};
