import { Request, Response } from "express";
import { db } from "../db/db";
import { organizations, roles, users } from "../db/schema";
import { eq } from "drizzle-orm";

export const getUserInfo = async (req: Request, res: Response) => {
  try {
    const clerkId = req.params.id as string;

    if (!clerkId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log(clerkId)

    const user = await db
      .select({
        userId: users.id,
        clerkId: users.clerkId,
        role: roles.name,
        username: users.username,
        organization: organizations.name,
        onboarded: users.onboarded,
      })
      .from(users)
      .leftJoin(roles, eq(users.role, roles.id))
      .leftJoin(organizations, eq(users.organization, organizations.id))
      .where(eq(users.clerkId, clerkId));

      console.log(user[0])

    res.status(200).json(user[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const userOnboarding = async (req: Request, res: Response) => {
  try {
    const clerkId = req.params.id as string;
    const { role, organization } = req.body;

    if (!clerkId || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!organization) {
      await db
        .update(users)
        .set({ role: role, onboarded: true })
        .where(eq(users.clerkId, clerkId));

      return res.status(200).json({ message: "User onboarding complete" });
    }

    const existingOrganizations = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, organization))
      .execute();

    if (existingOrganizations.length > 0) {
      // Organization exists, return an appropriate response
      return res.status(400).json({ message: "Organization already exists" });
    } else {
      // Organization does not exist, create it
      const newOrganization = await db
        .insert(organizations)
        .values({ name: organization })
        .returning({ id: organizations.id })
        .execute();

      const organizationId = newOrganization[0].id as number;

      // Update the user with the role and new organization
      await db
        .update(users)
        .set({
          role: role,
          organization: organizationId,
          onboarded: true,
        })
        .where(eq(users.clerkId, clerkId));

      res.status(200).json({ message: "User onboarding complete" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};