import { ZodError, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.issues.map(err => err.message);
        return res.status(400).json({ error: errors });
      }
      req.body = parsed.data;
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(err => err.message);
        return res.status(400).json({ error: errors });
      }
      return res.status(400).json({ error: error.message });
    }
  };