import { db } from "../db/db";
import { users } from "../db/schema";
import { Request, Response } from "express";

export const UserCreationWebhook = async (req: Request, res: Response) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).send("Invalid payload");
  }

  const userId = data.id;
  const userEmail = data.email_addresses[0].email_address;
  const firstName = data.first_name;
  const lastName = data.last_name;
  
  try {
    await db
      .insert(users)
      .values({
        clerkId: userId,
        email: userEmail,
        firstName: firstName,
        lastName: lastName,
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
