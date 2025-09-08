import * as admin from 'firebase-admin';
import logger from '../../utils/logger';
import ExcelJS from "exceljs";
import { Parser } from "json2csv";
import { Response } from "express";
import { Attendance_Summary_Template, AttendanceFilters, Component_Summary_Template, Employee_Snapshot_Template, EmployeeSnapshotFilters, Leave_Template, LeaveFilters, Payslip_Summary_Template, Report, ReportHistory, ScheduleReport } from '../models/report';
import { increaseSequence } from '../../gettingStarted/sequenceNumber/sequence.service';
import { error } from 'console';
import { componentCollection, salaryCollection } from '../../gettingStarted/payslipComponent/controller/payslip';

const db = admin.firestore();
const reportCollection = db.collection('reports');
const scheduleReportCollection = db.collection('scheduleReports');
const employeeCollection = db.collection('employees');
const generalCollection = db.collection('general');
const professionalCollection = db.collection('professional');
const templateCollection = db.collection("employeeSnapshotTemplates");
const attendanceCollection = db.collection('attendance');
const leaveCollection = db.collection('employeeLeaveBalances');
const reportHistoryCollection = db.collection('reportHistory');

const OFFICE_START = "09:00";
const OFFICE_END = "18:00";

function parseTime(str: string): Date {
    const [h, m] = str.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

function calculateDiffMinutes(later: Date, earlier: Date): number {
    return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60)));
}

function calculateAttendanceMetrics(inTime?: string, outTime?: string) {
    if (!inTime || !outTime) {
        return { lateBy: null, earlyBy: null, overTime: null, timeSpent: null };
    }

    const inT = parseTime(inTime);
    const outT = parseTime(outTime);

    const start = parseTime(OFFICE_START);
    const end = parseTime(OFFICE_END);

    const timeSpent = calculateDiffMinutes(outT, inT);

    const lateBy = inT > start ? calculateDiffMinutes(inT, start) : 0;
    const earlyBy = outT < end ? calculateDiffMinutes(end, outT) : 0;
    const overTime = outT > end ? calculateDiffMinutes(outT, end) : 0;

    return { timeSpent, lateBy, earlyBy, overTime };
}

export const returnTemplateId = async (type: string): Promise<string> => {
    try {
        const snapshot = await templateCollection
            .where("type", "==", type)
            .limit(1)
            .get();

        if (snapshot.empty) {
            throw new Error("Template not found");
        }

        const templateDoc = snapshot.docs[0];
        return templateDoc.id;
    } catch (error) {
        logger.error("Error fetching template", { error });
        throw error;
    }
};

export const getFullNameReport = async (type: string): Promise<string | undefined> => {
    try {
        if (type === 'employeeSnapshot') {
            return "Employees Snapshot Report";
        } else if (type === 'attendanceSummary') {
            return "Attendance Summary Report";
        } else if (type === 'leave') {
            return "Leave Report";
        } else if (type === "payslipSummary") {
            return "Payslip Summary Report";
        } else if (type === "payslipComponent") {
            return "Payslip Component Report";
        }
    } catch (error) {
        logger.error("Error fetching report", { error });
        throw error;
    }
};

export const generateReportId = async (): Promise<string> => {
    const report = await increaseSequence("Report");
    const prefix = report?.prefix;
    let code = report?.nextAvailableNumber;
    if (!code) {
        throw error;
    }
    code -= 1;
    return `${prefix}${String(code)}`;
};

export const calculateNextRunDate = (
    frequency: "Daily" | "Weekly" | "Monthly",
    startDate: string,
    hours: number,
    minutes: number
): number => {
    const now = new Date();

    let nextDate = new Date(startDate);
    nextDate.setHours(hours, minutes, 0, 0);

    if (frequency === "Daily") {
        if (nextDate <= now) {
            nextDate.setDate(nextDate.getDate() + 1);
        }
    } else if (frequency === "Weekly") {
        if (nextDate <= now) {
            nextDate.setDate(nextDate.getDate() + 7);
        }
    } else if (frequency === "Monthly") {
        if (nextDate <= now) {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
    }

    return nextDate.getTime();
};

export const formattedDated = (nextRunDate: number) => {
    const formatted = new Date(nextRunDate).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    return formatted;
}


export const createReport = async (data: Report, userEmail: string) => {
    try {
        logger.info('Creating new report');
        const existingSnap = await reportCollection
            .where("type", "==", data.type)
            .where("isDeleted", "==", false)
            .limit(1)
            .get();

        if (!existingSnap.empty) {
            const error: any = new Error(`Report with type "${data.type}" already exists`);
            error.statusCode = 409;
            throw error;
        }

        const docRef = reportCollection.doc();
        const report: Report = {
            ...data,
            id: docRef.id,
            Snum: await generateReportId(),
            isDeleted: false,
            createdAt: Date.now()
        };
        await docRef.set(report);

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Report",
            type: "CREATE",
            message: `Report ${report.type} created successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        logger.info('Report created successfully', { reportId: docRef.id });

        return {
            message: 'Report created successfully',
            report: report,
        };
    } catch (error) {
        logger.error('Error creating report', { error });
        throw error;
    }
};

export const deleteReport = async (id: string, userEmail: string) => {
    try {
        logger.info('Deleting report', { reportId: id });

        const reportRef = reportCollection.doc(id);
        const snap = await reportRef.get();
        const reportData = snap.data();
        const scheduleSnap = await scheduleReportCollection.where("reportId", "==", id).get();

        if (!snap.exists) {
            throw new Error("Report not found");
        }

        await reportRef.update({ isDeleted: true });
        await Promise.all(scheduleSnap.docs.map(doc => doc.ref.update({ isDeleted: true })));

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Report",
            type: "DELETE",
            message: `Report ${reportData?.type} deleted successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        logger.info('Report deleted successfully', { reportId: id });
        return {
            message: 'Report deleted successfully',
        };
    } catch (error) {
        logger.error('Error deleting report', { error });
        throw error;
    }
};

export const getAllReport = async (page: number, limit: number) => {
    try {
        logger.info(`Fetching reports | page: ${page}, limit: ${limit}`);

        const query = reportCollection
            .where('isDeleted', '==', false)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        const totalSnap = await reportCollection.where("isDeleted", "==", false).count().get();
        const total = totalSnap.data().count;

        const snapshot = await query.get();

        if (snapshot.empty) {
            logger.warn('No reports found');
            return {
                message: 'No reports found',
                reports: [],
                page,
                limit,
            };
        }

        const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Report[];

        logger.info('Reports fetched successfully');
        return {
            reports,
            page,
            limit,
            total
        };
    } catch (error) {
        logger.error('Error fetching reports', { error });
        throw error;
    }
};

export const createScheduleReport = async (reportId: string, data: ScheduleReport, userEmail: string) => {
    try {
        logger.info("Creating schedule report");
        const reportSnap = await reportCollection.doc(reportId).get();
        if (!reportSnap.exists) {
            throw new Error(`Report with ID ${reportId} not found`);
        }

        const docRef = scheduleReportCollection.doc();

        const nextRunDate = calculateNextRunDate(
            data.frequency,
            data.startDate,
            Number(data.hours),
            Number(data.minutes)
        );

        const scheduleReport: ScheduleReport = {
            ...data,
            nextRunDate,
            id: docRef.id,
            reportId: reportId,
            createdAt: Date.now(),
            isDeleted: false,
        };

        await docRef.set(scheduleReport);

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Schedule Report",
            type: "CREATE",
            message: `Schedule Report ${scheduleReport.id} created successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        logger.info("Schedule report created successfully", { id: docRef.id });

        return {
            message: "Schedule report created successfully",
            scheduleReport: scheduleReport,
        };
    } catch (error) {
        logger.error("Error creating schedule report", { error });
        throw error;
    }
};

export const getAllScheduledReports = async (page: number, limit: number) => {
    try {
        const query = scheduleReportCollection
            .where("isDeleted", "==", false)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .offset((page - 1) * limit);


        const totalSnap = await scheduleReportCollection.where("isDeleted", "==", false).count().get();
        const total = totalSnap.data().count;

        const snapshot = await query.get();
        const scheduledReports = snapshot.docs.map(doc => {
            const formattedDate = formattedDated(doc.data().nextRunDate);
            return {
                id: doc.id,
                ...doc.data(),
                nextRunDate: formattedDate
            };
        });
        return {
            reports: scheduledReports,
            page,
            limit,
            total,
        };
    } catch (error) {
        logger.error("Error fetching scheduled reports", { error });
        throw error;
    }
};

export const updateScheduledReport = async (id: string, userEmail: string, data: Partial<ScheduleReport>) => {
    try {
        const docRef = scheduleReportCollection.doc(id);
        const snap = await docRef.get();

        if (!snap.exists) {
            throw new Error(`Scheduled report with ID ${id} not found`);
        }

        await docRef.update({
            ...data,
            updatedAt: Date.now(),
        });

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Schedule Report",
            type: "UPDATE",
            message: `Schedule Report ${id} updated successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        return { message: "Scheduled report updated successfully" };
    } catch (error) {
        logger.error("Error updating scheduled report", { error });
        throw error;
    }
};

export const deleteScheduledReport = async (id: string, userEmail: string) => {
    try {
        const docRef = scheduleReportCollection.doc(id);
        await docRef.update({ isDeleted: true });

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Schedule Report",
            type: "DELETE",
            message: `Schedule Report ${id} deleted successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        return { message: "Scheduled report deleted successfully" };
    } catch (error) {
        logger.error("Error deleting scheduled report", { error });
        throw error;
    }
};

export const getEmployeeSnapshotByTemplate = async (type: string, page?: number, limit?: number, filters: EmployeeSnapshotFilters = {}) => {
    const reportType = await getFullNameReport(type);

    const reportSnap = await reportCollection.where("type", "==", reportType).where("isDeleted", "==", false).limit(1).get();
    if (reportSnap.empty) {
        return {
            message: `Report for type "${type}" not found. Please create this report first.`,
        };
    }

    const templateId = await returnTemplateId(type);
    const templateSnap = await templateCollection.doc(templateId).get();
    if (!templateSnap.exists) {
        throw new Error("Template not found");
    }
    const template = templateSnap.data() as Employee_Snapshot_Template;


    let query = employeeCollection.where("isDeleted", "==", false);

    if (limit) {
        query = query.offset(((page || 1) - 1) * limit).limit(limit);
    }
    const snapshot = await query.get();
    const totalSnap = await employeeCollection.where("isDeleted", "==", false).count().get();
    const total = totalSnap.data().count;

    const employees: any[] = [];

    for (const doc of snapshot.docs) {
        const empData = doc.data();

        const [generalSnap, professionalSnap] = await Promise.all([
            generalCollection.doc(empData.generalId).get(),
            professionalCollection.doc(empData.professionalId).get(),
        ]);

        const general = generalSnap.exists ? generalSnap.data() : {};
        const professional = professionalSnap.exists ? professionalSnap.data() : {};

        if (filters.joiningDate) {
            const jd = professional?.joiningDate ? new Date(professional.joiningDate) : null;
            if (jd) {
                if (filters.joiningDate.from && jd < new Date(filters.joiningDate.from)) continue;
                if (filters.joiningDate.to && jd > new Date(filters.joiningDate.to)) continue;
            }
        }

        if (filters.grossPay) {
            const pay = Number(professional?.ctcAnnual ?? 0);
            if (filters.grossPay.from && pay < filters.grossPay.from) continue;
            if (filters.grossPay.to && pay > filters.grossPay.to) continue;
        }

        if (filters.lossOfPay) {
            const lop = Number(professional?.lossOfPay ?? 0);
            if (filters.lossOfPay.from && lop < filters.lossOfPay.from) continue;
            if (filters.lossOfPay.to && lop > filters.lossOfPay.to) continue;
        }

        if (filters.taxPaid) {
            const tax = Number(professional?.taxPaid ?? 0);
            if (filters.taxPaid.from && tax < filters.taxPaid.from) continue;
            if (filters.taxPaid.to && tax > filters.taxPaid.to) continue;
        }

        if (filters.designation && professional?.designation !== filters.designation) continue;
        if (filters.department && professional?.department !== filters.department) continue;
        if (filters.location && professional?.location !== filters.location) continue;
        if (filters.status && general?.status !== filters.status) continue;

        const formatted: Record<string, any> = {};

        formatted.name = template.name ? `${general?.name?.first ?? ""} ${general?.name?.last ?? ""}`.trim() : null;
        formatted.emp_id = template.emp_id ? general?.empCode ?? null : null;
        formatted.status = template.status ? general?.status ?? null : null;
        formatted.joining_date = template.joining_date ? professional?.joiningDate ?? null : null;
        formatted.designation = template.designation ? professional?.designation ?? null : null;
        formatted.department = template.department ? professional?.department ?? null : null;
        formatted.location = template.location ? professional?.location ?? null : null;
        formatted.gender = template.gender ? general?.gender ?? null : null;
        formatted.email = template.email ? general?.primaryEmail ?? null : null;
        formatted.pan = template.pan ? general?.panNum ?? null : null;
        formatted.gross_salary = template.gross_salary ? professional?.ctcAnnual ?? null : null;
        formatted.lossOfPay = template.lossOfPay ? professional?.lossOfPay ?? null : null;
        formatted.taxPaid = template.taxPaid ? professional?.taxPaid ?? null : null;
        formatted.netPay = template.netPay ? professional?.netPay ?? null : null;
        formatted.leave = template.leave ? professional?.leaveType ?? null : null;
        formatted.leaveAdjustment = template.leaveAdjustment ? professional?.leaveAdjustment ?? null : null;
        formatted.leaveBalance = template.leaveBalance ? professional?.leaveBalance ?? null : null;
        formatted.workingPattern = template.workingPattern ? professional?.workWeek ?? null : null;
        formatted.phone = template.phone ? general?.phoneNum?.num ?? null : null;

        employees.push(formatted);
    }

    return {
        templateId: templateId,
        reportId: reportSnap.docs[0].id,
        page,
        limit,
        total,
        employees
    };
};

export const editEmployeeTemplate = async (templateId: string, userEmail: string, data: Partial<Employee_Snapshot_Template>) => {
    try {
        const templateRef = templateCollection.doc(templateId);
        await templateRef.update(data);

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Employee Snapshot Report",
            type: "UPDATE",
            message: `Employee Snapshot Report ${templateId} updated successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        return { message: "Template updated successfully", data };
    } catch (error) {
        logger.error("Error updating template", { error });
        throw error;
    }
};

export const deleteEmployeeSnapshot = async (templateId: string, userEmail: string) => {
    try {
        const templateRef = templateCollection.doc(templateId);
        await templateRef.delete();

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Employee Snapshot Report",
            type: "DELETE",
            message: `Employee Snapshot Report ${templateId} deleted successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        return { message: "Template deleted successfully" };
    } catch (error) {
        logger.error("Error deleting template", { error });
        throw error;
    }
};

export const getTemplate = async (templateId: string) => {
    try {
        const templateRef = templateCollection.doc(templateId);
        const templateSnap = await templateRef.get();
        if (!templateSnap.exists) {
            throw new Error("Template not found");
        }
        return templateSnap.data();
    } catch (error) {
        logger.error("Error fetching template", { error });
        throw error;
    }
};

export const exportFile = async (
    type: string,
    format: "excel" | "csv",
    res: Response,
) => {
    let records: any[] = [];
    if (type === "employeeSnapshot") {
        const result = await getEmployeeSnapshotByTemplate(type);
        records = result.employees ?? [];
    } else if (type === "attendanceSummary") {
        const result = await getAttendanceSummaryByTemplate(type);
        records = result.Attendance;
    } else if (type === "leave") {
        const result = await getLeaveByTemplate(type);
        records = result.Leave;
    } else if (type === "payslipSummary") {
        const result = await getPayslipByTemplate(type);
        records = result.payslip ?? [];
    } else if (type === "payslipComponent") {
        const result = await getComponentByTemplate(type);
        records = result.components;
    }

    if (!records.length) {
        res.status(404).send(`No ${type} records found`);
        return;
    }

    if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`${type}`);

        worksheet.addRow(Object.keys(records[0]));
        records.forEach(record => worksheet.addRow(Object.values(record)));

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${type}_snapshot.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } else {
        const json2csvParser = new Parser({ fields: Object.keys(records[0]) });
        const csv = json2csvParser.parse(records);

        res.header("Content-Type", "text/csv");
        res.attachment(`${type}_snapshot.csv`);
        res.send(csv);
    }
};

export const getAttendanceSummaryByTemplate = async (
    type: string,
    page?: number,
    limit?: number,
    filters: AttendanceFilters = {}
) => {
    const reportType = await getFullNameReport(type);

    const reportSnap = await reportCollection.where("type", "==", reportType).where("isDeleted", "==", false).limit(1).get();
    if (reportSnap.empty) {
        throw new Error(`Report for type "${type}" not found. Please create this report first.`);
    }
    const templateId = await returnTemplateId(type);
    const templateSnap = await templateCollection.doc(templateId).get();
    if (!templateSnap.exists) {
        throw new Error("Template not found");
    }
    const template = templateSnap.data() as Attendance_Summary_Template;

    let attendanceQuery: FirebaseFirestore.Query = attendanceCollection;

    if (filters.date?.from) {
        attendanceQuery = attendanceQuery.where("date", ">=", new Date(filters.date.from));
    }
    if (filters.date?.to) {
        attendanceQuery = attendanceQuery.where("date", "<=", new Date(filters.date.to));
    }
    if (filters.attendanceStatus) {
        attendanceQuery = attendanceQuery.where("status", "==", filters.attendanceStatus);
    }


    const totalSnap = await attendanceQuery.count().get();
    const total = totalSnap.data().count;
    if (limit) {
        attendanceQuery = attendanceQuery.offset(((page || 1) - 1) * limit).limit(limit);
    }
    const attendanceSnap = await attendanceQuery.get();

    const Attendance: any[] = [];

    for (const attDoc of attendanceSnap.docs) {
        const att = attDoc.data();

        const empSnap = await generalCollection.where("empCode", "==", att.empCode).limit(1).get();
        const empData = empSnap.empty ? null : empSnap.docs[0].data();
        console.log(empData);
        const { timeSpent, lateBy, earlyBy, overTime } = calculateAttendanceMetrics(att.inTime, att.outTime);

        const formatted: Record<string, any> = {};
        if (template.emp_id) formatted.emp_id = att.empCode;
        if (template.name) formatted.name = `${empData?.name?.first ?? ""} ${empData?.name?.last ?? ""}`.trim();
        if (template.status) formatted.status = empData?.status ?? null;
        if (template.attendanceStatus) formatted.attendanceStatus = att.status ?? null;
        if (template.date) {
            formatted.date = att.date?.toDate
                ? att.date.toDate().toISOString().split("T")[0]
                : null;
        }
        if (template.inTime) formatted.inTime = att.inTime ?? null;
        if (template.outTime) formatted.outTime = att.outTime ?? null;
        if (template.timeSpent) formatted.timeSpent = timeSpent;
        if (template.lateBy) formatted.lateBy = lateBy;
        if (template.earlyBy) formatted.earlyBy = earlyBy;
        if (template.overTime) formatted.overTime = overTime;

        Attendance.push(formatted);
    }

    return {
        templateId: templateId,
        reportId: reportSnap.docs[0].id,
        page,
        limit,
        total,
        Attendance,
    };
};

export const editAttendanceTemplate = async (templateId: string, userEmail: string, data: Partial<Attendance_Summary_Template>) => {
    try {
        const templateRef = templateCollection.doc(templateId);
        await templateRef.update(data);

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Attendance Summary Report",
            type: "UPDATE",
            message: `Attendance Summary Report ${templateId} updated successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        return { message: "Template updated successfully", data };
    } catch (error) {
        logger.error("Error updating template", { error });
        throw error;
    }
};

export const getLeaveByTemplate = async (type: string, page?: number, limit?: number, filters: LeaveFilters = {}) => {
    const reportType = await getFullNameReport(type);

    const reportSnap = await reportCollection.where("type", "==", reportType).limit(1).get();
    if (reportSnap.empty) {
        throw new Error(`Report for type "${type}" not found. Please create this report first.`);
    }
    const templateId = await returnTemplateId(type);
    const templateSnap = await templateCollection.doc(templateId).get();
    if (!templateSnap.exists) {
        throw new Error("Template not found");
    }
    const template = templateSnap.data() as Leave_Template;

    let leaveQuery: FirebaseFirestore.Query = leaveCollection;

    if (filters.name) {
        leaveQuery = leaveQuery.where("name", "==", filters.name);
    }

    if (filters.empCode) {
        leaveQuery = leaveQuery.where("empCode", "==", filters.empCode);
    }

    const totalSnap = await leaveQuery.count().get();
    const total = totalSnap.data().count;
    if (limit) {
        leaveQuery = leaveQuery.offset(((page || 1) - 1) * limit).limit(limit);
    }
    const leaveSnap = await leaveQuery.get();

    const Leave: any[] = [];

    for (const leaveDoc of leaveSnap.docs) {
        const leave = leaveDoc.data();
        const empSnap = await generalCollection.where("empCode", "==", leave.empCode).limit(1).get();
        const empData = empSnap.empty ? null : empSnap.docs[0].data();

        const formatted: Record<string, any> = {};
        if (template.emp_id) formatted.emp_id = leave.empCode;
        if (template.name) formatted.name = `${empData?.name?.first ?? ""} ${empData?.name?.last ?? ""}`.trim();
        if (template.status) formatted.status = empData?.status ?? null;
        if (template.Privileged) formatted.privileged = leave.leaveBalances?.Privileged ?? null;
        if (template.Sick) formatted.sick = leave.leaveBalances?.Sick ?? null;
        if (template.Casual) formatted.casual = leave.leaveBalances?.Casual ?? null;
        if (template.Planned) formatted.planned = leave.leaveBalances?.Planned ?? null;

        Leave.push(formatted);
    }

    return {
        templateId: templateId,
        reportId: reportSnap.docs[0].id,
        page,
        limit,
        total,
        Leave,
    };
};

export const editLeaveTemplate = async (templateId: string, userEmail: string, data: Partial<Leave_Template>) => {
    try {
        const templateRef = templateCollection.doc(templateId);
        await templateRef.update(data);

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Leave Report",
            type: "UPDATE",
            message: `Leave Report ${templateId} updated successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        return { message: "Template updated successfully", data };
    } catch (error) {
        logger.error("Error updating template", { error });
        throw error;
    }
};

export const getPayslipByTemplate = async (type: string, page?: number, limit?: number, filters: LeaveFilters = {}) => {
    const reportType = await getFullNameReport(type);
    const reportSnap = await reportCollection.where("type", "==", reportType).where("isDeleted", "==", false).limit(1).get();
    if (reportSnap.empty) {
        return {
            message: `Report for type "${type}" not found. Please create this report first.`,
        };
    }

    const templateId = await returnTemplateId(type);
    const templateSnap = await templateCollection.doc(templateId).get();
    if (!templateSnap.exists) {
        throw new Error("Template not found");
    }
    const template = templateSnap.data() as Payslip_Summary_Template;


    let query = employeeCollection.where("isDeleted", "==", false);

    if (limit) {
        query = query.offset(((page || 1) - 1) * limit).limit(limit);
    }

    const snapshot = await query.get();
    const totalSnap = await salaryCollection.where("isDeleted", "==", false).count().get();
    const total = totalSnap.data().count;

    const payslip: any[] = [];

    for (const doc of snapshot.docs) {
        const empData = doc.data();

        const [generalSnap, professionalSnap] = await Promise.all([
            generalCollection.doc(empData.generalId).get(),
            professionalCollection.doc(empData.professionalId).get(),
        ]);

        const general = generalSnap.exists ? generalSnap.data() : {};
        const professional = professionalSnap.exists ? professionalSnap.data() : {};
        const payslipName = professional?.payslipComponent ?? null;

        const payslipSnap = await db.collection('salaryStructures').where("groupName", "==", payslipName).limit(1).get();

        if (payslipSnap.empty) continue

        const payslipData = payslipSnap.docs[0].data();
        const salaryComponents = payslipData?.salaryComponent ?? [];

        const componentSnap = await db.collection('components').where("id", "in", salaryComponents).get();

        if (componentSnap.empty) continue;

        const components = componentSnap.docs.map(doc => doc.data());

        if (filters.empCode && general?.empCode !== filters.empCode) continue;
        if (filters.name && general?.name !== filters.name) continue;
        const componentsMap = components.reduce((acc, comp) => {
            acc[comp.code.toLowerCase()] = comp;
            return acc;
        }, {} as Record<string, any>);
        const formatted: Record<string, any> = {};

        formatted.name = template.name ? `${general?.name?.first ?? ""} ${general?.name?.last ?? ""}`.trim() : null;
        formatted.emp_id = template.emp_id ? general?.empCode ?? null : null;
        formatted.status = template.status ? general?.status ?? null : null;
        formatted.designation = template.designation ? professional?.designation ?? null : null;
        formatted.department = template.department ? professional?.department ?? null : null;
        formatted.location = template.location ? professional?.location ?? null : null;
        formatted.basic = template.basic ? componentsMap["BASIC".toLowerCase()]?.value ?? null : null;
        formatted.hra = template.hra ? componentsMap["HRA".toLowerCase()]?.value ?? null : null;
        formatted.conveyance = template.conveyance ? componentsMap["CONVEYANCE".toLowerCase()]?.value ?? null : null;
        if (template.totalEarning) {
            formatted.totalEarnings = components
                .filter(c => c.type === "EARNING")
                .reduce((sum, c) => sum + Number(c.value || 0), 0);
        } else {
            formatted.totalEarnings = null;
        }

        if (template.totalDeduction) {
            formatted.totalDeductions = components
                .filter(c => c.type === "DEDUCTION")
                .reduce((sum, c) => sum + Number(c.value || 0), 0);
        } else {
            formatted.totalDeductions = null;
        }

        formatted.pf = template.pf ? componentsMap["PF".toLowerCase()]?.value ?? null : null;
        formatted.pt = template.pt ? componentsMap["PT".toLowerCase()]?.value ?? null : null;
        formatted.esi = template.esi ? componentsMap["ESI".toLowerCase()]?.value ?? null : null;
        formatted.epf = template.epf ? componentsMap["EPF".toLowerCase()]?.value ?? null : null;
        formatted.eesi = template.eesi ? componentsMap["EESI".toLowerCase()]?.value ?? null : null;

        payslip.push(formatted);
    }

    return {
        templateId: templateId,
        reportId: reportSnap.docs[0].id,
        page,
        limit,
        total,
        payslip
    };
};

export const editpayslipTemplate = async (templateId: string, userEmail: string, data: Partial<Payslip_Summary_Template>) => {
    try {
        const templateRef = templateCollection.doc(templateId);
        await templateRef.update(data);

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Payslip Summary Report",
            type: "UPDATE",
            message: `Payslip Summary Report ${templateId} updated successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        return { message: "Template updated successfully", data };
    } catch (error) {
        logger.error("Error updating template", { error });
        throw error;
    }
};

export const getComponentByTemplate = async (type: string, page?: number, limit?: number, filters: LeaveFilters = {}) => {

    const reportType = await getFullNameReport(type);

    const reportSnap = await reportCollection.where("type", "==", reportType).where("isDeleted", "==", false).limit(1).get();
    if (reportSnap.empty) {
        throw new Error(`Report for type "${type}" not found. Please create this report first.`);
    }

    const templateId = await returnTemplateId(type);
    const templateSnap = await templateCollection.doc(templateId).get();
    if (!templateSnap.exists) {
        throw new Error("Template not found");
    }
    const template = templateSnap.data() as Component_Summary_Template;

    let empQuery = employeeCollection.where("isDeleted", "==", false);

    if (limit) {
        empQuery = empQuery.offset(((page || 1) - 1) * limit).limit(limit);
    }

    const empSnap = await empQuery.get();
    const result: any[] = [];

    for (const doc of empSnap.docs) {
        const empData = doc.data();

        const [generalSnap, professionalSnap] = await Promise.all([
            generalCollection.doc(empData.generalId).get(),
            professionalCollection.doc(empData.professionalId).get(),
        ]);


        const general = generalSnap.exists ? generalSnap.data() : {};
        const professional = professionalSnap.exists ? professionalSnap.data() : {};
        const payslipName = professional?.payslipComponent ?? null;
        if (!payslipName) continue;

        const payslipSnap = await db.collection("salaryStructures")
            .where("groupName", "==", payslipName)
            .limit(1)
            .get();

        if (payslipSnap.empty) continue;

        const payslipData = payslipSnap.docs[0].data();
        const salaryComponents: string[] = payslipData?.salaryComponent ?? [];
        if (!salaryComponents.length) continue;

        const chunks = [];
        for (let i = 0; i < salaryComponents.length; i += 30) {
            chunks.push(salaryComponents.slice(i, i + 30));
        }

        const snaps = await Promise.all(
            chunks.map(chunk => db.collection("components").where("id", "in", chunk).get())
        );

        let allComponents: any[] = snaps.flatMap(s => s.docs.map(d => d.data()));


        if (filters.name && general?.name !== filters.name) continue;

        for (const comp of allComponents) {
            result.push({
                name: template.name ? `${general?.name?.first ?? ""} ${general?.name?.last ?? ""}`.trim() : null,
                emp_id: template.emp_id ? general?.empCode ?? null : null,
                status: template.status ? general?.status ?? null : null,
                phoneNum: template.phoneNum ? general?.phoneNum.num ?? null : null,
                designation: template.designation ? professional?.designation ?? null : null,
                department: template.department ? professional?.department ?? null : null,
                location: template.location ? professional?.location ?? null : null,
                componentName: comp.name,
                code: comp.code,
                type: comp.type,
                amount: comp.value ?? null,
            });
        }
    }

    const total = result.length;
    const start = ((page || 1) - 1) * (limit || 10);
    const end = start + (limit || 10);
    const pagedResult = result.slice(start, end);

    return {
        templateId: templateId,
        reportId: reportSnap.docs[0].id,
        page,
        limit,
        total,
        components: pagedResult,
    };
};

export const editComponentTemplate = async (templateId: string, userEmail: string, data: Partial<Component_Summary_Template>) => {
    try {
        const templateRef = templateCollection.doc(templateId);
        await templateRef.update(data);

        const historyRef = reportHistoryCollection.doc();
        const history: ReportHistory = {
            id: historyRef.id,
            time: new Date().toISOString(),
            object: "Payslip Component Report",
            type: "UPDATE",
            message: `Payslip Component Report ${templateId} updated successfully`,
            who: userEmail,
        };
        await historyRef.set(history);

        return { message: "Template updated successfully", data };
    } catch (error) {
        logger.error("Error updating template", { error });
        throw error;
    }
};

export const getReportHistory = async (page: number, limit: number) => {
    try {
        const offset = (page - 1) * limit;

        const historySnap = await reportHistoryCollection
            .orderBy("time", "desc")
            .offset(offset)
            .limit(limit)
            .get();

        const history = historySnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return {
            page,
            limit,
            total: history.length,
            history,
        };
    } catch (error) {
        logger.error("Error fetching report history", { error });
        throw error;
    }
};
