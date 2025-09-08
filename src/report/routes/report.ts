import express from "express";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import * as reportController from '../controller/report';
import { AttendanceFilters, EmployeeSnapshotFilters, LeaveFilters } from "../models/report";

const route = express.Router()

route.post("/create", authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const report = await reportController.createReport(req.body, userEmail);
    res.status(201).json(report);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

route.post('/schedule/create/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const report = await reportController.createScheduleReport(req.params.id, req.body, userEmail);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get('/getAll', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const report = await reportController.getAllReport(page, limit);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.delete('/delete/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const report = await reportController.deleteReport(req.params.id, userEmail);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get('/schedule/getAll', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const report = await reportController.getAllScheduledReports(page, limit);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.patch('/schedule/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const project = await reportController.updateScheduledReport(req.params.id, userEmail, req.body);
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.delete('/delete/schedule/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const report = await reportController.deleteScheduledReport(req.params.id, userEmail);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get('/getAll/employeeSnapshot/:type', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const filters: EmployeeSnapshotFilters = {};
    if (req.query.joiningDateFrom || req.query.joiningDateTo) {
      filters.joiningDate = {
        from: req.query.joiningDateFrom ? new Date(req.query.joiningDateFrom as string) : undefined,
        to: req.query.joiningDateTo ? new Date(req.query.joiningDateTo as string) : undefined,
      };
    }

    if (req.query.grossPayFrom || req.query.grossPayTo) {
      filters.grossPay = {
        from: req.query.grossPayFrom ? Number(req.query.grossPayFrom) : undefined,
        to: req.query.grossPayTo ? Number(req.query.grossPayTo) : undefined,
      };
    }

    if (req.query.lossOfPayFrom || req.query.lossOfPayTo) {
      filters.lossOfPay = {
        from: req.query.lossOfPayFrom ? Number(req.query.lossOfPayFrom) : undefined,
        to: req.query.lossOfPayTo ? Number(req.query.lossOfPayTo) : undefined,
      };
    }

    if (req.query.taxPaidFrom || req.query.taxPaidTo) {
      filters.taxPaid = {
        from: req.query.taxPaidFrom ? Number(req.query.taxPaidFrom) : undefined,
        to: req.query.taxPaidTo ? Number(req.query.taxPaidTo) : undefined,
      };
    }

    if (req.query.designation) filters.designation = req.query.designation as string;
    if (req.query.department) filters.department = req.query.department as string;
    if (req.query.location) filters.location = req.query.location as string;
    if (req.query.status) filters.status = req.query.status as string;

    const report = await reportController.getEmployeeSnapshotByTemplate(req.params.type, page, limit, filters);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.patch('/updateTemplate/employeeSnapshot/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const report = await reportController.editEmployeeTemplate(req.params.id, userEmail, req.body);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get('/getAll/attendance/:type', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const filters: AttendanceFilters = {};

    if (req.query.from || req.query.to) {
      filters.date = {
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
      };
    }
    if (req.query.attendanceStatus) filters.attendanceStatus = req.query.attendanceStatus as string;

    const report = await reportController.getAttendanceSummaryByTemplate(req.params.type, page, limit, filters);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.patch('/updateTemplate/attendanceSummary/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const report = await reportController.editAttendanceTemplate(req.params.id, userEmail, req.body);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get('/getAll/leave/:type', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const filters: LeaveFilters = {};
    if (req.query.name) filters.name = req.query.name as string;
    if (req.query.empCode) filters.empCode = req.query.empCode as string;

    const leave = await reportController.getLeaveByTemplate(req.params.type, page, limit, filters);
    res.status(200).json(leave);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.patch('/updateTemplate/leave/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const report = await reportController.editLeaveTemplate(req.params.id, userEmail, req.body);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get("/export/:type", async (req, res) => {
  try {
    const format = (req.query.format as "excel" | "csv") || "excel";
    await reportController.exportFile(req.params.type, format, res);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

route.get("/getTemplate/:id", async (req, res) => {
  try {
    const template = await reportController.getTemplate(req.params.id);
    res.status(200).json(template);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

route.get('/getAll/payslip/:type', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const filters: LeaveFilters = {};
    if (req.query.name) filters.name = req.query.name as string;
    if (req.query.empCode) filters.empCode = req.query.empCode as string;

    const payslip = await reportController.getPayslipByTemplate(req.params.type, page, limit, filters);
    res.status(200).json(payslip);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.patch('/updateTemplate/payslip/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const report = await reportController.editpayslipTemplate(req.params.id, userEmail, req.body);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get('/getAll/component/:type', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const filters: LeaveFilters = {};
    if (req.query.name) filters.name = req.query.name as string;

    const component = await reportController.getComponentByTemplate(req.params.type, page, limit, filters);
    res.status(200).json(component);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.patch('/updateTemplate/component/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const userEmail = req.user?.email || "unknown";
    const report = await reportController.editComponentTemplate(req.params.id, userEmail, req.body);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get("/history", authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const history = await reportController.getReportHistory(page, limit);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default route;