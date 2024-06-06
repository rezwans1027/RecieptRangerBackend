import { eq } from "drizzle-orm";
import { db } from "../db/db";
import { roles, users } from "../db/schema";
import { Request, Response } from "express";

export const UserCreationWebhook = async (req: Request, res: Response) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).send("Invalid payload");
  }

  const userId = data.id;
  const userEmail = data.email_addresses[0].email_address;
  const username = data.username;
  
  try {
    await db
      .insert(users)
      .values({
        clerkId: userId,
        email: userEmail,
        username: username,
        role: null,
        organization: null,
      })
      .execute();

    res.status(200).send("User added successfully");
  } catch (error) {
    console.error("Error inserting user:", error);
    res.status(500).send("Internal Server Error");
  }
};
