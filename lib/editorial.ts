export type Orientation = "P" | "L";

export interface EditorialItem {
  index: number;
  start: number;
  span: number;
  ratio: "2/3" | "3/2" | "16/10";
}

export interface EditorialRow {
  align: "start" | "end";
  items: EditorialItem[];
}

export interface MobileRow {
  items: { index: number; ratio: "2/3" | "4/5" | "3/2" }[];
}

export function orientationOf(width: number, height: number): Orientation {
  return height > width ? "P" : "L";
}

// Port of the design prototype's deskRows: the row counter k varies pairings so long sets don't repeat a rhythm.
export function desktopRows(shapes: Orientation[]): EditorialRow[] {
  const rows: EditorialRow[] = [];
  const it = (index: number, start: number, span: number, ratio: EditorialItem["ratio"]): EditorialItem => ({ index, start, span, ratio });
  let i = 0;
  let k = 0;
  while (i < shapes.length) {
    const [a, b, c] = [shapes[i], shapes[i + 1], shapes[i + 2]];
    let row: EditorialRow;
    if (a === "P" && b === "P" && c === "P") {
      row = { align: "start", items: [it(i, 1, 4, "2/3"), it(i + 1, 5, 4, "2/3"), it(i + 2, 9, 4, "2/3")] };
      i += 3;
    } else if (a === "P" && b === "P") {
      row = { align: "end", items: k % 2 ? [it(i, 2, 4, "2/3"), it(i + 1, 7, 5, "2/3")] : [it(i, 1, 5, "2/3"), it(i + 1, 8, 4, "2/3")] };
      i += 2;
    } else if (a === "P" && b === "L") {
      row = { align: "end", items: [it(i, 1, 4, "2/3"), it(i + 1, 6, 7, "3/2")] };
      i += 2;
    } else if (a === "L" && b === "P" && k % 2) {
      row = { align: "end", items: [it(i, 1, 7, "3/2"), it(i + 1, 9, 4, "2/3")] };
      i += 2;
    } else if (a === "L" && b === "L" && k % 3 !== 0) {
      row = { align: "start", items: k % 2 ? [it(i, 1, 5, "3/2"), it(i + 1, 6, 7, "3/2")] : [it(i, 1, 7, "3/2"), it(i + 1, 8, 5, "3/2")] };
      i += 2;
    } else if (a === "L") {
      const full = k % 4 === 0;
      row = { align: "start", items: [full ? it(i, 1, 12, "16/10") : it(i, k % 2 ? 4 : 1, 9, "3/2")] };
      i += 1;
    } else {
      row = { align: "start", items: [it(i, 4, 5, "2/3")] };
      i += 1;
    }
    rows.push(row);
    k++;
  }
  return rows;
}

export function mobileRows(shapes: Orientation[]): MobileRow[] {
  const rows: MobileRow[] = [];
  let i = 0;
  while (i < shapes.length) {
    if (shapes[i] === "P" && shapes[i + 1] === "P") {
      rows.push({ items: [{ index: i, ratio: "2/3" }, { index: i + 1, ratio: "2/3" }] });
      i += 2;
    } else {
      rows.push({ items: [{ index: i, ratio: shapes[i] === "P" ? "4/5" : "3/2" }] });
      i += 1;
    }
  }
  return rows;
}
