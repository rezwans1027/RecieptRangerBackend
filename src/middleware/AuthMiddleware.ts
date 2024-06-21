import Cookies from "cookies";
import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { roles, users } from "../db/schema";
import { db } from "../db/db";
import { eq } from "drizzle-orm";

declare module "express-serve-static-core" {
  interface Request {
    userRole?: string | null;
    userId?: number | null;
    organizationId?: number | null;
    email?: string | null;
    roleId?: number | null;
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
  const token = req.headers.authorization?.split(" ")[1];

  if (!sessToken && !token) {
    res.status(401).json({ error: "User not signed in" });
    return;
  }

  let decoded: any;

  try {
    if (token) {
      decoded = jwt.verify(token, publicKey!, {
        algorithms: ["RS256"],
      });
    } else if (sessToken) {
      decoded = jwt.verify(sessToken, publicKey!, {
        algorithms: ["RS256"],
      });
    }

    const clerkId = decoded.sub as string;

    const userInfo = await db
      .select({
        role: roles.name,
        roleId: users.role,
        userId: users.id,
        organizationId: users.organization,
        email: users.email,
      })
      .from(users)
      .leftJoin(roles, eq(users.role, roles.id))
      .where(eq(users.clerkId, clerkId));

    if (userInfo) {
      req.userRole = userInfo[0].role;
      req.roleId = userInfo[0].roleId;
      req.userId = userInfo[0].userId;
      req.organizationId = userInfo[0].organizationId;
      req.email = userInfo[0].email;
    }

    next(); // Pass control to the next middleware or handler
  } catch (error) {
    console.error("Error in authMiddleware", error);
    res.status(400).json({ error: "Invalid Token" });
  }
};

export default authMiddleware;
