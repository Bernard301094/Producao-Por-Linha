const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// The file currently has:
// export default function App() {
//   const [openLineSelect, setOpenLineSelect] = useState(false);

const targetStr = "export default function App() {\n  const [openLineSelect";
const replacementStr = `export default function App() {
  const currentTurnForView = getSuggestedShift(new Date(), format(new Date(), 'HH:mm'));

  function extractLitragem(produto: string): string {
    const upper = (produto || '').toUpperCase();
    if (upper.includes(' IBC')) return 'IBC';
    const match = produto.match(/(\\d+(?:,\\d+)?)\\s*(L|ML|G|KG)\\b/i);
    if (match) {
      const unit = match[2].toUpperCase();
      const num = match[1];
      if (unit === 'L') return num === '1' ? '1 Litro' : \`\${num} Litros\`;
      if (unit === 'ML') return \`\${num}ml\`;
      if (unit === 'G') return \`\${num}g\`;
      if (unit === 'KG') return \`\${num}Kg\`;
    }
    return '';
  }

  const [mobileTab, setMobileTab] = useState<'pendentes' | 'concluidas'>('pendentes');
  const [tourActive, setTourActive] = useState(false);
  const [isNovaSheetOpen, setIsNovaSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const [openLineSelect`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
} else {
  console.error("Target string not found, doing fallback regex");
  content = content.replace(/export default function App\(\) \{\n\s*const \[openLineSelect/g, replacementStr);
}

fs.writeFileSync(appTsxPath, content);
console.log('App states restored.');
