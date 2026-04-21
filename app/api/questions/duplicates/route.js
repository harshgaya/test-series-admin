import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

// Similarity ratio between two strings (0 to 1)
function similarity(a, b) {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;

  // Levenshtein distance
  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer[i - 1] !== shorter[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]) / longer.length;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(searchParams.get("threshold") || "0.85");
    const examId = searchParams.get("examId");

    const where = {};
    if (examId) where.examId = parseInt(examId);

    const questions = await prisma.question.findMany({
      where,
      select: {
        id: true,
        questionText: true,
        difficulty: true,
        createdAt: true,
        exam: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
      },
      orderBy: { id: "asc" },
    });

    if (questions.length === 0) {
      return successResponse({
        groups: [],
        totalGroups: 0,
        totalDuplicates: 0,
        scanned: 0,
      });
    }

    const groups = [];
    const visited = new Set();

    for (let i = 0; i < questions.length; i++) {
      if (visited.has(questions[i].id)) continue;

      const group = [questions[i]];
      visited.add(questions[i].id);

      for (let j = i + 1; j < questions.length; j++) {
        if (visited.has(questions[j].id)) continue;

        const sim = similarity(
          questions[i].questionText,
          questions[j].questionText,
        );
        if (sim >= threshold) {
          group.push({ ...questions[j], similarity: Math.round(sim * 100) });
          visited.add(questions[j].id);
        }
      }

      if (group.length > 1) {
        group[0].similarity = 100;
        groups.push(group);
      }
    }

    const totalDuplicates = groups.reduce((sum, g) => sum + g.length - 1, 0);

    return successResponse({
      groups,
      totalGroups: groups.length,
      totalDuplicates,
      scanned: questions.length,
    });
  } catch (error) {
    console.error("Duplicates scan error:", error);
    return errorResponse("Scan failed", 500);
  }
}

export async function DELETE(request) {
  try {
    const { ids } = await request.json();
    if (!ids || ids.length === 0) return errorResponse("No IDs provided");
    await prisma.question.deleteMany({
      where: { id: { in: ids.map(Number) } },
    });
    return successResponse({ deleted: ids.length });
  } catch (error) {
    console.error(error);
    return errorResponse("Delete failed", 500);
  }
}
