import { Request, Response } from "express";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { UserRole } from "../constants/roles";
import {
  checkSuperAdminExists,
  createUserWithRole,
  getUserDataByUid,
  logoutUser,
  refreshAccessToken,
} from "../services/auth.service";
import firebaseConfig from "../../utils/firebaseClient";
import logger from "../../utils/logger";

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

export const signupSuperAdmin = async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;

  try {
    const superAdminExists = await checkSuperAdminExists();

    if (superAdminExists) {
      logger.warn(`Super Admin signup attempt failed: Already exists`);
      return res.status(403).json({ message: "Super Admin already exists" });
    }

    const user = await createUserWithRole(
      email,
      password,
      displayName,
      UserRole.SUPER_ADMIN,
      true,
      false
    );
    logger.info(`Super Admin created: UID = ${user.uid}, Email = ${email}`);
    return res.status(201).json({
      message: "Super Admin created successfully",
      uid: user.uid,
    });
  } catch (error: any) {
    logger.error(`Super Admin creation failed: ${error.message}`);
    return res.status(400).json({
      message: "Failed to create Super Admin",
      error: error.message,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    );
    const accessToken = await userCredential.user.getIdToken();
    const refreshToken = userCredential.user.refreshToken;
    const uid = userCredential.user.uid;
    const displayName = userCredential.user.displayName;

    const userData = await getUserDataByUid(uid);

    if (!userData) {
      logger.warn(`Login failed: UID ${uid} not found in DB`);
      return res.status(404).json({ message: "User not found in database" });
    }

    if (!userData.isLoginEnabled || !userData.isAccountLocked) {
      logger.warn(
        `Login failed: UID ${uid} user account is locked or login is disabled.`
      );
      return res
        .status(403)
        .json({ message: "user account is locked or login is disabled" });
    }

    logger.info(`Login successful: UID = ${uid}, Role = ${userData.role}`);
    return res.status(200).json({
      message: "Login successful",
      uid,
      displayName,
      role: userData.role,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    logger.error(`Login failed for ${email}: ${error.message}`);
    return res.status(401).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.warn("Refresh attempt failed: No refresh token provided");
    return res.status(400).json({ message: "Refresh token required" });
  }

  try {
    const {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    } = await refreshAccessToken(refreshToken);

    return res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    });
  } catch (error: any) {
    logger.error(`Token refresh failed: ${error.message}`);
    return res.status(401).json({
      message: "Token refresh failed",
      error: error.message,
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("Logout attempt failed: No token provided");
    return res.status(400).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const message = await logoutUser(token);
    logger.info(`User logged out. Token: ${token.substring(0, 10)}...`);
    return res.status(200).json({ message });
  } catch (error: any) {
    logger.error(`Logout failed: ${error.message}`);
    return res.status(500).json({
      message: "Failed to logout",
      error: error.message || "Something went wrong",
    });
  }
};
