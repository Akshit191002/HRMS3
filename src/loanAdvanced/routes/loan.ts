import express from "express";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import * as loanController from '../../loanAdvanced/controller/loan'
import { validate } from "../../utils/validate";
import { cancelLoanSchema, createLoanSchema, updateLoanSchema } from "../models/validation";

const route = express.Router()

route.post('/create/:id', authenticateFirebaseUser, validate(createLoanSchema), async (req, res) => {
  try {
    const bank = await loanController.createLoanRequest(req.params.id, req.body)
    res.status(201).json(bank);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
})

route.post('/approvedLoan/:id', authenticateFirebaseUser ,async (req, res) => {
  try {
    const bank = await loanController.approvedLoan(req.params.id, req.body)
    res.status(200).json(bank);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
})

route.post('/cancelLoan/:id', authenticateFirebaseUser, validate(cancelLoanSchema), async (req, res) => {
  try {
    const { cancelReason } = req.body;
    const bank = await loanController.cancelLoan(req.params.id, cancelReason)
    res.status(200).json(bank);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
})

route.patch('/edit/:id', authenticateFirebaseUser, validate(updateLoanSchema), async (req, res) => {
  try {
    const bank = await loanController.editLoan(req.params.id, req.body)
    res.status(200).json(bank);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
})

route.get('/getAll', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const filters = {
      status: req.query.status
        ? (req.query.status as string).split(',')
        : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };
    const loans = await loanController.getAllLoan(limit, page, filters);
    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
})

route.get('/get/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const id = req.params.id
    const loans = await loanController.getLoanById(id);
    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
})

export default route;