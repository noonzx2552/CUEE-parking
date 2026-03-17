import bcrypt from "bcryptjs";

import { connectToDatabase } from "@/lib/db/mongoose";
import { UserModel } from "@/models/User";

function usernameFromEmail(email: string) {
  return email.trim().toLowerCase().replace(/@/g, "_at_").replace(/[^a-z0-9_]/g, "_");
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@cuee.local";
  const password = process.env.ADMIN_PASSWORD ?? "Admin12345!";
  const name = process.env.ADMIN_NAME ?? "CUEE Admin";

  await connectToDatabase();

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await UserModel.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        name,
        username: usernameFromEmail(email),
        email: email.toLowerCase(),
        passwordHash,
        role: "admin",
        isActive: true,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  );

  console.log("Admin account is ready");
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error("Create admin failed", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit();
  });
