import { describe, expect, it } from "vitest";
import { createTransferWorkbook, examplePayload, readTransferWorkbook } from "./data-transfer-xlsx";

describe("Excel data transfer contract", () => {
  it("round-trips the editable Plan and Exam example workbook", async () => {
    const bytes = await createTransferWorkbook(examplePayload("all"), "all");
    const parsed = await readTransferWorkbook({
      arrayBuffer: async () => bytes.slice(0) as ArrayBuffer,
    });

    expect(parsed.plans).toEqual([
      expect.objectContaining({
        date: "2026-09-20",
        tasks: [expect.objectContaining({ title: "مطالعه فصل اول", duration: 60 })],
      }),
    ]);
    expect(parsed.exams).toEqual([
      expect.objectContaining({
        title: "آزمون نمونه ریاضی",
        questions: [expect.objectContaining({ correctAnswer: "۴", options: ["۱", "۲", "۳", "۴"] })],
      }),
    ]);
  });

  it("rejects workbooks whose required columns were renamed", async () => {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    workbook.addWorksheet("Plans").addRow(["wrong-column"]);
    const bytes = await workbook.xlsx.writeBuffer();

    await expect(
      readTransferWorkbook({ arrayBuffer: async () => bytes.slice(0) as ArrayBuffer }),
    ).rejects.toThrow("MISSING_COLUMNS");
  });
});
