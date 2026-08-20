import "reflect-metadata";
import { AppDataSource } from "../src/db.ts";
import { User } from "../src/entity/User.ts";
import { Organization } from "../src/entity/Organization.ts";
import bcrypt from "bcryptjs";

async function bootstrap() {
  const email = process.env.ADMIN_EMAIL || "admin@experimindlabs.com";
  const rawPassword = process.env.ADMIN_PASSWORD || "AdminPass123!";
  const name = process.env.ADMIN_NAME || "System Admin";

  console.log(`🚀 Bootstrapping Admin Account for ${email}...`);

  await AppDataSource.initialize();

  const orgRepo = AppDataSource.getRepository(Organization);
  const userRepo = AppDataSource.getRepository(User);

  let org = await orgRepo.findOneBy({ id: "00000000-0000-0000-0000-000000000000" });
  if (!org) {
    org = orgRepo.create({
      id: "00000000-0000-0000-0000-000000000000",
      name: "ExperiMind Labs Primary HQ",
      slug: "primary-hq",
    });
    await orgRepo.save(org);
    console.log("✅ Created default Organization: Primary HQ");
  }

  let user = await userRepo.findOneBy({ email });
  const hash = await bcrypt.hash(rawPassword, 12);

  if (user) {
    user.role = "admin";
    user.password_hash = hash;
    user.organization_id = org.id;
    user.is_active = true;
    await userRepo.save(user);
    console.log(`✅ Admin account updated for ${email}`);
  } else {
    user = userRepo.create({
      email,
      name,
      password_hash: hash,
      role: "admin",
      organization_id: org.id,
      is_active: true,
    });
    await userRepo.save(user);
    console.log(`✅ Admin account created for ${email}`);
  }

  await AppDataSource.destroy();
  console.log("🎉 Bootstrap completed successfully.");
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap failed:", err);
  process.exit(1);
});
