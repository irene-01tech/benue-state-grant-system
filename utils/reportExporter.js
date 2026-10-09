/**
 * Report Exporter
 * -----------------
 * Generic helpers that turn a set of rows + column definitions into
 * a downloadable CSV, Excel (.xlsx), or PDF file, streamed directly
 * to the response. Used by the Super Admin Reports module.
 *
 * columns: [{ key: 'school_name', label: 'School Name', width: 30 }]
 * rows: array of plain objects keyed by column.key
 */

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(res, filename, columns, rows) {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => csvEscape(row[c.key])).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  res.send(`${header}\n${body}\n`);
}

async function toExcel(res, filename, sheetTitle, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Benue Menstrual Grant Portal';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetTitle.substring(0, 31));
  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: c.width || 22 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E7EC' } };
  rows.forEach((row) => sheet.addRow(row));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

function toPDF(res, filename, title, columns, rows) {
  const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).fillColor('#7a1f3d').text(title, { align: 'left' });
  doc.fontSize(9).fillColor('#666').text(`Generated ${new Date().toLocaleString('en-GB')} · Benue Menstrual Grant Portal`);
  doc.moveDown(1);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / columns.length;
  let y = doc.y;

  doc.fontSize(9).fillColor('#fff');
  doc.rect(doc.page.margins.left, y, pageWidth, 20).fill('#7a1f3d');
  doc.fillColor('#fff');
  columns.forEach((c, i) => {
    doc.text(c.label, doc.page.margins.left + i * colWidth + 4, y + 6, { width: colWidth - 8 });
  });
  y += 20;

  doc.fillColor('#222').fontSize(8.5);
  rows.forEach((row, rIdx) => {
    if (y > doc.page.height - doc.page.margins.bottom - 24) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    if (rIdx % 2 === 0) {
      doc.rect(doc.page.margins.left, y, pageWidth, 18).fill('#f7f2f4');
      doc.fillColor('#222');
    }
    columns.forEach((c, i) => {
      const value = row[c.key] === null || row[c.key] === undefined ? '—' : String(row[c.key]);
      doc.text(value, doc.page.margins.left + i * colWidth + 4, y + 4, { width: colWidth - 8, ellipsis: true });
    });
    y += 18;
  });

  doc.end();
}

module.exports = { toCSV, toExcel, toPDF };
