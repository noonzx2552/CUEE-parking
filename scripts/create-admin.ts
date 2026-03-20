import bcrypt from "bcryptjs";

import { upsertAdminUser } from "@/lib/db/store";

function usernameFromEmail(email: string) {
  return email.trim().toLowerCase().replace(/@/g, "_at_").replace(/[^a-z0-9_]/g, "_");
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@cuee.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "Admin12345!";
  const name = process.env.ADMIN_NAME ?? "CUEE Admin";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await upsertAdminUser({
    email,
    passwordHash,
    name,
    username: usernameFromEmail(email),
  });

  console.log("Admin account is ready");
  console.log(`Email: ${user?.email ?? email}`);
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
