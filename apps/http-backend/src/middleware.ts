import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";

export function middleware(req: Request, res: Response, next: NextFunction) {
    const tokenHeader = req.headers["authorization"] || "";
    const token = tokenHeader.startsWith("Bearer ") ? tokenHeader.slice(7) : tokenHeader;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        (req as any).userId = decoded.userId;

        next();
    } catch (err) {
        res.status(403).json({
            message: "Unauthorized"
        });
    }
}