import { getAllEmployees } from "../../employee/controller/employee";
import {
  getComponent,
  salaryCollection,
} from "../../gettingStarted/payslipComponent/controller/payslip";
import logger from "../../utils/logger";

export const getTotalEmployees = async (): Promise<number> => {
  try {
    const result = await getAllEmployees(1, 1);
    return result.total;
  } catch (error: any) {
    logger.error("Error fetching total employees:", error.message);
    throw new Error("Failed to fetch total employees");
  }
};

export const getPayslipSummary = async () => {
  try {
    const structuresSnap = await salaryCollection
      .where("isDeleted", "==", false)
      .get();

    const totalPayslips = structuresSnap.size;
    let totalComponents = 0;
    let totalGrossPaid = 0;
    let totalNetPaid = 0;

    for (const doc of structuresSnap.docs) {
      const structureData = doc.data();
      const components = structureData.salaryComponent || [];
      totalComponents += components.length;

      if (structureData.id) {
        const { grossPaid, netPaid } = await calculateGrossAndNet(
          structureData.id
        );
        totalGrossPaid += grossPaid;
        totalNetPaid += netPaid;
      }
    }

    return {
      totalPayslips: totalPayslips + totalComponents,
      totalGrossPaid,
      totalNetPaid,
    };
  } catch (error) {
    logger.error("Failed to fetch payslip summary", { error });
    throw error;
  }
};

export const calculateGrossAndNet = async (groupId: string) => {
  const groupedComponents = await getComponent(groupId);
  if (!groupedComponents) return { grossPaid: 0, netPaid: 0 };

  let grossPaid = 0;
  let totalDeductions = 0;

  Object.keys(groupedComponents).forEach((type) => {
    groupedComponents[type].components.forEach((comp: any) => {
      const amount = Number(comp.value || 0);
      if (type.toLowerCase() === "earning") grossPaid += amount;
      else if (type.toLowerCase() === "deduction") totalDeductions += amount;
    });
  });

  return { grossPaid, netPaid: grossPaid - totalDeductions };
};
