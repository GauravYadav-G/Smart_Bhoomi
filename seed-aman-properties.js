const mongoose = require('mongoose');
const crypto = require('crypto');

async function seedAmanProperties() {
  await mongoose.connect('mongodb://localhost:27017/property_registry');
  const User = require('./models/User');
  const Property = require('./models/Property');

  // Find Aman's account
  const aman = await User.findOne({ name: /aman/i });
  if (!aman) {
    console.log('❌ User "Aman" not found. Checking all users...');
    const users = await User.find({}, 'name email');
    users.forEach(u => console.log(`  • ${u.name} — ${u.email}`));
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✅ Found user: ${aman.name} (${aman.email}) — ID: ${aman._id}`);

  const genHash = () => crypto.randomBytes(32).toString('hex');
  const genPropId = (state, i) => `PROP-${state.slice(0,3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${String(i).padStart(3,'0')}`;

  // Helper to create boundary polygon around center point
  const makeBoundary = (lat, lng, sizeDeg = 0.002) => {
    const h = sizeDeg / 2;
    return [
      { latitude: lat - h, longitude: lng - h },
      { latitude: lat - h, longitude: lng + h },
      { latitude: lat + h, longitude: lng + h },
      { latitude: lat + h, longitude: lng - h },
    ];
  };

  // ═══════════════════════════════════════════════════════
  //  55 PROPERTIES — All over India (real coordinates)
  // ═══════════════════════════════════════════════════════
  const properties = [
    // ── DELHI NCR (5) ──
    { title: 'Luxury Villa in Vasant Vihar', desc: 'Sprawling 5BHK villa with landscaped garden, pool and home theatre in South Delhi\'s premium locality', type: 'residential', area: 5500, unit: 'sqft', street: '12, Vasant Vihar Main Road', city: 'New Delhi', state: 'Delhi', zip: '110057', lat: 28.5596, lng: 77.1537, survey: 'DL/VV/2024/1102', plot: 'B-12', value: 185000000 },
    { title: 'Commercial Office Space in Connaught Place', desc: 'Prime Grade-A office space in the heart of Lutyens Delhi with panoramic city views', type: 'commercial', area: 3200, unit: 'sqft', street: 'N Block, Connaught Place', city: 'New Delhi', state: 'Delhi', zip: '110001', lat: 28.6315, lng: 77.2167, survey: 'DL/CP/2024/0089', plot: 'N-45', value: 250000000 },
    { title: 'DLF Camellias Penthouse Gurgaon', desc: 'Ultra-luxury 4BHK penthouse in DLF Phase-5 with Italian marble, private terrace and concierge services', type: 'residential', area: 8200, unit: 'sqft', street: 'DLF Phase 5, Sector 42', city: 'Gurugram', state: 'Haryana', zip: '122002', lat: 28.4595, lng: 77.0720, survey: 'HR/GGN/2024/5501', plot: 'DLF-P5-42A', value: 320000000 },
    { title: 'Noida Sector 150 Farm House', desc: '2-acre farmhouse with organic garden, guest house and horse stable near Yamuna Expressway', type: 'agricultural', area: 2, unit: 'acre', street: 'Sector 150, Noida', city: 'Noida', state: 'Uttar Pradesh', zip: '201310', lat: 28.4500, lng: 77.5200, survey: 'UP/NDA/2024/7720', plot: 'FH-150-09', value: 95000000 },
    { title: 'Dwarka Commercial Complex', desc: 'Multi-floor commercial complex with retail showrooms and office floors in Dwarka Sector 21', type: 'commercial', area: 12000, unit: 'sqft', street: 'Sector 21, Dwarka', city: 'New Delhi', state: 'Delhi', zip: '110077', lat: 28.5518, lng: 77.0581, survey: 'DL/DW/2024/3301', plot: 'COM-21-07', value: 175000000 },

    // ── MAHARASHTRA (5) ──
    { title: 'Sea-facing Apartment in Worli', desc: 'Premium 3BHK with unobstructed Arabian Sea view in a luxury tower, valet parking and infinity pool', type: 'residential', area: 2400, unit: 'sqft', street: 'Worli Sea Face', city: 'Mumbai', state: 'Maharashtra', zip: '400018', lat: 19.0176, lng: 72.8150, survey: 'MH/MUM/2024/0201', plot: 'WSF-14A', value: 480000000 },
    { title: 'IT Park in Hinjewadi Phase 3', desc: 'Fully furnished plug-and-play IT office space in Pune\'s tech corridor with 24x7 power backup', type: 'commercial', area: 6800, unit: 'sqft', street: 'Hinjewadi Phase 3, Rajiv Gandhi IT Park', city: 'Pune', state: 'Maharashtra', zip: '411057', lat: 18.5912, lng: 73.6900, survey: 'MH/PNE/2024/1155', plot: 'HNJ3-B7', value: 89000000 },
    { title: 'Vineyard Estate in Nashik', desc: '15-acre vineyard estate with French-style chateau, wine cellar and tasting room near Sula Vineyards', type: 'agricultural', area: 15, unit: 'acre', street: 'Gangapur-Savargaon Road', city: 'Nashik', state: 'Maharashtra', zip: '422222', lat: 20.0063, lng: 73.7810, survey: 'MH/NSK/2024/8804', plot: 'VYD-15', value: 120000000 },
    { title: 'Industrial Warehouse in Bhiwandi', desc: 'Grade-A logistics warehouse with loading docks, 32ft ceiling and fire sprinklers near NH3', type: 'industrial', area: 25000, unit: 'sqft', street: 'MIDC Bhiwandi', city: 'Thane', state: 'Maharashtra', zip: '421302', lat: 19.2813, lng: 73.0482, survey: 'MH/THN/2024/4412', plot: 'IND-BHW-22', value: 65000000 },
    { title: 'Bungalow in Koregaon Park', desc: 'Heritage-style 4BHK independent bungalow with private garden in Pune\'s upscale neighbourhood', type: 'residential', area: 4200, unit: 'sqft', street: 'Lane 7, Koregaon Park', city: 'Pune', state: 'Maharashtra', zip: '411001', lat: 18.5362, lng: 73.8936, survey: 'MH/PNE/2024/0033', plot: 'KP-L7-18', value: 140000000 },

    // ── KARNATAKA (5) ──
    { title: 'Tech Park Office in Whitefield', desc: 'Modern co-working grade office in ITPB with shuttle service, gym and cafeteria', type: 'commercial', area: 4500, unit: 'sqft', street: 'ITPB Main Road, Whitefield', city: 'Bengaluru', state: 'Karnataka', zip: '560066', lat: 12.9698, lng: 77.7500, survey: 'KA/BLR/2024/0987', plot: 'ITPB-WF-33', value: 72000000 },
    { title: 'Luxury Apartment in Indiranagar', desc: '3BHK premium apartment in Bengaluru\'s trendiest locality with rooftop pool and club house', type: 'residential', area: 2200, unit: 'sqft', street: '100 Feet Road, Indiranagar', city: 'Bengaluru', state: 'Karnataka', zip: '560038', lat: 12.9784, lng: 77.6408, survey: 'KA/BLR/2024/2240', plot: 'IND-100FT-8B', value: 38000000 },
    { title: 'Coffee Plantation in Coorg', desc: '25-acre Arabica coffee estate with bungalow, processing unit and worker quarters in Kodagu', type: 'agricultural', area: 25, unit: 'acre', street: 'Siddapura-Virajpet Road', city: 'Madikeri', state: 'Karnataka', zip: '571201', lat: 12.4244, lng: 75.7382, survey: 'KA/KDG/2024/7701', plot: 'CFE-25A', value: 85000000 },
    { title: 'Retail Space on MG Road', desc: 'Premium ground-floor retail showroom on MG Road with high foot traffic and metro connectivity', type: 'commercial', area: 1800, unit: 'sqft', street: 'MG Road', city: 'Bengaluru', state: 'Karnataka', zip: '560001', lat: 12.9752, lng: 77.6066, survey: 'KA/BLR/2024/0011', plot: 'MG-GF-12', value: 115000000 },
    { title: 'Villa in Mysore Royal Enclave', desc: '4BHK independent villa with Chamundi Hills view, private garden and temple room', type: 'residential', area: 3600, unit: 'sqft', street: 'Royal Enclave, Srirampura', city: 'Mysuru', state: 'Karnataka', zip: '570008', lat: 12.3051, lng: 76.6551, survey: 'KA/MYS/2024/6601', plot: 'RE-44', value: 42000000 },

    // ── TAMIL NADU (4) ──
    { title: 'ECR Beach House in Chennai', desc: 'Contemporary 3BHK beach house on East Coast Road with private beach access and infinity pool', type: 'residential', area: 3800, unit: 'sqft', street: 'East Coast Road, Injambakkam', city: 'Chennai', state: 'Tamil Nadu', zip: '600115', lat: 12.9165, lng: 80.2540, survey: 'TN/CHN/2024/4455', plot: 'ECR-INJ-07', value: 55000000 },
    { title: 'IT Office in OMR Thoraipakkam', desc: 'LEED-certified office space in IT corridor with 500+ car parking and helipod access', type: 'commercial', area: 8000, unit: 'sqft', street: 'OMR, Thoraipakkam', city: 'Chennai', state: 'Tamil Nadu', zip: '600097', lat: 12.9354, lng: 80.2285, survey: 'TN/CHN/2024/7789', plot: 'OMR-TP-B12', value: 96000000 },
    { title: 'Tea Estate in Ooty', desc: '40-acre premium tea plantation with colonial bungalow and panoramic Nilgiri Hills view', type: 'agricultural', area: 40, unit: 'acre', street: 'Coonoor Road', city: 'Ooty', state: 'Tamil Nadu', zip: '643001', lat: 11.4102, lng: 76.6950, survey: 'TN/NLG/2024/1188', plot: 'TEA-40', value: 150000000 },
    { title: 'Heritage Mansion in Chettinad', desc: 'Restored 150-year-old Chettinad mansion with Burma teak pillars, Athangudi tiles and courtyard', type: 'residential', area: 9500, unit: 'sqft', street: 'Kanadukathan Main Road', city: 'Karaikudi', state: 'Tamil Nadu', zip: '630001', lat: 10.0765, lng: 78.7739, survey: 'TN/SVG/2024/0044', plot: 'CHT-M-03', value: 35000000 },

    // ── RAJASTHAN (4) ──
    { title: 'Haveli in Jaipur Old City', desc: 'Restored heritage haveli with intricate jharokhas, mirror work and rooftop restaurant space', type: 'residential', area: 7000, unit: 'sqft', street: 'Johari Bazaar, Old City', city: 'Jaipur', state: 'Rajasthan', zip: '302003', lat: 26.9196, lng: 75.8235, survey: 'RJ/JPR/2024/0101', plot: 'HVL-JB-05', value: 62000000 },
    { title: 'Desert Resort Land in Jaisalmer', desc: '10-acre plot near Sam Sand Dunes ideal for luxury desert resort development with fort views', type: 'land', area: 10, unit: 'acre', street: 'Sam Road', city: 'Jaisalmer', state: 'Rajasthan', zip: '345001', lat: 26.9157, lng: 70.9083, survey: 'RJ/JSM/2024/5501', plot: 'DST-SAM-10', value: 28000000 },
    { title: 'Lake Palace View Apartment in Udaipur', desc: '3BHK luxury apartment with Lake Pichola and City Palace view, marble flooring throughout', type: 'residential', area: 2800, unit: 'sqft', street: 'Ambamata, Lake Pichola Road', city: 'Udaipur', state: 'Rajasthan', zip: '313001', lat: 24.5760, lng: 73.6800, survey: 'RJ/UDP/2024/3301', plot: 'LP-AMB-12', value: 45000000 },
    { title: 'Industrial Plot in Neemrana', desc: 'RIICO industrial zone plot with water, power and road connectivity on Delhi-Jaipur highway', type: 'industrial', area: 5, unit: 'acre', street: 'RIICO Industrial Area', city: 'Neemrana', state: 'Rajasthan', zip: '301705', lat: 27.9883, lng: 76.3840, survey: 'RJ/ALW/2024/9901', plot: 'RIICO-NMR-45', value: 32000000 },

    // ── KERALA (4) ──
    { title: 'Backwater Villa in Alleppey', desc: 'Luxury 4BHK waterfront villa with private jetty, houseboat dock and coconut grove', type: 'residential', area: 4000, unit: 'sqft', street: 'Punnamada, Vembanad Lake Road', city: 'Alappuzha', state: 'Kerala', zip: '688006', lat: 9.4981, lng: 76.3388, survey: 'KL/ALP/2024/2201', plot: 'BKW-PND-08', value: 38000000 },
    { title: 'Spice Plantation in Munnar', desc: '30-acre cardamom and pepper plantation with colonial estate bungalow at 5000ft elevation', type: 'agricultural', area: 30, unit: 'acre', street: 'Top Station Road', city: 'Munnar', state: 'Kerala', zip: '685612', lat: 10.0889, lng: 77.0595, survey: 'KL/IDK/2024/8801', plot: 'SPC-MNR-30', value: 95000000 },
    { title: 'Tech Hub Office in Technopark', desc: 'Plug-and-play IT office in Asia\'s largest IT park with green building certification', type: 'commercial', area: 5500, unit: 'sqft', street: 'Technopark Phase 3', city: 'Thiruvananthapuram', state: 'Kerala', zip: '695581', lat: 8.5568, lng: 76.8810, survey: 'KL/TVM/2024/4401', plot: 'TP3-B5-F4', value: 48000000 },
    { title: 'Beach Resort in Varkala', desc: 'Cliff-top resort property with 12 cottages, pool, Ayurveda center and panoramic Arabian Sea view', type: 'commercial', area: 2, unit: 'acre', street: 'North Cliff, Varkala Beach', city: 'Varkala', state: 'Kerala', zip: '695141', lat: 8.7333, lng: 76.7166, survey: 'KL/TVM/2024/7701', plot: 'VKL-NC-05', value: 120000000 },

    // ── WEST BENGAL (3) ──
    { title: 'Heritage Flat in Park Street', desc: 'Colonial-era 3BHK apartment with 14ft ceilings and teak floors in Kolkata\'s iconic street', type: 'residential', area: 2600, unit: 'sqft', street: 'Park Street', city: 'Kolkata', state: 'West Bengal', zip: '700016', lat: 22.5511, lng: 88.3505, survey: 'WB/KOL/2024/0077', plot: 'PS-22A', value: 28000000 },
    { title: 'Warehouse in Howrah', desc: 'Modern logistics warehouse near Howrah Station with rail siding and container yard access', type: 'industrial', area: 18000, unit: 'sqft', street: 'GT Road, Howrah', city: 'Howrah', state: 'West Bengal', zip: '711101', lat: 22.5958, lng: 88.2636, survey: 'WB/HWH/2024/3301', plot: 'WH-GT-11', value: 35000000 },
    { title: 'Tea Garden in Darjeeling', desc: '50-acre Darjeeling tea garden producing premium first-flush tea with mountain views', type: 'agricultural', area: 50, unit: 'acre', street: 'Happy Valley Road', city: 'Darjeeling', state: 'West Bengal', zip: '734101', lat: 27.0410, lng: 88.2663, survey: 'WB/DRJ/2024/9901', plot: 'TEA-HV-50', value: 200000000 },

    // ── TELANGANA (3) ──
    { title: 'Penthouse in Banjara Hills', desc: 'Ultra-luxury 5BHK duplex penthouse with private pool, home theatre and 360° city views', type: 'residential', area: 6500, unit: 'sqft', street: 'Road No. 12, Banjara Hills', city: 'Hyderabad', state: 'Telangana', zip: '500034', lat: 17.4156, lng: 78.4347, survey: 'TS/HYD/2024/0056', plot: 'BH-R12-PH', value: 220000000 },
    { title: 'HITEC City Office Tower', desc: 'Full floor office space in HITEC City IT hub with Google, Microsoft and Amazon campuses nearby', type: 'commercial', area: 10000, unit: 'sqft', street: 'HITEC City Main Road', city: 'Hyderabad', state: 'Telangana', zip: '500081', lat: 17.4435, lng: 78.3772, survey: 'TS/HYD/2024/5501', plot: 'HTC-TWR-F9', value: 135000000 },
    { title: 'Farmland in Shamshabad', desc: '20-acre agricultural land near Rajiv Gandhi International Airport, ideal for agri-tech park', type: 'agricultural', area: 20, unit: 'acre', street: 'Shamshabad-Chevella Road', city: 'Shamshabad', state: 'Telangana', zip: '501218', lat: 17.2403, lng: 78.4294, survey: 'TS/RR/2024/7788', plot: 'AG-SHM-20', value: 60000000 },

    // ── GUJARAT (3) ──
    { title: 'Penthouse in SG Highway Ahmedabad', desc: 'Sky villa with 4BHK, private terrace garden and Sabarmati river views on SG Highway', type: 'residential', area: 4800, unit: 'sqft', street: 'SG Highway, Bodakdev', city: 'Ahmedabad', state: 'Gujarat', zip: '380054', lat: 23.0365, lng: 72.5110, survey: 'GJ/AHM/2024/1122', plot: 'SGH-BDK-PH', value: 65000000 },
    { title: 'Diamond Trading Office in Surat', desc: 'Office space in Surat Diamond Bourse — world\'s largest diamond exchange building', type: 'commercial', area: 2200, unit: 'sqft', street: 'Surat Diamond Bourse, Khajod', city: 'Surat', state: 'Gujarat', zip: '394305', lat: 21.1702, lng: 72.7910, survey: 'GJ/SRT/2024/8877', plot: 'SDB-F7-22', value: 55000000 },
    { title: 'GIDC Industrial Land in Vadodara', desc: '3-acre GIDC industrial plot with all clearances for pharma/chemical manufacturing', type: 'industrial', area: 3, unit: 'acre', street: 'GIDC Makarpura', city: 'Vadodara', state: 'Gujarat', zip: '390010', lat: 22.2587, lng: 73.1645, survey: 'GJ/VAD/2024/6601', plot: 'GIDC-MKP-33', value: 28000000 },

    // ── GOA (2) ──
    { title: 'Beach Villa in Anjuna', desc: '3BHK Portuguese-style villa 200m from Anjuna Beach with laterite walls and pool', type: 'residential', area: 3200, unit: 'sqft', street: 'Anjuna-Mapusa Road', city: 'Anjuna', state: 'Goa', zip: '403509', lat: 15.5738, lng: 73.7410, survey: 'GA/BRD/2024/0055', plot: 'ANJ-BV-12', value: 42000000 },
    { title: 'Boutique Hotel in Panjim', desc: 'Heritage boutique hotel with 18 rooms in Fontainhas Latin Quarter, operational with license', type: 'commercial', area: 8500, unit: 'sqft', street: 'Rua de Natal, Fontainhas', city: 'Panaji', state: 'Goa', zip: '403001', lat: 15.4989, lng: 73.8278, survey: 'GA/NGA/2024/3301', plot: 'FNT-BH-18', value: 85000000 },

    // ── PUNJAB & HIMACHAL (3) ──
    { title: 'Farmland in Ludhiana', desc: '50-acre fertile agricultural land with tubewell irrigation near GT Road, ideal for agri business', type: 'agricultural', area: 50, unit: 'acre', street: 'GT Road, Khanna', city: 'Ludhiana', state: 'Punjab', zip: '141401', lat: 30.6942, lng: 76.2166, survey: 'PB/LDH/2024/7701', plot: 'AG-KHN-50', value: 75000000 },
    { title: 'Mall Road Showroom in Shimla', desc: 'Prime retail showroom on Mall Road with British-era architecture and high tourist footfall', type: 'commercial', area: 1200, unit: 'sqft', street: 'Mall Road', city: 'Shimla', state: 'Himachal Pradesh', zip: '171001', lat: 31.1048, lng: 77.1734, survey: 'HP/SML/2024/0019', plot: 'MR-SHM-07', value: 32000000 },
    { title: 'Apple Orchard in Manali', desc: '8-acre apple orchard with timber cottage, cold storage and Beas river frontage', type: 'agricultural', area: 8, unit: 'acre', street: 'Naggar Road', city: 'Manali', state: 'Himachal Pradesh', zip: '175131', lat: 32.2432, lng: 77.1892, survey: 'HP/KUL/2024/5501', plot: 'APL-NGR-08', value: 45000000 },

    // ── NORTHEAST (3) ──
    { title: 'Lakeview Apartment in Guwahati', desc: '3BHK premium apartment with Deepor Beel lake view in Assam\'s largest city', type: 'residential', area: 1800, unit: 'sqft', street: 'GS Road, Paltan Bazaar', city: 'Guwahati', state: 'Assam', zip: '781008', lat: 26.1445, lng: 91.7362, survey: 'AS/GHY/2024/3301', plot: 'GS-PB-14', value: 18000000 },
    { title: 'Bamboo Plantation in Imphal', desc: '15-acre organic bamboo plantation with processing unit in Manipur\'s green belt', type: 'agricultural', area: 15, unit: 'acre', street: 'Imphal-Moreh Highway', city: 'Imphal', state: 'Manipur', zip: '795001', lat: 24.8170, lng: 93.9368, survey: 'MN/IMP/2024/8801', plot: 'BMB-IMH-15', value: 12000000 },
    { title: 'Hill Resort in Shillong', desc: 'Boutique resort with 10 cottages, restaurant and pine forest setting in Scotland of the East', type: 'commercial', area: 3, unit: 'acre', street: 'Upper Shillong Road', city: 'Shillong', state: 'Meghalaya', zip: '793003', lat: 25.5788, lng: 91.8933, survey: 'ML/SHL/2024/2201', plot: 'RST-USR-10', value: 35000000 },

    // ── MADHYA PRADESH & CHHATTISGARH (3) ──
    { title: 'Lakefront Villa in Bhopal', desc: '4BHK villa on Upper Lake with private garden, boat house and panoramic Bhopal views', type: 'residential', area: 4500, unit: 'sqft', street: 'Shamla Hills, Upper Lake Road', city: 'Bhopal', state: 'Madhya Pradesh', zip: '462013', lat: 23.2372, lng: 77.4086, survey: 'MP/BPL/2024/1122', plot: 'SH-UL-09', value: 38000000 },
    { title: 'IT SEZ Plot in Indore', desc: '2-acre IT/ITES SEZ plot in Super Corridor with all approvals for tech campus development', type: 'land', area: 2, unit: 'acre', street: 'Super Corridor, Indore', city: 'Indore', state: 'Madhya Pradesh', zip: '452010', lat: 22.7196, lng: 75.8577, survey: 'MP/IDR/2024/4455', plot: 'SEZ-SC-22', value: 42000000 },
    { title: 'Steel Plant Land in Raipur', desc: '10-acre industrial land near Naya Raipur with rail connectivity for steel manufacturing', type: 'industrial', area: 10, unit: 'acre', street: 'Urla Industrial Area', city: 'Raipur', state: 'Chhattisgarh', zip: '493221', lat: 21.2514, lng: 81.6296, survey: 'CG/RPR/2024/6601', plot: 'IND-URL-10', value: 25000000 },

    // ── ODISHA & JHARKHAND (2) ──
    { title: 'Beachfront Resort Land in Puri', desc: '5-acre prime beachfront land near Jagannath Temple, ideal for heritage resort development', type: 'land', area: 5, unit: 'acre', street: 'Marine Drive, Puri Beach', city: 'Puri', state: 'Odisha', zip: '752001', lat: 19.7983, lng: 85.8245, survey: 'OD/PRI/2024/0088', plot: 'BF-MD-05', value: 65000000 },
    { title: 'Mining Land in Jamshedpur', desc: '25-acre mineral-rich land near TATA Steel plant with iron ore deposits and road connectivity', type: 'industrial', area: 25, unit: 'acre', street: 'Adityapur Industrial Area', city: 'Jamshedpur', state: 'Jharkhand', zip: '831013', lat: 22.7840, lng: 86.1853, survey: 'JH/JSR/2024/9901', plot: 'MIN-ADP-25', value: 55000000 },

    // ── UTTARAKHAND & J&K (3) ──
    { title: 'Riverside Retreat in Rishikesh', desc: 'Boutique wellness resort on Ganga riverbank with yoga shala, 8 luxury tents and organic kitchen', type: 'commercial', area: 2, unit: 'acre', street: 'Laxman Jhula Road', city: 'Rishikesh', state: 'Uttarakhand', zip: '249302', lat: 30.1210, lng: 78.3287, survey: 'UK/DHN/2024/3301', plot: 'RVR-LJ-08', value: 48000000 },
    { title: 'Houseboat in Dal Lake', desc: 'Heritage cedarwood houseboat with 4 bedrooms, hand-carved walnut interiors on Dal Lake', type: 'residential', area: 2400, unit: 'sqft', street: 'Boulevard Road, Dal Lake', city: 'Srinagar', state: 'Jammu & Kashmir', zip: '190001', lat: 34.0837, lng: 74.8570, survey: 'JK/SGR/2024/0044', plot: 'HB-DAL-22', value: 25000000 },
    { title: 'Ski Resort Land in Gulmarg', desc: '8-acre prime development land near Gulmarg Gondola station, ideal for luxury ski chalet resort', type: 'land', area: 8, unit: 'acre', street: 'Gulmarg Main Road', city: 'Gulmarg', state: 'Jammu & Kashmir', zip: '193403', lat: 34.0484, lng: 74.3805, survey: 'JK/BRM/2024/7701', plot: 'SKI-GMG-08', value: 75000000 },

    // ── ANDHRA PRADESH (2) ──
    { title: 'Amaravati Capital Plot', desc: 'Premium residential plot in Andhra Pradesh new capital city master plan area with all approvals', type: 'land', area: 1200, unit: 'sqm', street: 'Seed Access Road, Amaravati', city: 'Amaravati', state: 'Andhra Pradesh', zip: '522237', lat: 16.5062, lng: 80.5152, survey: 'AP/GNT/2024/1101', plot: 'AMR-SAR-44', value: 22000000 },
    { title: 'Shrimp Farm in Nellore', desc: '20-acre sustainable aquaculture farm with modern hatchery and processing unit on coast', type: 'agricultural', area: 20, unit: 'acre', street: 'Mypadu Beach Road', city: 'Nellore', state: 'Andhra Pradesh', zip: '524003', lat: 14.4426, lng: 79.9865, survey: 'AP/NLR/2024/5501', plot: 'AQA-MYP-20', value: 35000000 },

    // ── BIHAR & UP (2) ──
    { title: 'Commercial Complex in Patna', desc: 'Multi-story commercial complex on Bailey Road with retail, offices and rooftop food court', type: 'commercial', area: 15000, unit: 'sqft', street: 'Bailey Road', city: 'Patna', state: 'Bihar', zip: '800001', lat: 25.6093, lng: 85.1376, survey: 'BR/PAT/2024/0099', plot: 'COM-BR-15', value: 42000000 },
    { title: 'Heritage Kothi in Lucknow', desc: 'Nawabi-era kothi with Mughal gardens, durbar hall and 12 rooms in Hazratganj area', type: 'residential', area: 8000, unit: 'sqft', street: 'Hazratganj', city: 'Lucknow', state: 'Uttar Pradesh', zip: '226001', lat: 26.8467, lng: 80.9462, survey: 'UP/LKO/2024/0022', plot: 'HG-KTH-07', value: 55000000 },

    // ── CHANDIGARH (1) ──
    { title: 'Sector 17 Showroom in Chandigarh', desc: 'Prime SCO (Shop-cum-Office) in Sector 17 commercial hub designed by Le Corbusier', type: 'commercial', area: 2000, unit: 'sqft', street: 'Sector 17-C', city: 'Chandigarh', state: 'Chandigarh', zip: '160017', lat: 30.7415, lng: 76.7797, survey: 'CH/CHD/2024/0011', plot: 'SCO-17C-45', value: 48000000 },
  ];

  console.log(`\n📦 Preparing ${properties.length} properties for ${aman.name}...\n`);

  let created = 0;
  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    const propId = genPropId(p.state, i + 1);

    try {
      await Property.create({
        propertyId: propId,
        blockchainHash: genHash(),
        blockchainTransactionId: `TX-${genHash().slice(0, 24)}`,
        owner: aman._id,
        propertyDetails: {
          title: p.title,
          description: p.desc,
          propertyType: p.type,
          area: { value: p.area, unit: p.unit },
          address: {
            street: p.street,
            city: p.city,
            state: p.state,
            zipCode: p.zip,
            country: 'India'
          },
          coordinates: { latitude: p.lat, longitude: p.lng },
          boundary: makeBoundary(p.lat, p.lng, p.type === 'agricultural' ? 0.01 : p.type === 'industrial' ? 0.005 : 0.002),
          surveyNumber: p.survey,
          plotNumber: p.plot
        },
        verification: {
          status: 'verified',
          verifiedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          method: ['auto', 'document_hash', 'kyc_cross_reference'][Math.floor(Math.random() * 3)],
          notes: ['Property verified via blockchain hash', 'All documents valid'],
          checks: {
            documentHashValid: true,
            ownerKycVerified: true,
            duplicateCheck: true,
            surveyNumberValid: true,
            geoFenceValid: true
          },
          checkScore: 85 + Math.floor(Math.random() * 16),
          auditHash: genHash()
        },
        valuation: {
          currentValue: p.value,
          currency: 'INR',
          lastUpdated: new Date()
        },
        status: 'active',
        isPublic: true
      });
      created++;
      const stateTag = p.state.slice(0, 3).toUpperCase();
      console.log(`  ✅ [${String(created).padStart(2)}] ${stateTag} | ${p.city.padEnd(18)} | ${p.title}`);
    } catch (err) {
      if (err.code === 11000) {
        console.log(`  ⚠️  Skipped (duplicate): ${p.title}`);
      } else {
        console.log(`  ❌ Error: ${p.title} — ${err.message}`);
      }
    }
  }

  console.log(`\n🎉 Done! Created ${created}/${properties.length} properties for ${aman.name}`);
  console.log(`   Total properties for ${aman.name}: ${await Property.countDocuments({ owner: aman._id })}`);

  await mongoose.disconnect();
}

seedAmanProperties().catch(err => { console.error(err); process.exit(1); });
