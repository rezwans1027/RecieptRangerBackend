import { Request, Response } from "express";
import { db } from "../db/db";
import { invitations, organizations, roles, users } from "../db/schema";
import { eq, isNotNull } from "drizzle-orm";
import Crypto from "crypto";
import { sql } from "drizzle-orm";
import AWS from "aws-sdk";
import { and } from "drizzle-orm";

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

export const getUserInfo = async (req: Request, res: Response) => {
  try {
    const clerkId = req.params.id as string;

    if (!clerkId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await db
      .select({
        userId: users.id,
        clerkId: users.clerkId,
        role: roles.name,
        firstName: users.firstName,
        lastName: users.lastName,
        organization: organizations.name,
        organizationId: users.organization,
        onboarded: users.onboarded,
      })
      .from(users)
      .leftJoin(roles, eq(users.role, roles.id))
      .leftJoin(organizations, eq(users.organization, organizations.id))
      .where(eq(users.clerkId, clerkId));

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
      .where(sql`LOWER(${organizations.name}) = LOWER(${organization})`)
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

export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const role = req.roleId;
    const organizationId = req.organizationId;
    const senderEmail = req.email;

    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNotNull(users.organization)))
      .execute();

    if (existingUser.length > 0) {
      return res.status(400).json({
        message: "User with this email already belongs to an organization",
      });
    }

    const token = Crypto.randomBytes(16).toString("hex");

    try {
      await db.insert(invitations).values({
        email: email,
        senderEmail: senderEmail,
        role: role,
        token: token,
        createdAt: new Date(),
        organization: organizationId,
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return res
        .status(500)
        .json({ message: "Error adding invitation to the database" });
    }

    const link = `${process.env.CLIENT_URL}/register?token=${token}`;

    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Text: { Data: `Please click the link to join: ${link}` },
        },
        Subject: { Data: "Invitation to Join" },
      },
      Source: "rezwans1027@gmail.com",
    };

    // Send the email
    try {
      await ses.sendEmail(params).promise();
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      return res.status(500).json({ message: "Error sending email" });
    }

    res.status(200).json({ message: "Invitation sent successfully" });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getInvitation = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const invitation = await db
      .select({
        invitationId: invitations.id,
        token: invitations.token,
        organizationId: organizations.id,
        organizationName: organizations.name,
        roleId: roles.id,
        roleName: roles.name,
      })
      .from(invitations)
      .leftJoin(organizations, eq(invitations.organization, organizations.id))
      .leftJoin(roles, eq(invitations.role, roles.id))
      .where(eq(invitations.token, token))
      .execute();

    if (invitation.length === 0) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    res.status(200).json(invitation[0]);
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const invitation = await db
      .select({
        invitationId: invitations.id,
        email: invitations.email,
        roleId: invitations.role,
        organizationId: invitations.organization,
      })
      .from(invitations)
      .where(eq(invitations.token, token))
      .execute();

    if (invitation.length === 0) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    const { email, roleId, organizationId } = invitation[0];

    await db
      .update(users)
      .set({
        organization: organizationId,
        role: roleId,
        onboarded: true,
      })
      .where(eq(users.email, email!))
      .execute();

    await db.delete(invitations).where(eq(invitations.token, token));

    res.status(200).json({ message: "Invitation accepted" });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getInvitations = async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId as unknown as number;
    const role = req.userRole as string;
    const senderEmail = req.email as string;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const recentInvitations = db.$with("recentInvitations").as(
      db
        .select({
          email: invitations.email,
          maxCreatedAt: sql`MAX(${invitations.createdAt})`.as("maxCreatedAt"),
        })
        .from(invitations)
        .groupBy(invitations.email)
    );

    // Common selection fields
    const invitationFields = {
      invitationId: invitations.id,
      email: invitations.email,
      senderEmail: invitations.senderEmail,
      role: roles.name,
      organization: organizations.name,
      createdAt: invitations.createdAt,
    };

    let invitationList;

    if (role === "admin") {
      invitationList = await db
        .with(recentInvitations)
        .select(invitationFields)
        .from(invitations)
        .leftJoin(roles, eq(invitations.role, roles.id))
        .leftJoin(organizations, eq(invitations.organization, organizations.id))
        .innerJoin(
          recentInvitations,
          and(
            eq(invitations.email, recentInvitations.email),
            eq(invitations.createdAt, recentInvitations.maxCreatedAt)
          )
        )
        .where(eq(invitations.organization, organizationId))
        .orderBy(sql`${invitations.createdAt} DESC`)
        .execute();
    } else {
      invitationList = await db
        .with(recentInvitations)
        .select(invitationFields)
        .from(invitations)
        .leftJoin(roles, eq(invitations.role, roles.id))
        .leftJoin(organizations, eq(invitations.organization, organizations.id))
        .innerJoin(
          recentInvitations,
          and(
            eq(invitations.email, recentInvitations.email),
            eq(invitations.createdAt, recentInvitations.maxCreatedAt)
          )
        )
        .where(
          and(
            eq(invitations.organization, organizationId),
            eq(invitations.senderEmail, senderEmail)
          )
        )
        .orderBy(sql`${invitations.createdAt} DESC`)
        .execute();
    }

    res.status(200).json(invitationList);
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getManagers = async (req: Request, res: Response) => {
  try {
    const organizationId = req.organizationId as number;

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const employeeCounts = db.$with("employeeCounts").as(
      db
        .select({
          manager_id: users.manager,
          employee_count: sql<number>`COUNT(${users.id})`.as("employee_count"),
        })
        .from(users)
        .where(eq(users.organization, organizationId))
        .groupBy(users.manager)
    );

    // Use the employeeCounts CTE in the main query
    const managersWithEmployeeCount = await db
      .with(employeeCounts)
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        employee_count:
          sql<number>`COALESCE(${employeeCounts}.employee_count, 0)`.as(
            "employee_count"
          ),
      })
      .from(users)
      .leftJoin(employeeCounts, eq(users.id, employeeCounts.manager_id))
      .where(and(eq(users.organization, organizationId), eq(users.role, 2)))
      .execute();

    res.status(200).json(managersWithEmployeeCount);
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    // const organizationId = req.organizationId as number;
    // const managerId = req.userId as number;
    // const userRole = req.userRole as string;

    const organizationId = 11;
    const managerId = 1;
    const userRole = "admin";

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    let employees;

    if (userRole === "admin") {
      employees = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          manager:
            sql<string>`CONCAT(manager.first_name, ' ', manager.last_name)`.as(
              "manager"
            ),
        })
        .from(users)
        .leftJoin(sql`${users} AS manager`, eq(users.manager, sql`manager.id`))
        .where(and(eq(users.organization, organizationId), eq(users.role, 3)))
        .execute();
    } else if (userRole === "manager") {
      employees = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          manager:
            sql<string>`CONCAT(manager.first_name, ' ', manager.last_name)`.as(
              "manager"
            ),
        })
        .from(users)
        .leftJoin(sql`${users} AS manager`, eq(users.manager, sql`manager.id`))
        .where(
          and(
            eq(users.organization, organizationId),
            eq(users.manager, managerId),
            eq(users.role, 3)
          )
        )
        .execute();
    } else {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.status(200).json(employees);
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
