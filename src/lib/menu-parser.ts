interface ParsedMenuItem {
  type: 'sopa' | 'principio' | 'proteina' | 'especial';
  name: string;
  price?: number;
}

interface ParsedMenu {
  greeting: string;
  items: ParsedMenuItem[];
}

export function parseMenuText(text: string): ParsedMenu {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let greeting = "Buenos días";
  const items: ParsedMenuItem[] = [];
  let currentSection: 'none' | 'sopa' | 'principio' | 'proteina' | 'especial' = 'none';

  for (let line of lines) {
    // Remove asterisks early so section headers are detected correctly
    line = line.replace(/\*/g, '').trim();
    if (!line) continue;
    const upper = line.toUpperCase();

    // Detect greeting (first line usually)
    if (upper.startsWith('BUENOS') || upper.startsWith('BUENAS')) {
      greeting = line;
      continue;
    }

    // Skip "MENU" header
    if (upper === 'MENU' || upper === 'MENÚ') continue;

    // Detect section headers
    if (upper.startsWith('SOPA')) {
      currentSection = 'sopa';
      // The soup name might be on the same line: "SOPA CONCHAS"
      const soupName = line.replace(/^sopa\s*/i, '').trim();
      if (soupName) {
        items.push({ type: 'sopa', name: soupName });
      }
      continue;
    }

    if (upper.startsWith('PRINCIPIO')) {
      currentSection = 'principio';
      const sideName = line.replace(/^principio\s*/i, '').trim();
      if (sideName) {
        // Could be multiple sides separated by " o "
        const sides = sideName.split(/\s+o\s+/i);
        for (const side of sides) {
          if (side.trim()) {
            items.push({ type: 'principio', name: side.trim() });
          }
        }
      }
      continue;
    }

    if (upper.startsWith('PROTEÍNA') || upper.startsWith('PROTEINAS') || upper.startsWith('PROTEÍNAS')) {
      currentSection = 'proteina';
      continue;
    }

    if (upper.startsWith('ESPECIAL')) {
      currentSection = 'especial';
      continue;
    }

    // Parse item lines
    if (currentSection !== 'none') {
      const { name, price } = parseItemLine(line);
      if (name) {
        items.push({ type: currentSection, name, price });
      }
    }
  }

  return { greeting, items };
}

function parseItemLine(line: string): { name: string; price?: number } {
  // Remove leading dots, dashes, bullets
  let cleaned = line.replace(/\*/g, '').replace(/^[\-•]+\s*/, '').trim();
  
  // Extract price: patterns like "$14000", "$14.000", "14000", "$19.000"
  const priceMatch = cleaned.match(/\$?\s*([\d]+[.,]?\d*)\s*$/);
  
  let price: number | undefined;
  let name = cleaned;
  
  if (priceMatch) {
    const priceStr = priceMatch[1].replace(/[.,]/g, '');
    price = parseInt(priceStr);
    if (isNaN(price)) price = undefined;
    // Remove price from name
    name = cleaned.substring(0, priceMatch.index).trim();
  }
  
  // Clean trailing dots and spaces from name
  name = name.replace(/[.\s]+$/, '').trim();
  
  return { name, price };
}
