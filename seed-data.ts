import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const PROFILES = {
  'Turno A': 'TurnoA@Vonixx2026',
  'Turno B': 'TurnoB@Vonixx2026',
  'Turno C': 'TurnoC@Vonixx2026',
  'Turno D': 'TurnoD@Vonixx2026',
  'Supervisor': 'Supervisor2026'
};

const LINHAS = Array.from({ length: 16 }, (_, i) => `Linha ${String(i + 1).padStart(2, '0')}`);

let products = [];
try {
  products = JSON.parse(fs.readFileSync("extracted-products.json", "utf-8"));
} catch (e) {
  console.log("No extracted-products.json found, skipping product seed.");
  // fallbacks just in case
  products = [
    ["SPELL 500ML", "500ML"],
    ["ALUMAX 5L", "5L"],
    ["RESTAURAX 240ML", "240ML"]
  ];
}

async function seed() {
  console.log("Seeding profiles...");
  for (const [name, password] of Object.entries(PROFILES)) {
    await setDoc(doc(db, "profiles", name), {
      name,
      password,
      lastChangedAt: new Date().toISOString()
    });
  }

  console.log("Seeding linhas...");
  for (const name of LINHAS) {
    await setDoc(doc(db, "linhas", name), { nome: name });
  }

  console.log("Seeding products...");
  for (const [produto, litragem] of products) {
    if (!produto) continue;
    await setDoc(doc(db, "produtos", produto), {
      produto,
      litragem
    });
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(e => {
  console.error("Error seeding:", e);
  process.exit(1);
});
