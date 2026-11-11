// Minimal multi-page text PDF, enough to exercise import and rendering.
export function makePdf(pages) {
  const objs = [];
  const add = (body) => { objs.push(body); return objs.length; };
  const catalog = add('');
  const tree = add('');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const kids = [];
  const words = 'attention transformer encoder decoder embedding gradient layer softmax token sequence'.split(' ');
  for (let p = 1; p <= pages; p++) {
    let text = 'BT /F1 11 Tf 50 780 Td 14 TL\n';
    text += `(Page ${p} of ${pages}) Tj T*\n`;
    for (let l = 0; l < 48; l++) {
      const line = Array.from({ length: 12 }, (_, i) => words[(p * 7 + l * 3 + i) % words.length]).join(' ');
      text += `(${line}) Tj T*\n`;
    }
    text += 'ET';
    const content = add(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 612 792] /Contents ${content} 0 R /Resources << /Font << /F1 ${font} 0 R >> >> >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${tree} 0 R >>`;
  objs[tree - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${pages} >>`;
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
