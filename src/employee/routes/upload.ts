import express from "express";
import { upload } from "../../utils/upload.middleware";
import * as employeeController from '../controller/employee';
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";

const route = express.Router()
route.post('/upload-pic/:id', authenticateFirebaseUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const pic = await employeeController.uploadProfilePicture(req.params.id, req.file)
    res.status(201).json(pic);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
})
export default route;
