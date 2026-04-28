import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env to seed the admin user.",
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN },
    create: {
      email,
      name: "Admin",
      password: hashed,
      role: Role.ADMIN,
    },
  });

  console.log(`Seeded admin: ${user.email} (${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
