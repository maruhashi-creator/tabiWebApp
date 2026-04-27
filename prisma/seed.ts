import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("tabi2021", 10);

  await prisma.user.upsert({
    where: { email: "kazuyamaruhashi@gmail.com" },
    update: {},
    create: { email: "kazuyamaruhashi@gmail.com", password: hashed, name: "おとうさん" },
  });

  await prisma.user.upsert({
    where: { email: "route3973@gmail.com" },
    update: {},
    create: { email: "route3973@gmail.com", password: hashed, name: "おかあさん" },
  });

  await prisma.cat.upsert({
    where: { id: "tabi" },
    update: {},
    create: { id: "tabi", name: "たび", breed: "雑種" },
  });

  console.log("Seed完了");
}

main().finally(() => prisma.$disconnect());
