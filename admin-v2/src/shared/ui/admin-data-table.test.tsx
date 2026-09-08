import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDataTable } from "./admin-data-table";

const rows = [
  { id: "1", name: "کاربر اول" },
  { id: "2", name: "کاربر دوم" },
];
afterEach(cleanup);

function SelectionHarness() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <AdminDataTable
      rows={rows}
      rowId={(row) => row.id}
      label="کاربران"
      selectedIds={selected}
      onSelectionChange={setSelected}
      columns={[{ id: "name", header: "نام", cell: (row) => row.name }]}
    />
  );
}

describe("AdminDataTable", () => {
  it("selects one row, all visible rows, and clears selection", () => {
    render(<SelectionHarness />);
    fireEvent.click(screen.getByLabelText("انتخاب ردیف 1"));
    expect(screen.getByText("۱ انتخاب‌شده")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("انتخاب همه موارد این صفحه"));
    expect(screen.getByText("۲ انتخاب‌شده")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "لغو انتخاب" }));
    expect(screen.queryByText(/انتخاب‌شده/)).not.toBeInTheDocument();
  });

  it("supports sorting and row activation independently", () => {
    const sort = vi.fn(),
      open = vi.fn();
    render(
      <AdminDataTable
        rows={rows}
        rowId={(row) => row.id}
        label="کاربران"
        sortId="name"
        onSort={sort}
        onRowClick={open}
        columns={[{ id: "name", header: "نام", sortLabel: "نام", cell: (row) => row.name }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "مرتب‌سازی بر اساس نام" }));
    fireEvent.click(screen.getByText("کاربر اول"));
    expect(sort).toHaveBeenCalledWith("name");
    expect(open).toHaveBeenCalledWith(rows[0]);
  });
});
