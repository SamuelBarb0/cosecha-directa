// Utilidades de formato APA 7 para docx-js (Times New Roman 12, doble espacio, márgenes de 1").
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, AlignmentType,
  BorderStyle, WidthType, PageNumber, PageBreak, LevelFormat, TableOfContents, HeadingLevel,
} = require(path.join(process.env.APPDATA, 'npm/node_modules/docx'));

const FUENTE = 'Times New Roman';
const DOBLE = 480;
const ANCHO = 9360;
const SANGRIA = 720;

// Convierte **negrita** e *itálica* en runs.
function runs(texto, base = {}) {
  const partes = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let ultimo = 0;
  let m;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(new TextRun({ text: texto.slice(ultimo, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) partes.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else partes.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(new TextRun({ text: texto.slice(ultimo), ...base }));
  return partes;
}

const p = (texto) =>
  new Paragraph({ children: runs(texto), indent: { firstLine: SANGRIA }, spacing: { line: DOBLE } });

const sinSangria = (texto) => new Paragraph({ children: runs(texto), spacing: { line: DOBLE } });

const palabrasClave = (texto) =>
  new Paragraph({
    indent: { firstLine: SANGRIA },
    spacing: { line: DOBLE },
    children: [new TextRun({ text: 'Palabras clave: ', italics: true }), new TextRun(texto)],
  });

const centrado = (texto, opciones = {}) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: DOBLE }, children: runs(texto, opciones) });

const h1 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(texto)] });
const h2 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(texto)] });
const h3 = (texto) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(texto)] });

const vineta = (texto) =>
  new Paragraph({ numbering: { reference: 'vinetas', level: 0 }, spacing: { line: DOBLE }, children: runs(texto) });

let refNumeros = 0;
function listaNumerada(items) {
  const ref = `numeros${refNumeros++}`;
  NUMERACIONES.push({
    reference: ref,
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
  });
  return items.map(
    (t) => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { line: DOBLE }, children: runs(t) }),
  );
}

const NUMERACIONES = [
  {
    reference: 'vinetas',
    levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
  },
];

const salto = () => new Paragraph({ children: [new PageBreak()] });

// Rótulo APA: número en negrita, título en itálica, ambos a doble espacio y alineados a la izquierda.
function rotulo(tipo, n, titulo) {
  return [
    new Paragraph({ spacing: { line: DOBLE, before: 240 }, keepNext: true, children: [new TextRun({ text: `${tipo} ${n}`, bold: true })] }),
    new Paragraph({ spacing: { line: DOBLE }, keepNext: true, children: [new TextRun({ text: titulo, italics: true })] }),
  ];
}

const nota = (texto) =>
  new Paragraph({
    spacing: { line: DOBLE, after: 240 },
    children: [new TextRun({ text: 'Nota. ', italics: true }), ...runs(texto)],
  });

let nTabla = 0;
let nFigura = 0;

// Tabla APA: solo bordes horizontales (encabezado y cierre), texto a espacio sencillo para que quepa.
function tabla(titulo, encabezados, filas, anchos, textoNota) {
  nTabla++;
  const total = anchos.reduce((a, b) => a + b, 0);
  const escala = ANCHO / total;
  const w = anchos.map((a) => Math.round(a * escala));
  w[w.length - 1] += ANCHO - w.reduce((a, b) => a + b, 0);
  const linea = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
  const nada = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const celda = (texto, i, esEncabezado, esUltima) =>
    new TableCell({
      width: { size: w[i], type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      borders: {
        top: esEncabezado ? linea : nada,
        bottom: esEncabezado || esUltima ? linea : nada,
        left: nada,
        right: nada,
      },
      children: String(texto)
        .split('\n')
        .map((linea) => new Paragraph({ spacing: { line: 240 }, children: runs(linea, { size: 20, bold: esEncabezado || undefined }) })),
    });
  const t = new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      new TableRow({ tableHeader: true, children: encabezados.map((e, i) => celda(e, i, true, false)) }),
      ...filas.map((f, j) => new TableRow({ cantSplit: true, children: f.map((c, i) => celda(c, i, false, j === filas.length - 1)) })),
    ],
  });
  return [...rotulo('Tabla', nTabla, titulo), t, nota(textoNota)];
}

function figura(titulo, archivo, anchoPx, textoNota) {
  nFigura++;
  const datos = fs.readFileSync(archivo);
  const ancho = datos.readUInt32BE(16);
  const alto = datos.readUInt32BE(20);
  return [
    ...rotulo('Figura', nFigura, titulo),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      children: [
        new ImageRun({
          type: 'png',
          data: datos,
          transformation: { width: anchoPx, height: Math.round((anchoPx * alto) / ancho) },
          altText: { title: titulo, description: titulo, name: `figura${nFigura}` },
        }),
      ],
    }),
    nota(textoNota),
  ];
}

// Referencia con sangría francesa.
const referencia = (texto) =>
  new Paragraph({ spacing: { line: DOBLE }, indent: { left: SANGRIA, hanging: SANGRIA }, children: runs(texto) });

function portada({ titulo, autor, materia, docente, fecha }) {
  const vacio = () => new Paragraph({ spacing: { line: DOBLE }, children: [] });
  return [
    vacio(), vacio(), vacio(),
    centrado(titulo, { bold: true }),
    vacio(),
    centrado(autor),
    centrado('Facultad de Ingeniería, Fundación Universitaria Compensar'),
    centrado('Programa de Ingeniería de Software'),
    centrado(`Materia: ${materia}`),
    centrado(`Docente: ${docente}`),
    centrado(fecha),
    salto(),
  ];
}

function indice() {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: DOBLE }, children: [new TextRun({ text: 'Tabla de contenido', bold: true })] }),
    new TableOfContents('Tabla de contenido', { hyperlink: true, headingStyleRange: '1-2' }),
    salto(),
  ];
}

function documento(hijos) {
  const encabezado = new Header({
    children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT] })] })],
  });
  return new Document({
    creator: 'Samuel Felipe Barbosa Ríos',
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FUENTE, size: 24 }, paragraph: { spacing: { line: DOBLE } } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FUENTE, size: 24, bold: true, color: '000000' },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { line: DOBLE, before: 240 }, keepNext: true, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FUENTE, size: 24, bold: true, color: '000000' },
          paragraph: { spacing: { line: DOBLE, before: 120 }, keepNext: true, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FUENTE, size: 24, bold: true, italics: true, color: '000000' },
          paragraph: { spacing: { line: DOBLE }, keepNext: true, outlineLevel: 2 } },
      ],
    },
    numbering: { config: NUMERACIONES },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        headers: { default: encabezado },
        children: hijos,
      },
    ],
  });
}

async function guardar(doc, destino) {
  fs.writeFileSync(destino, await Packer.toBuffer(doc));
  console.log('Escrito', destino);
}

function reiniciarContadores() {
  nTabla = 0;
  nFigura = 0;
}

module.exports = {
  p, sinSangria, palabrasClave, centrado, h1, h2, h3, vineta, listaNumerada, salto, tabla, figura, nota, referencia, portada, indice,
  documento, guardar, reiniciarContadores,
};
