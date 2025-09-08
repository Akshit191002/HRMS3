import admin from "../../firebase";
import logger from "../../utils/logger";
import { OrganizationSettings } from "./organization.model";

const db = admin.firestore();
const docRef = db.collection("organizationSettings").doc("main");
const bucket = admin.storage().bucket();

export const getOrganizationSettings =
  async (): Promise<OrganizationSettings | null> => {
    try {
      const doc = await docRef.get();
      if (!doc.exists) {
        logger.warn("Organization settings document does not exist");
        return null;
      }
      logger.info("Organization settings document retrieved");
      return { id: doc.id, ...(doc.data() as OrganizationSettings) };
    } catch (err: any) {
      logger.error(`Error retrieving organization settings: ${err.message}`);
      return null;
    }
  };

export const getOrganizationLogoUrl = async (): Promise<string | null> => {
  try {
    const fileName = "organizationLogo/orgLogo.jpeg";
    const [exists] = await bucket.file(fileName).exists();

    if (!exists) {
      logger.warn("Organization logo not found in storage");
      return null;
    }

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
      bucket.name
    }/o/${encodeURIComponent(fileName)}?alt=media`;
    return publicUrl;
  } catch (err: any) {
    logger.error(`Error fetching logo: ${err.message}`);
    return null;
  }
};

export const updateOrganizationSettings = async (
  settings: Partial<OrganizationSettings>
): Promise<boolean> => {
  try {
    const cleanedData = Object.fromEntries(
      Object.entries(settings).filter(([_, value]) => value !== undefined)
    );
    await docRef.set(
      {
        ...cleanedData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    logger.info("Organization settings updated successfully");
    return true;
  } catch (err: any) {
    logger.error(`Update Error in service: ${err.message}`);
    return false;
  }
};

export const uploadOrganizationLogo = async (
  file: Express.Multer.File
): Promise<string | null> => {
  try {
    const fileName = "organizationLogo/orgLogo.jpeg";
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype },
      resumable: false,
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
      bucket.name
    }/o/${encodeURIComponent(fileName)}?alt=media`;
    logger.info("Organization logo uploaded/overwritten successfully");
    return publicUrl;
  } catch (err: any) {
    logger.error(`Error uploading logo: ${err.message}`);
    return null;
  }
};
