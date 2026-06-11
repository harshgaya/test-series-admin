import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api";

// GET /api/paper-templates - list all papers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Single paper with full data
    if (id) {
      const paper = await prisma.paperTemplate.findUnique({
        where: { id: parseInt(id) },
        include: {
          sections: {
            orderBy: { orderIndex: "asc" },
            include: {
              questions: {
                orderBy: { orderIndex: "asc" },
                include: {
                  question: {
                    include: {
                      options: { orderBy: { orderIndex: "asc" } },
                      subject: { select: { id: true, name: true } },
                      chapter: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!paper) return errorResponse("Paper not found", 404);
      return successResponse(paper);
    }

    // List all papers
    const papers = await prisma.paperTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sections: {
          include: { _count: { select: { questions: true } } },
        },
      },
    });

    return successResponse(papers);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to fetch papers", 500);
  }
}

// POST /api/paper-templates - create paper
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      instituteName,
      examTitle,
      subject,
      duration,
      maxMarks,
      date,
      instructions,
      shuffleQ,
      shuffleOpts,
      twoColumn,
      fontSize,
      sections,
    } = body;

    if (!name || !examTitle)
      return errorResponse("Name and exam title required");

    const paper = await prisma.paperTemplate.create({
      data: {
        name,
        instituteName,
        examTitle,
        subject,
        duration,
        maxMarks: maxMarks ? parseInt(maxMarks) : null,
        date,
        instructions,
        shuffleQ: shuffleQ || false,
        shuffleOpts: shuffleOpts || false,
        twoColumn: twoColumn || false,
        fontSize: fontSize || "medium",
        sections: {
          create: (sections || []).map((sec, si) => ({
            name: sec.name,
            orderIndex: si,
            marksPerQ: sec.marksPerQ || 4,
            negMarks: sec.negMarks || 1.0,
            questions: {
              create: (sec.questionIds || []).map((qid, qi) => ({
                questionId: qid,
                orderIndex: qi,
              })),
            },
          })),
        },
      },
      include: { sections: { include: { questions: true } } },
    });

    return successResponse(paper, 201);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to create paper", 500);
  }
}

// PUT /api/paper-templates - update paper
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      instituteName,
      examTitle,
      subject,
      duration,
      maxMarks,
      date,
      instructions,
      shuffleQ,
      shuffleOpts,
      twoColumn,
      fontSize,
      sections,
    } = body;

    if (!id) return errorResponse("Paper ID required");

    // Delete existing sections (cascade deletes questions)
    await prisma.paperSection.deleteMany({
      where: { templateId: parseInt(id) },
    });

    const paper = await prisma.paperTemplate.update({
      where: { id: parseInt(id) },
      data: {
        name,
        instituteName,
        examTitle,
        subject,
        duration,
        maxMarks: maxMarks ? parseInt(maxMarks) : null,
        date,
        instructions,
        shuffleQ: shuffleQ || false,
        shuffleOpts: shuffleOpts || false,
        twoColumn: twoColumn || false,
        fontSize: fontSize || "medium",
        sections: {
          create: (sections || []).map((sec, si) => ({
            name: sec.name,
            orderIndex: si,
            marksPerQ: sec.marksPerQ || 4,
            negMarks: sec.negMarks || 1.0,
            questions: {
              create: (sec.questionIds || []).map((qid, qi) => ({
                questionId: qid,
                orderIndex: qi,
              })),
            },
          })),
        },
      },
      include: { sections: { include: { questions: true } } },
    });

    return successResponse(paper);
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to update paper", 500);
  }
}

// DELETE /api/paper-templates?id=X
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return errorResponse("ID required");
    await prisma.paperTemplate.delete({ where: { id: parseInt(id) } });
    return successResponse({ deleted: true });
  } catch (error) {
    console.error(error);
    return errorResponse("Failed to delete paper", 500);
  }
}
