import { Loan, LoanStatus } from '../../loanAdvanced/models/loan';
import admin from '../../firebase';
import logger from "../../utils/logger";

const db = admin.firestore();
const employeeCollection = db.collection('employees')
const loanCollection = db.collection('loanDetails')

export const createLoanRequest = async (id: string, data: {
  empName: string;
  amountReq: string;
  staffNote: string;
  note: string;
}) => {
  try {
    logger.info(`Creating loan request for employee ID: ${id}`);
    const { empName, amountReq, staffNote, note } = data;

    if (!empName || !amountReq) {
      throw new Error("Employee name and requested amount are required");
    }

    const employeeRef = employeeCollection.doc(id);
    const employeeSnap = await employeeRef.get();
    if (!employeeSnap.exists) {
      throw new Error("Employee not found");
    }

    const loanRef = loanCollection.doc();
    const reqDate = new Date().toISOString().split("T")[0];

    const loan: Loan = {
      id: loanRef.id,
      empName,
      reqDate,
      status: LoanStatus.PENDING,
      amountReq,
      amountApp: '',
      balance: '',
      paybackTerm: { installment: '', date: '', remaining: '' },
      approvedBy: '',
      staffNote,
      note,
      activity: [`Loan requested on ${reqDate}`],
      createdAt: Date.now(),
    };

    const employeeData = employeeSnap.data();
    const existingLoanIds: string[] = Array.isArray(employeeData?.loanId)
      ? employeeData.loanId
      : [];

    const batch = db.batch();
    batch.set(loanRef, loan);
    batch.update(employeeRef, { loanId: [...existingLoanIds, loanRef.id] });

    await batch.commit();
    logger.info(`Loan created successfully with ID: ${loanRef.id}`);
    return { message: "Loan created successfully", loanId: loanRef.id };
  } catch (error: any) {
    logger.error(`Error creating loan request: ${error.message}`);
    throw error;
  }
};

export const approvedLoan = async (id: string, data: {
  amountApp: string;
  installment: string;
  date: string;
  staffNote: string;
}) => {
  try {
    logger.info(`Approving loan with ID: ${id}`);
    const { amountApp, installment, date, staffNote } = data;

    if (!amountApp || !installment || !date || !staffNote) {
      throw new Error("Missing required approval details");
    }

    const loanRef = loanCollection.doc(id);
    const loanSnap = await loanRef.get();
    if (!loanSnap.exists) {
      throw new Error("Loan record not found");
    }

    const loanData = loanSnap.data();
    const approvedAmount = parseFloat(amountApp);
    const installmentAmount = parseFloat(installment);
    if (isNaN(approvedAmount) || isNaN(installmentAmount) || installmentAmount <= 0) {
      throw new Error("Invalid approved amount or installment value");
    }

    const currentDate = new Date().toISOString().split("T")[0];
    const newActivityMessage = `Loan approved on ${currentDate}`;
    const updatedActivity: string[] = Array.isArray(loanData!.activity)
      ? [...loanData!.activity, newActivityMessage]
      : [newActivityMessage];

    await loanRef.update({
      amountApp,
      balance: amountApp,
      status: LoanStatus.APPROVED,
      "paybackTerm.installment": installment,
      "paybackTerm.date": date,
      "paybackTerm.remaining": amountApp,
      staffNote,
      activity: updatedActivity,
    });

    logger.info(`Loan approved successfully for ID: ${id}`);
    return { message: "Loan approved successfully" };
  } catch (error: any) {
    logger.error(`Error approving loan: ${error.message}`);
    throw error;
  }
};

export const cancelLoan = async (id: string, cancelReason: string) => {
  try {
    logger.info(`Cancelling loan with ID: ${id}, Reason: ${cancelReason}`);

    const loanRef = loanCollection.doc(id);
    const loanSnap = await loanRef.get();
    if (!loanSnap.exists) {
      throw new Error("Loan record not found");
    }

    const loanData = loanSnap.data();
    const currentDate = new Date().toISOString().split("T")[0];
    const updatedActivity: string[] = Array.isArray(loanData!.activity)
      ? [...loanData!.activity, `Loan cancelled on ${currentDate}`]
      : [`Loan cancelled on ${currentDate}`];

    await loanRef.update({
      status: LoanStatus.DECLINED,
      cancelReason,
      activity: updatedActivity
    });

    logger.info(`Loan cancelled successfully for ID: ${id}`);
    return { message: "Loan cancelled successfully", reason: cancelReason };
  } catch (error: any) {
    logger.error(`Error cancelling loan: ${error.message}`);
    throw error;
  }
};

export const editLoan = async (id: string, data: {
  amountApp?: string;
  installment?: string;
  date?: string;
  staffNote?: string;
}) => {
  try {
    logger.info(`Editing loan with ID: ${id}`);
    const loanRef = loanCollection.doc(id);
    const snap = await loanRef.get();
    if (!snap.exists) {
      throw new Error("Loan not found");
    }

    const updates: Record<string, any> = {};
    if (data.amountApp !== undefined) updates.amountApp = data.amountApp;
    if (data.staffNote !== undefined) updates.staffNote = data.staffNote;
    if (data.installment !== undefined) updates["paybackTerm.installment"] = data.installment;
    if (data.date !== undefined) updates["paybackTerm.date"] = data.date;

    if (Object.keys(updates).length === 0) {
      throw new Error("No valid fields to update");
    }

    await loanRef.update({ ...updates, updatedAt: Date.now() });
    logger.info(`Loan updated successfully for ID: ${id}`);
    return { message: "Loan info updated successfully", updatedFields: updates };
  } catch (error: any) {
    logger.error(`Error editing loan: ${error.message}`);
    throw error;
  }
};

export const getAllLoan = async (
  limit = 10,
  page = 1,
  filters?: { status?: string[]; startDate?: string; endDate?: string }
) => {
  try {
    logger.info(`Fetching loans`, { limit, page, filters });
    if (page < 1) page = 1;

    let query: FirebaseFirestore.Query = loanCollection;

    if (filters?.status && filters.status.length > 0) {
      query = query.where("status", "in", filters.status);
    }

    if (filters?.startDate && filters?.endDate) {
      query = query.where("reqDate", ">=", filters.startDate);
      query = query.where("reqDate", "<=", filters.endDate);
    }

    query = query.orderBy("reqDate");

    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    if (page > 1) {
      const skipCount = (page - 1) * limit;
      const snapshot = await query.limit(skipCount).get();
      if (snapshot.docs.length > 0) {
        query = query.startAfter(snapshot.docs[snapshot.docs.length - 1]);
      }
    }

    const loanSnapShots = await query.limit(limit).get();
    const loans = loanSnapShots.docs.map((doc) => {
      const loanData = doc.data() as Loan;
      return {
        id: doc.id,
        name: loanData.empName,
        amountReq: loanData.amountReq,
        status: loanData.status,
        amountApp: loanData.amountApp ?? "",
        installment: loanData.paybackTerm?.installment ?? "",
        balanced: loanData.balance ?? "",
      };
    });

    logger.info(`Fetched ${loans.length} loans`);
    return {
      total,
      page,
      limit,
      loans,
    };
  } catch (error: any) {
    logger.error(`Error fetching loans: ${error.message}`);
    throw error;
  }
};

export const getLoanById = async (id: string) => {
  try {
    logger.info(`Fetching loan by ID: ${id}`);
    const loanSnap = await loanCollection.doc(id).get();
    if (!loanSnap.exists) {
      throw new Error('Loan not found');
    }
    logger.info(`Loan fetched successfully for ID: ${id}`);
    return { id: loanSnap.id, ...loanSnap.data() };
  } catch (error: any) {
    logger.error(`Error fetching loan by ID: ${error.message}`);
    throw error;
  }
};
