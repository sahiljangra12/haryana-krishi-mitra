// Haryana districts: approximate centroids, agro-climatic zone and groundwater situation.
// zone NE = north-eastern alluvial plains (canal + tubewell, paddy-wheat belt)
// zone SW = south-western semi-arid (sandy soils, lower rainfall, saline groundwater pockets)
// gw: "stressed" = groundwater over-exploited in much of the district (CGWB assessments), "saline" = brackish groundwater common
export const DISTRICTS = [
  { name: "Ambala", hi: "अंबाला", lat: 30.38, lon: 76.78, zone: "NE", gw: "moderate" },
  { name: "Bhiwani", hi: "भिवानी", lat: 28.79, lon: 76.13, zone: "SW", gw: "saline" },
  { name: "Charkhi Dadri", hi: "चरखी दादरी", lat: 28.59, lon: 76.27, zone: "SW", gw: "stressed" },
  { name: "Faridabad", hi: "फरीदाबाद", lat: 28.41, lon: 77.31, zone: "SW", gw: "stressed" },
  { name: "Fatehabad", hi: "फतेहाबाद", lat: 29.52, lon: 75.45, zone: "SW", gw: "stressed" },
  { name: "Gurugram", hi: "गुरुग्राम", lat: 28.46, lon: 77.03, zone: "SW", gw: "stressed" },
  { name: "Hisar", hi: "हिसार", lat: 29.15, lon: 75.72, zone: "SW", gw: "saline" },
  { name: "Jhajjar", hi: "झज्जर", lat: 28.61, lon: 76.65, zone: "SW", gw: "saline" },
  { name: "Jind", hi: "जींद", lat: 29.32, lon: 76.31, zone: "NE", gw: "saline" },
  { name: "Kaithal", hi: "कैथल", lat: 29.8, lon: 76.4, zone: "NE", gw: "stressed" },
  { name: "Karnal", hi: "करनाल", lat: 29.69, lon: 76.99, zone: "NE", gw: "stressed" },
  { name: "Kurukshetra", hi: "कुरुक्षेत्र", lat: 29.97, lon: 76.85, zone: "NE", gw: "stressed" },
  { name: "Mahendragarh", hi: "महेंद्रगढ़", lat: 28.27, lon: 76.15, zone: "SW", gw: "stressed" },
  { name: "Nuh", hi: "नूंह", lat: 28.1, lon: 77.0, zone: "SW", gw: "saline" },
  { name: "Palwal", hi: "पलवल", lat: 28.14, lon: 77.33, zone: "SW", gw: "saline" },
  { name: "Panchkula", hi: "पंचकूला", lat: 30.69, lon: 76.86, zone: "NE", gw: "moderate" },
  { name: "Panipat", hi: "पानीपत", lat: 29.39, lon: 76.97, zone: "NE", gw: "stressed" },
  { name: "Rewari", hi: "रेवाड़ी", lat: 28.19, lon: 76.62, zone: "SW", gw: "stressed" },
  { name: "Rohtak", hi: "रोहतक", lat: 28.89, lon: 76.61, zone: "SW", gw: "saline" },
  { name: "Sirsa", hi: "सिरसा", lat: 29.53, lon: 75.03, zone: "SW", gw: "stressed" },
  { name: "Sonipat", hi: "सोनीपत", lat: 28.99, lon: 77.02, zone: "NE", gw: "moderate" },
  { name: "Yamunanagar", hi: "यमुनानगर", lat: 30.13, lon: 77.29, zone: "NE", gw: "moderate" },
];

DISTRICTS.forEach((d) => (d.en = d.name));

export function nearestDistrict(lat, lon) {
  let best = null, bd = Infinity;
  for (const d of DISTRICTS) {
    const dd = (d.lat - lat) ** 2 + ((d.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}

// rough Haryana bounding box, used to warn when a field is outside the state
export const HARYANA_BBOX = { minLat: 27.6, maxLat: 31.0, minLon: 74.4, maxLon: 77.6 };
