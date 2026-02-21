import * as XLSX from 'xlsx';

export interface ParsedStudent {
  number: number;
  name: string;
}

export function parseStudentFile(file: File): Promise<ParsedStudent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

        const students: ParsedStudent[] = rows
          .map((row) => {
            const numberKey = Object.keys(row).find(
              (k) => k.includes('번호') || k.toLowerCase() === 'number' || k === 'no'
            );
            const nameKey = Object.keys(row).find(
              (k) => k.includes('이름') || k.includes('성명') || k.toLowerCase() === 'name'
            );

            if (!numberKey || !nameKey) return null;

            const num = Number(row[numberKey]);
            const name = String(row[nameKey]).trim();
            if (isNaN(num) || !name) return null;

            return { number: num, name };
          })
          .filter((s): s is ParsedStudent => s !== null);

        resolve(students);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
