import Cookies from "cookies";
import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { roles, users } from "../db/schema";
import { db } from "../db/db";
import { eq } from "drizzle-orm";

declare module 'express-serve-static-core' {
    interface Request {
      userRole?: string | null;
    }
  }

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const publicKey = process.env.CLERK_PEM_PUBLIC_KEY;
  const cookies = new Cookies(req, res);
  const sessToken = cookies.get("__session");

  if (!sessToken) {
    res.status(401).json({ error: "User not signed in" });
    return;
  }

  try {
    const decoded = jwt.verify(sessToken, publicKey!, {
      algorithms: ["RS256"],
    });
    console.log("decoded", decoded);

    const clerkId = decoded.sub as string;

    const role = await db
      .select({
        role: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.role, roles.id))
      .where(eq(users.clerkId, clerkId));

    req.userRole = role[0].role;

    next(); // Pass control to the next middleware or handler
  } catch (error) {
    console.error("Error in authMiddleware", error);
    res.status(400).json({ error: "Invalid Token" });
  }
};

export default authMiddleware;
