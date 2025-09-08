import { parse as json2csv } from "json2csv";
import ExcelJS from "exceljs";
import * as admin from 'firebase-admin';
import { getAttendanceSummaryByTemplate, getComponentByTemplate, getEmployeeSnapshotByTemplate, getLeaveByTemplate, getPayslipByTemplate } from "../report/controller/report";

const db = admin.firestore();

export const generateReport = async (reportId: string, format: string): Promise<Buffer> => {
    const reportSnap = await db.collection('reports').doc(reportId).get()
    if (!reportSnap.exists) throw new Error("Report not found")

    const report = reportSnap.data() as any;
    const type = report.type;
    let records: any[] = [];
    if (type === 'Employees Snapshot Report') {
        const result = await getEmployeeSnapshotByTemplate('employeeSnapshot', 1, 1000);
        records = result.employees ?? [];
    } else if (type === "Attendance Summary Report") {
        const result = await getAttendanceSummaryByTemplate("attendanceSummary", 1, 1000);
        records = result.Attendance ?? [];
    } else if (type === "Leave Report") {
        const result = await getLeaveByTemplate("leave", 1, 1000);
        records = result.Leave ?? [];
    } else if (type === "Payslip Summary Report") {
        const result = await getPayslipByTemplate("payslipSummary", 1, 1000);
        records = result.payslip ?? [];
    } else if (type === "Payslip Component Report") {
        const result = await getComponentByTemplate("payslipComponent", 1, 1000);
        records = result.components ?? [];
    } else {
        throw new Error(`Unsupported report type: ${type}`);
    }


    if (format === "CSV") {
        const csv = json2csv(records);
        return Buffer.from(csv, "utf-8");
    }

    if (format === "XLSX") {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(type);

        sheet.addRow(Object.keys(records[0]));
        records.forEach(rec => sheet.addRow(Object.values(rec)));

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(arrayBuffer as ArrayBuffer);
    }
    throw new Error(`Unsupported format: ${format}`);

};
