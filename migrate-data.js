import { PrismaClient } from "@prisma/client";

const oldDb = new PrismaClient({
  datasources: { db: { url: process.env.OLD_DATABASE_URL } },
});

const newDb = new PrismaClient();

async function migrate(name, fn) {
  console.log(`\n🚀 Migrating ${name}...`);
  const data = await fn(oldDb);

  console.log(`${name}: ${data.length}`);

  if (data.length) {
    await newDb[name].createMany({
      data,
      skipDuplicates: true,
    });
  }

  console.log(`✅ ${name} done`);
}

async function main() {
  // ROOT
  await migrate("admin", (db) => db.admin.findMany());
  await migrate("exam", (db) => db.exam.findMany());
  await migrate("setting", (db) => db.setting.findMany());

  // LEVEL 1
  await migrate("student", (db) => db.student.findMany());
  await migrate("subject", (db) => db.subject.findMany());
  await migrate("crashCourse", (db) => db.crashCourse.findMany());
  await migrate("announcement", (db) => db.announcement.findMany());

  // LEVEL 2
  await migrate("chapter", (db) => db.chapter.findMany());
  await migrate("topic", (db) => db.topic.findMany());

  // LEVEL 3
  await migrate("question", (db) => db.question.findMany());

  // LEVEL 4
  await migrate("questionOption", (db) => db.questionOption.findMany());
  await migrate("test", (db) => db.test.findMany());

  // LEVEL 5
  await migrate("testQuestion", (db) => db.testQuestion.findMany());
  await migrate("testPurchase", (db) => db.testPurchase.findMany());
  await migrate("testAttempt", (db) => db.testAttempt.findMany());

  // LEVEL 6
  await migrate("attemptAnswer", (db) => db.attemptAnswer.findMany());

  // LEVEL 7
  await migrate("crashCourseTest", (db) => db.crashCourseTest.findMany());
  await migrate("crashCourseEnrollment", (db) =>
    db.crashCourseEnrollment.findMany(),
  );

  // FINAL
  await migrate("questionReport", (db) => db.questionReport.findMany());
  await migrate("payment", (db) => db.payment.findMany());

  console.log("\n🎉 FULL DATABASE MIGRATION DONE");
}

main()
  .catch(console.error)
  .finally(async () => {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  });
