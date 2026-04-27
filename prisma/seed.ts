import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("tabi2026", 10);

  await prisma.user.upsert({
    where: { email: "owner1@tabi.local" },
    update: {},
    create: { email: "owner1@tabi.local", password: hashed, name: "パパ" },
  });

  await prisma.user.upsert({
    where: { email: "owner2@tabi.local" },
    update: {},
    create: { email: "owner2@tabi.local", password: hashed, name: "ママ" },
  });

  await prisma.cat.upsert({
    where: { id: "tabi" },
    update: {},
    create: { id: "tabi", name: "たび", breed: "雑種" },
  });

  console.log("Seed完了");
}

main().finally(() => prisma.$disconnect());
