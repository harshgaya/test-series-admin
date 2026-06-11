import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(searchParams.get("threshold") || "0.95");
    const examId = searchParams.get("examId");
    const sim = Math.min(0.99, Math.max(0.7, threshold));
    const examClause = examId ? `AND a.exam_id = ${parseInt(examId)}` : "";

    // Set threshold and find all pairs in one query
    // Returns ALL pairs - client handles pagination (instant navigation)
    const rawPairs = await prisma.$queryRawUnsafe(`
      SELECT
        a.id   AS id_a,
        b.id   AS id_b,
        ROUND(similarity(a.question_text_clean, b.question_text_clean)::numeric, 2) AS sim
      FROM
        questions a,
        questions b,
        (SELECT set_config('pg_trgm.similarity_threshold', '${sim}', true)) AS cfg
      WHERE
          a.id < b.id
        AND a.exam_id = b.exam_id
        AND a.is_active = true
        AND b.is_active = true
        AND length(a.question_text_clean) > 15
        AND length(b.question_text_clean) > 15
        AND a.question_text_clean % b.question_text_clean
        ${examClause}
      ORDER BY sim DESC
      LIMIT 5000
    `);

    const totalCount = await prisma.question.count({
      where: {
        isActive: true,
        questionTextClean: { not: null },
        ...(examId ? { examId: parseInt(examId) } : {}),
      },
    });

    if (!rawPairs.length) {
      return successResponse({
        groups: [],
        totalGroups: 0,
        totalDuplicates: 0,
        scanned: totalCount,
      });
    }

    // Union-Find clustering
    const parent = {};
    const rankMap = {};
    const pairSimMap = {};

    function find(x) {
      if (parent[x] === undefined) {
        parent[x] = x;
        rankMap[x] = 0;
      }
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    }
    function union(x, y) {
      const rx = find(x),
        ry = find(y);
      if (rx === ry) return;
      if ((rankMap[rx] || 0) < (rankMap[ry] || 0)) parent[rx] = ry;
      else if ((rankMap[rx] || 0) > (rankMap[ry] || 0)) parent[ry] = rx;
      else {
        parent[ry] = rx;
        rankMap[rx] = (rankMap[rx] || 0) + 1;
      }
    }

    rawPairs.forEach((row) => {
      const a = Number(row.id_a),
        b = Number(row.id_b);
      union(a, b);
      pairSimMap[`${a}-${b}`] = Number(row.sim);
    });

    const allIds = [
      ...new Set(rawPairs.flatMap((r) => [Number(r.id_a), Number(r.id_b)])),
    ];
    const clusters = {};
    allIds.forEach((id) => {
      const root = find(id);
      if (!clusters[root]) clusters[root] = [];
      clusters[root].push(id);
    });

    // Fetch all question data
    const questions = await prisma.question.findMany({
      where: { id: { in: allIds } },
      select: {
        id: true,
        questionText: true,
        difficulty: true,
        createdAt: true,
        exam: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
      },
    });

    const qMap = {};
    questions.forEach((q) => {
      qMap[q.id] = q;
    });

    const allGroups = Object.values(clusters)
      .filter((ids) => ids.length > 1 && ids.every((id) => qMap[id]))
      .map((ids) => {
        let groupMaxSim = 0;
        ids.forEach((a) => {
          ids.forEach((b) => {
            if (a >= b) return;
            const s = pairSimMap[`${a}-${b}`] || 0;
            if (s > groupMaxSim) groupMaxSim = s;
          });
        });
        const groupQuestions = ids.map((id) => {
          let qMaxSim = 0;
          ids.forEach((otherId) => {
            if (otherId === id) return;
            const key = id < otherId ? `${id}-${otherId}` : `${otherId}-${id}`;
            const s = pairSimMap[key] || 0;
            if (s > qMaxSim) qMaxSim = s;
          });
          return { ...qMap[id], similarity: Math.round(qMaxSim * 100) };
        });
        groupQuestions.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
        groupQuestions[0].similarity = 100;
        return { questions: groupQuestions, maxSim: groupMaxSim };
      })
      .sort((a, b) => b.maxSim - a.maxSim);

    return successResponse({
      groups: allGroups.map((g) => g.questions), // send all groups - client paginates
      totalGroups: allGroups.length,
      totalDuplicates: allGroups.reduce(
        (sum, g) => sum + g.questions.length - 1,
        0,
      ),
      scanned: totalCount,
    });
  } catch (error) {
    console.error("Duplicate scan error:", error);
    if (
      error.message?.includes("similarity") ||
      error.message?.includes("pg_trgm")
    ) {
      return errorResponse(
        "pg_trgm not enabled. Run: CREATE EXTENSION IF NOT EXISTS pg_trgm;",
        503,
      );
    }
    return errorResponse("Scan failed: " + error.message, 500);
  }
}

export async function DELETE(request) {
  try {
    const { ids } = await request.json();
    if (!ids?.length) return errorResponse("No IDs provided");
    const result = await prisma.question.deleteMany({
      where: { id: { in: ids.map(Number) } },
    });
    return successResponse({ deleted: result.count });
  } catch (error) {
    console.error(error);
    return errorResponse("Delete failed", 500);
  }
}
