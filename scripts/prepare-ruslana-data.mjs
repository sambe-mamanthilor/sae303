import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [aeroPath, doransTxPath, doransRrPath] = process.argv.slice(2);

if (!aeroPath || !doransTxPath || !doransRrPath) {
  throw new Error("Trois fichiers CSV sont nécessaires.");
}

const outputDirectory = resolve("src/assets/data");
await mkdir(outputDirectory, { recursive: true });

function parseLSH(text) {
  const lines = text.trim().split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.startsWith("YYYYMM;"));
  const headers = lines[headerIndex].split(";");

  return lines.slice(headerIndex + 1).map((line) => {
    const values = line.split(";");
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    const year = Number(row.YYYYMM.slice(0, 4));
    const month = Number(row.YYYYMM.slice(4, 6));

    return {
      year,
      month,
      days: new Date(year, month, 0).getDate(),
      value: Number(row.VALEUR),
      qHom: Number(row.Q_HOM),
    };
  });
}

function groupByYear(data) {
  return Map.groupBy(data, (row) => row.year);
}

function round(value) {
  return Number(value.toFixed(2));
}

function annualTemperature(data) {
  return [...groupByYear(data).entries()]
    .filter(([, rows]) => rows.length === 12)
    .map(([year, rows]) => ({
      year,
      temperature:
        rows.reduce((sum, row) => sum + row.value * row.days, 0) /
        rows.reduce((sum, row) => sum + row.days, 0),
    }))
    .sort((a, b) => a.year - b.year);
}

function annualRainfall(data) {
  return [...groupByYear(data).entries()]
    .filter(([, rows]) => rows.length === 12)
    .map(([year, rows]) => ({
      year,
      rainfall: rows.reduce((sum, row) => sum + row.value, 0),
    }))
    .sort((a, b) => a.year - b.year);
}

const [aeroText, doransTxText, doransRrText] = await Promise.all([
  readFile(aeroPath, "utf8"),
  readFile(doransTxPath, "utf8"),
  readFile(doransRrPath, "utf8"),
]);

const aero = parseLSH(aeroText).filter((row) => row.qHom === 1);
const aeroAnnual = annualTemperature(aero);
const referenceV1 =
  aeroAnnual
    .filter((row) => row.year >= 1961 && row.year <= 1990)
    .reduce((sum, row) => sum + row.temperature, 0) / 30;

const dataV1 = aeroAnnual
  .filter((row) => row.year >= 1961 && row.year <= 2020)
  .map((row) => ({
    annee: row.year,
    periode: row.year <= 1990 ? "1961–1990" : "1991–2020",
    txMoyenne: round(row.temperature),
    ecartReference: round(row.temperature - referenceV1),
    auDessusReference: row.temperature > referenceV1,
  }));

const monthNames = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const monthlyReferences = new Map(
  monthNames.map((_, index) => {
    const month = index + 1;
    const values = aero.filter(
      (row) => row.year >= 1961 && row.year <= 1990 && row.month === month,
    );
    return [month, values.reduce((sum, row) => sum + row.value, 0) / values.length];
  }),
);

const dataV4 = aero.map((row) => {
  const reference = monthlyReferences.get(row.month);
  return {
    annee: row.year,
    mois: row.month,
    nomMois: monthNames[row.month - 1],
    txAnnee: round(row.value),
    txReference: round(reference),
    ecart: round(row.value - reference),
  };
});

const doransTx = parseLSH(doransTxText).filter(
  (row) => row.qHom === 1 && Number.isFinite(row.value),
);
const doransRr = parseLSH(doransRrText).filter(
  (row) => row.qHom === 1 && Number.isFinite(row.value),
);
const doransAnnualTx = annualTemperature(doransTx);
const doransAnnualRr = annualRainfall(doransRr);
const rainfallByYear = new Map(doransAnnualRr.map((row) => [row.year, row.rainfall]));
const commonYears = doransAnnualTx
  .filter((row) => rainfallByYear.has(row.year))
  .map((row) => ({
    year: row.year,
    temperature: row.temperature,
    rainfall: rainfallByYear.get(row.year),
  }));
const referenceYears = commonYears.filter((row) => row.year >= 1961 && row.year <= 1990);
const referenceTx =
  referenceYears.reduce((sum, row) => sum + row.temperature, 0) / referenceYears.length;
const referenceRr =
  referenceYears.reduce((sum, row) => sum + row.rainfall, 0) / referenceYears.length;

const dataV5 = commonYears.map((row, index, values) => {
  const window = index >= 9 ? values.slice(index - 9, index + 1) : null;
  return {
    annee: row.year,
    anomalieTX: round(row.temperature - referenceTx),
    anomalieRR: round(row.rainfall - referenceRr),
    anomalieTX10: window
      ? round(window.reduce((sum, item) => sum + item.temperature - referenceTx, 0) / 10)
      : null,
    anomalieRR10: window
      ? round(window.reduce((sum, item) => sum + item.rainfall - referenceRr, 0) / 10)
      : null,
  };
});

await Promise.all([
  writeFile(resolve(outputDirectory, "v1-temperatures.json"), JSON.stringify(dataV1, null, 2)),
  writeFile(
    resolve(outputDirectory, "v1-metadata.json"),
    JSON.stringify({ referenceTX: round(referenceV1) }, null, 2),
  ),
  writeFile(resolve(outputDirectory, "v4-mois.json"), JSON.stringify(dataV4, null, 2)),
  writeFile(resolve(outputDirectory, "v5-dorans.json"), JSON.stringify(dataV5, null, 2)),
]);

console.log(`V1 : ${dataV1.length} lignes`);
console.log(`V4 : ${dataV4.length} lignes`);
console.log(`V5 : ${dataV5.length} lignes`);
