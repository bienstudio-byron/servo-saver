// Brand name → local logo path mapping
// Logos are stored in /public/logos/
const BRAND_LOGOS: Record<string, string> = {
  // Major brands
  "7-Eleven": "/logos/7-eleven.png",
  "BP": "/logos/bp.png",
  "BP Bowser Bean": "/logos/bp.png",
  "Bowser Bean": "/logos/bp.png",
  "Shell": "/logos/shell.png",
  "Shell Bowser Bean": "/logos/shell.png",
  "Ampol": "/logos/ampol.png",
  "EG Ampol": "/logos/ampol.png",
  "Caltex": "/logos/caltex.png",
  "Caltex Woolworths": "/logos/caltex-woolworths.png",
  "United": "/logos/united.png",
  "Costco": "/logos/costco.png",
  "Mobil": "/logos/mobil.png",
  "Viva Energy": "/logos/viva-energy.png",
  "Coles Express": "/logos/coles-express.png",

  // Mid-size brands
  "Metro Petroleum": "/logos/metro-petroleum.png",
  "Metro Fuel": "/logos/metro-petroleum.png",
  "Puma": "/logos/puma.png",
  "On The Run": "/logos/otr.png",
  "Reddy Express": "/logos/reddy-express.png",
  "Apco Service Stations": "/logos/apco.png",
  "Riordan Fuels": "/logos/riordan.png",
  "Pearl Energy": "/logos/pearl-energy.png",
  "Speedway": "/logos/speedway.png",
  "Budget": "/logos/budget.png",

  // Aliases — map variations to existing logos
  "U-Go": "/logos/united.png",       // United subsidiary
  "Enhance": "/logos/ampol.png",     // Ampol network
  "NRMA": "/logos/ampol.png",        // Ampol network
  "Liberty": "/logos/viva-energy.png", // Viva Energy network
  "Vibe": "/logos/viva-energy.png",  // Viva Energy network
};

export function getBrandLogoUrl(brandName: string): string | null {
  return BRAND_LOGOS[brandName] ?? null;
}

// Generate a consistent color from brand name for fallback initials
export function getBrandColor(brandName: string): string {
  const colors = [
    "#4285f4", // Google blue
    "#ea4335", // Google red
    "#fbbc04", // Google yellow
    "#34a853", // Google green
    "#ff6d01", // warm orange
    "#46bdc6", // warm teal
    "#e8710a", // amber
    "#1a73e8", // deep blue
    "#d93025", // warm red
    "#188038", // forest green
  ];
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) {
    hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getBrandInitial(brandName: string): string {
  return brandName.charAt(0).toUpperCase();
}
