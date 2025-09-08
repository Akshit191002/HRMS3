import admin from "../../firebase";
import { ApprovalStatus } from "../../leavesConfiguration/leaveRequest/leaveRequest.model";
import { getLeaveRequests } from "../../leavesConfiguration/leaveRequest/leaveRequest.service";
import { getAllLoan } from "../../loanAdvanced/controller/loan";
import { LoanStatus } from "../../loanAdvanced/models/loan";
import logger from "../../utils/logger";
import {
  DashboardRecord,
  DashboardResponse,
  Event,
  EventResponse,
} from "./eventNotification.model";

const db = admin.firestore();
const collectionRef = db.collection("currentEvents");

export const fetchPendingDashboardRecords = async (
  limit: number,
  page: number
): Promise<DashboardResponse> => {
  try {
    const loanData = await getAllLoan(limit, page, {
      status: [LoanStatus.PENDING],
    });

    const leaveData = await getLeaveRequests({
      finalApprovalStatus: ApprovalStatus.Pending,
    });

    const loans: DashboardRecord[] = loanData.loans.map((l: any) => ({
      id: String(l.id),
      type: "loan",
      name: l.name,
      amount: l.amountReq,
      status: l.status || "Pending",
      date:
        (l.paybackTerm?.date as string) ??
        (l.createdAt as string) ??
        new Date().toISOString(),
    }));

    const leaves: DashboardRecord[] = leaveData.map((lv) => ({
      id: String(lv.id),
      type: "leave",
      name: lv.employeeName,
      status: lv.finalApprovalStatus || "Pending",
      date: lv.appliedOn ?? lv.createdAt ?? new Date().toISOString(),
      startDate: lv.startDate,
      endDate: lv.endDate,
      duration: lv.duration,
    }));

    const seen = new Set<string>();
    const combined: DashboardRecord[] = [...loans, ...leaves]
      .filter((record) => {
        const key = `${record.type}-${record.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      total: combined.length,
      page,
      limit,
      records: combined,
    };
  } catch (error: any) {
    logger.error("Error fetching dashboard records:", error.message);
    throw new Error("Failed to fetch pending dashboard records");
  }
};

export const fetchEvents = async (
  limit: number,
  page: number
): Promise<EventResponse> => {
  try {
    const offset = (page - 1) * limit;

    const snapshot = await collectionRef
      .orderBy("date", "desc")
      .offset(offset)
      .limit(limit)
      .get();

    const records: Event[] = [];
    snapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() } as Event);
    });

    const totalSnapshot = await collectionRef.get();

    return {
      total: totalSnapshot.size,
      page,
      limit,
      records,
    };
  } catch (error: any) {
    logger.error("Error fetching events:", error.message);
    throw new Error("Failed to fetch events");
  }
};

export const addEvent = async (event: Event): Promise<string> => {
  try {
    const newDoc = await collectionRef.add({
      ...event,
      createdAt: new Date().toISOString(),
    });
    return newDoc.id;
  } catch (error: any) {
    logger.error("Error creating event:", error.message);
    throw new Error("Failed to create event");
  }
};
