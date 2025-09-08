import express from "express";
import dotenv from "dotenv";
import authRoutes from "./auth/routes/auth.routes";
import departmentRoutes from "./gettingStarted/department/department.routes";
import designationRoutes from "./gettingStarted/designation/designation.routes";
import organizationSettingsRoutes from "./gettingStarted/orgSetting/organization.routes";
import workingPatternRoutes from "./gettingStarted/workingPattern/workingPattern.routes";
import locationRoutes from "./gettingStarted/location/location.routes";
import holidayConfigurationRoutes from "./gettingStarted/holidayConfiguration/holidayConfig.routes";
import holidayCalendarRoutes from "./gettingStarted/holidayCalendar/holidayCalendar.routes";
import rolesRoutes from "./gettingStarted/roles/roles.routes";
import sequenceNumberRoutes from "./gettingStarted/sequenceNumber/sequence.routes";
import leaveRoutes from "./leavesConfiguration/leaves/leave.routes";
import dsrRoutes from "./dsr/dsr.route";
import leaveRequestRoutes from "./leavesConfiguration/leaveRequest/leaveRequest.route";
import ratingScaleRoutes from "./ratings/ratingCriteriaScale/ratingScale/ratingScale.route";
import webCheckinSettingsRoutes from "./gettingStarted/webCheckinSettings/webCheckin.route";
import ratingCriteriaRoutes from "./ratings/ratingCriteriaScale/criteria/criteria.routes";
import recordRoutes from "./ratings/records/records.routes";
import ratingRoutes from "./ratings/allRatings/rating.routes";
import payrollConfigurationRoutes from "./gettingStarted/payrollConfiguration/payrollConfiguration.route";
import eventNotificationRoutes from "./dashboard/eventNotification/eventNotification.route";
import totalCountRoutes from "./dashboard/totalCounts/totalCount.routes";
import cors from "cors";
import helmet from "helmet";
import reportRoutes from "./report/routes/report";
import cron from "node-cron";
import { runScheduledJobs } from "../src/report/controller/job";

import employeeRoutes from "./employee/routes/employee";
import projectRoutes from "./project/routes/project";
import loanRoutes from "./loanAdvanced/routes/loan";
import componentRoutes from "./gettingStarted/payslipComponent/routes/payslip";
import attendanceRoutes from "./attendance/routes/attendance";
import uploadRoutes from "./employee/routes/upload";
dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(helmet());
app.use(cors());
app.use("/employees", uploadRoutes);
app.use(express.json());

// app.use("/api/auth", authRoutes);
// app.use("/api/departments", departmentRoutes);
// app.use("/api/designations", designationRoutes);
// app.use("/api/organization-settings", organizationSettingsRoutes);
// app.use("/api/working-patterns", workingPatternRoutes);
// app.use("/api/locations", locationRoutes);
// app.use("/api/holidayConfiguraion", holidayConfigurationRoutes);
// app.use("/api/holidayCalendar", holidayCalendarRoutes);
// app.use("/api/roles", rolesRoutes);
// app.use("/api/sequenceNumber", sequenceNumberRoutes);
// app.use("/payslip", componentRoutes);
// app.use("/api/webCheckinSettings", webCheckinSettingsRoutes);
// app.use("/api/leaves", leaveRoutes);
// app.use("/api/dsr", dsrRoutes);
// app.use("/api/leaveRequest", leaveRequestRoutes);
// app.use("/employees", employeeRoutes);
// app.use("/project", projectRoutes);
// app.use("/loan", loanRoutes);
// app.use("/attendance", attendanceRoutes);
// app.use("/api/ratingScale", ratingScaleRoutes);
// app.use("/api/ratingCriteria", ratingCriteriaRoutes);
// app.use("/api/records", recordRoutes);
// app.use("/api/ratings", ratingRoutes);
// app.use("/report", reportRoutes);

app.use("/auth", authRoutes);
app.use("/departments", departmentRoutes);
app.use("/designations", designationRoutes);
app.use("/organization-settings", organizationSettingsRoutes);
app.use("/working-patterns", workingPatternRoutes);
app.use("/locations", locationRoutes);
app.use("/holidayConfiguraion", holidayConfigurationRoutes);
app.use("/holidayCalendar", holidayCalendarRoutes);
app.use("/roles", rolesRoutes);
app.use("/sequenceNumber", sequenceNumberRoutes);
app.use("/payslip", componentRoutes);
app.use("/webCheckinSettings", webCheckinSettingsRoutes);
app.use("/leaves", leaveRoutes);
app.use("/dsr", dsrRoutes);
app.use("/leaveRequest", leaveRequestRoutes);
app.use("/employees", employeeRoutes);
app.use("/project", projectRoutes);
app.use("/loan", loanRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/ratingScale", ratingScaleRoutes);
app.use("/ratingCriteria", ratingCriteriaRoutes);
app.use("/records", recordRoutes);
app.use("/ratings", ratingRoutes);
app.use("/report", reportRoutes);

// cron.schedule("* * * * *", async () => {
//   await runScheduledJobs();
//   console.log("Job is running every minute");
// });
app.use("/api/payrollConfiguration", payrollConfigurationRoutes);
app.use("/api/eventNotification", eventNotificationRoutes);
app.use("/api/totalCounts", totalCountRoutes);

app.get("/", (req, res) => {
  res.status(200).send("Firebase Auth Backend is Running!");
});

app.listen(PORT, () => {
  console.log(`Payroll portal is running at http://localhost:${PORT}`);
});
