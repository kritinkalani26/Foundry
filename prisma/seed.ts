/**
 * Seed script: creates demo printer owners in 6 tier-2 cities.
 * Run: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_DATA = [
  {
    user: { email: "rahul@makerspace.in", name: "Rahul Sharma", city: "Indore", lat: 22.7196, lng: 75.8577 },
    owner: { businessName: "MakerSpace Indore", description: "Professional FDM printing with 5 years experience. Specialty: engineering prototypes and functional parts.", rating: 4.8, totalRatings: 234, surgeMultiplier: 1.0 },
    printers: [
      { name: "Ender 3 Pro", type: "FDM" as const, maxBuildX: 220, maxBuildY: 220, maxBuildZ: 250, materials: ["PLA", "ABS", "PETG"] },
      { name: "Creality CR-10", type: "FDM" as const, maxBuildX: 300, maxBuildY: 300, maxBuildZ: 400, materials: ["PLA", "ABS"] },
    ],
  },
  {
    user: { email: "priya@3dprintkota.in", name: "Priya Patel", city: "Kota", lat: 25.2138, lng: 75.8648 },
    owner: { businessName: "3D Print Hub Kota", description: "Serving Kota's engineering students. Quick turnaround for JEE project models.", rating: 4.5, totalRatings: 89, surgeMultiplier: 1.2 },
    printers: [
      { name: "Photon Mono X", type: "RESIN" as const, maxBuildX: 195, maxBuildY: 120, maxBuildZ: 245, materials: ["RESIN"] },
      { name: "Ender 3 V2", type: "FDM" as const, maxBuildX: 220, maxBuildY: 220, maxBuildZ: 250, materials: ["PLA", "PETG"] },
    ],
  },
  {
    user: { email: "deepak@patnamakers.in", name: "Deepak Kumar", city: "Patna", lat: 25.5941, lng: 85.1376 },
    owner: { businessName: "Patna Makers", description: "First professional 3D printing studio in Patna. FDM and large format prints.", rating: 4.3, totalRatings: 56, surgeMultiplier: 1.0 },
    printers: [
      { name: "CR-10 Max", type: "FDM" as const, maxBuildX: 450, maxBuildY: 450, maxBuildZ: 470, materials: ["PLA", "ABS"] },
    ],
  },
  {
    user: { email: "amit@nagpur3d.in", name: "Amit Verma", city: "Nagpur", lat: 21.1458, lng: 79.0882 },
    owner: { businessName: "Nagpur 3D Studio", description: "Premium SLA prints for dental and jewelry applications. Also FDM for general use.", rating: 4.6, totalRatings: 112, surgeMultiplier: 1.0 },
    printers: [
      { name: "Form 3", type: "SLA" as const, maxBuildX: 145, maxBuildY: 145, maxBuildZ: 185, materials: ["RESIN"] },
      { name: "Prusa i3 MK3S+", type: "FDM" as const, maxBuildX: 250, maxBuildY: 210, maxBuildZ: 210, materials: ["PLA", "PETG", "ABS"] },
    ],
  },
  {
    user: { email: "neha@bhopalprint.in", name: "Neha Gupta", city: "Bhopal", lat: 23.2599, lng: 77.4126 },
    owner: { businessName: "Bhopal Print Works", description: "PETG specialist for industrial-grade functional parts. Student discount available.", rating: 4.2, totalRatings: 41, surgeMultiplier: 1.0 },
    printers: [
      { name: "Voron 2.4", type: "FDM" as const, maxBuildX: 350, maxBuildY: 350, maxBuildZ: 350, materials: ["PLA", "ABS", "PETG"] },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  for (const { user: userData, owner: ownerData, printers } of SEED_DATA) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: { ...userData, role: "PRINTER_OWNER" },
    });

    const owner = await prisma.printerOwner.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, ...ownerData },
    });

    for (const p of printers) {
      await prisma.printer.create({
        data: { ownerId: owner.id, ...p },
      });
    }

    console.log(`  ✓ ${ownerData.businessName} (${userData.city})`);
  }

  // Seed some demand metrics for Indore to demonstrate surge pricing
  const today = new Date(); today.setHours(0, 0, 0, 0);
  await prisma.demandMetric.upsert({
    where: { city_date: { city: "Indore", date: today } },
    update: { orderCount: 24 }, // High demand today
    create: { city: "Indore", date: today, orderCount: 24 },
  });
  // Seed weekly history (avg ~10)
  for (let d = 1; d <= 7; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    await prisma.demandMetric.upsert({
      where: { city_date: { city: "Indore", date } },
      update: {},
      create: { city: "Indore", date, orderCount: 8 + Math.floor(Math.random() * 5) },
    });
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
