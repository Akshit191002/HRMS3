import { Request, Response } from "express";
import {
  getOrganizationLogoUrl,
  getOrganizationSettings,
  updateOrganizationSettings,
  uploadOrganizationLogo,
} from "./organization.service";
import { UserRole } from "../../auth/constants/roles";
import logger from "../../utils/logger";

export const fetchOrganizationSettings = async (
  _req: Request,
  res: Response
) => {
  try {
    const data = await getOrganizationSettings();
    if (!data) {
      logger.warn("Organization settings not found");
      return res.status(404).json({ message: "Settings not found" });
    }

    const logoUrl = await getOrganizationLogoUrl();
    data.logoUrl = logoUrl || data.logoUrl;

    logger.info("Fetched organization settings");
    return res.status(200).json(data);
  } catch (err: any) {
    logger.error(`Failed to fetch settings: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Failed to fetch settings", error: err.message });
  }
};

export const updateOrganization = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
      logger.warn(`Unauthorized update attempt by UID: ${req.user?.uid}`);
      return res
        .status(403)
        .json({ message: "Only Super Admin can update settings" });
    }

    let logoUrl: string | null = null;

    if (req.file) {
      logoUrl = await uploadOrganizationLogo(req.file);
    }

    const success = await updateOrganizationSettings({
      ...req.body,
      ...(logoUrl ? { logoUrl } : {}),
      updatedBy: req.user.uid,
    });

    if (!success) {
      logger.error("Failed to update organization settings");
      return res
        .status(500)
        .json({ message: "Failed to update organization settings" });
    }
    logger.info(`Organization settings updated by UID: ${req.user.uid}`);
    return res.status(200).json({
      message: "Organization settings updated successfully",
      ...(logoUrl ? { logoUrl } : {}),
    });
  } catch (err: any) {
    logger.error(`Server Error while updating: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Server Error", error: err.message });
  }
};
