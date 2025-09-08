import { Request, Response } from "express";
import {
  addBulkRatings,
  getEmployeeWithRatings,
  updateEmployeeProjectScores,
} from "./rating.service";
import { RatingInput } from "./rating.model";
import logger from "../../utils/logger";

export const addBulkRatingsController = async (req: Request, res: Response) => {
  try {
    const data: RatingInput = req.body;
    const result = await addBulkRatings(data);
    logger.info(`Bulk ratings added successfully}`);
    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    logger.error(`Failed to add bulk ratings | Error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeRatingsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { employeeId, year, department } = req.query as {
      employeeId?: string;
      year?: string;
      department?: string;
    };

    const result = await getEmployeeWithRatings(employeeId, year, department);
    logger.info(
      `Fetched employee ratings | EmployeeID: ${employeeId || "all"} | Year: ${
        year || "all"
      } | Department: ${department || "all"}`
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error(`Failed to fetch employee ratings | Error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmployeeProjectScoresController = async (
  req: Request,
  res: Response
) => {
  try {
    const { employeeId, year, month, projectName } = req.body;
    const { scores, areaOfDevelopment } = req.body;

    if (!employeeId || !year || !month || !projectName || !scores) {
      logger.warn(
        `Missing required fields for updating project scores | EmployeeID: ${employeeId}`
      );
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const result = await updateEmployeeProjectScores(
      employeeId,
      year,
      month,
      projectName,
      scores,
      areaOfDevelopment
    );
    logger.info(
      `Employee project scores updated successfully | EmployeeID: ${employeeId} | Project: ${projectName} | Month: ${month} | Year: ${year}`
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error(
      `Failed to update employee project scores | EmployeeID: ${req.body.employeeId} | Error: ${error.message}`
    );
    return res.status(500).json({ success: false, message: error.message });
  }
};
