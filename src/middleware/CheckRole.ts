import { NextFunction, Request, Response } from "express";

const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;
    if (!userRole) {
      return res.status(401).json({ error: "User not signed in" });
    }
    if (!allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ error: "Forbidden: You don't have the required role" });
    }
    next();
  };
};

export default checkRole;
