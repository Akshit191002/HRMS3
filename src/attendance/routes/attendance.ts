import express from "express";
import * as attendanceController from '../controller/attendance';

import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";


const route = express.Router()

route.post('/create', authenticateFirebaseUser, async (req, res) => {
    try {
        const records = req.body.records;
        if (!Array.isArray(records)) {
            return res.status(400).json({ error: "Invalid input format" });
        }
        const attendance = await attendanceController.addAttendance(records);
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

route.get('/getAll', authenticateFirebaseUser, async (req, res) => {
    try {
        const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

        if (isNaN(year)) {
            return res.status(400).json({ error: "Invalid year format" });
        }
        const attendance = await attendanceController.getYearlyAttendance(Number(year))
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// route.get('/getAll', authenticateFirebaseUser, async (req, res) => {
//     try {
//         const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
//         const limit = parseInt(req.query.limit as string);
//         const page = parseInt(req.query.page as string);
//         if (isNaN(year)) {
//             return res.status(400).json({ error: "Invalid year format" });
//         }
//         const attendance = await attendanceController.getYearlyAttendance(Number(year),page,limit)
//         res.status(200).json(attendance);
//     } catch (error) {
//         res.status(500).json({ error: (error as Error).message });
//     }
// });

route.post('/missing', authenticateFirebaseUser, async (req, res) => {
    try {
        const { year, month } = req.body
        let m = month - 1
        const attendance = await attendanceController.fillMissingAttendance(year, m);
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

route.post('/create/leave', authenticateFirebaseUser, async (req, res) => {
    try {
        const records = req.body.records;
        if (!Array.isArray(records)) {
            return res.status(400).json({ error: "Invalid input format" });
        }
        const attendance = await attendanceController.addAttendanceWithLeave(records);
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

route.get('/get/:code', authenticateFirebaseUser, async (req, res) => {
    try {
        const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

        if (isNaN(year)) {
            return res.status(400).json({ error: "Invalid year format" });
        }
        const code = req.params.code
        const attendance = await attendanceController.getEmployeeAttendance(code, Number(year))
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

route.patch('/edit/:code', authenticateFirebaseUser, async (req, res) => {
    try {
        const { year, date, status } = req.body
        const code = req.params.code
        const attendance = await attendanceController.editAttendance(code, status, year, date);
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

route.get('/getMonthly/:code/:year/:month', authenticateFirebaseUser, async (req, res) => {
    try {
        const { code } = req.params
        const { year, month } = req.query
        const attendance = await attendanceController.montlyAttendance(code, Number(year), Number(month));
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

export default route