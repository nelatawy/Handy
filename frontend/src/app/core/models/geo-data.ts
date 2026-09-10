// ============================================================
//  Handy — Static Country & Governorate Data
// ============================================================

export interface Country {
  code: string;      // ISO 3166-1 alpha-2
  name: string;
  nameAr: string;
  dialCode: string;  // E.164 prefix e.g. "+20"
  flag: string;      // emoji
}

export interface Governorate {
  name: string;
  nameAr: string;
}

export const COUNTRIES: Country[] = [
  { code: 'EG', name: 'Egypt',        nameAr: 'مصر',         dialCode: '+20', flag: '🇪🇬' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية',    dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE',          nameAr: 'الإمارات',    dialCode: '+971', flag: '🇦🇪' },
  { code: 'KW', name: 'Kuwait',       nameAr: 'الكويت',      dialCode: '+965', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar',        nameAr: 'قطر',         dialCode: '+974', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain',      nameAr: 'البحرين',     dialCode: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman',         nameAr: 'عُمان',       dialCode: '+968', flag: '🇴🇲' },
  { code: 'JO', name: 'Jordan',       nameAr: 'الأردن',      dialCode: '+962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon',      nameAr: 'لبنان',       dialCode: '+961', flag: '🇱🇧' },
  { code: 'SD', name: 'Sudan',        nameAr: 'السودان',     dialCode: '+249', flag: '🇸🇩' },
  { code: 'LY', name: 'Libya',        nameAr: 'ليبيا',       dialCode: '+218', flag: '🇱🇾' },
  { code: 'TN', name: 'Tunisia',      nameAr: 'تونس',        dialCode: '+216', flag: '🇹🇳' },
  { code: 'DZ', name: 'Algeria',      nameAr: 'الجزائر',     dialCode: '+213', flag: '🇩🇿' },
  { code: 'MA', name: 'Morocco',      nameAr: 'المغرب',      dialCode: '+212', flag: '🇲🇦' },
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '+44', flag: '🇬🇧' },
];

export const GOVERNORATES_BY_COUNTRY: Record<string, Governorate[]> = {
  EG: [
    { name: 'Cairo',          nameAr: 'القاهرة' },
    { name: 'Giza',           nameAr: 'الجيزة' },
    { name: 'Alexandria',     nameAr: 'الإسكندرية' },
    { name: 'Dakahlia',       nameAr: 'الدقهلية' },
    { name: 'Sharkia',        nameAr: 'الشرقية' },
    { name: 'Qalyubia',       nameAr: 'القليوبية' },
    { name: 'Beheira',        nameAr: 'البحيرة' },
    { name: 'Gharbia',        nameAr: 'الغربية' },
    { name: 'Monufia',        nameAr: 'المنوفية' },
    { name: 'Kafr El Sheikh', nameAr: 'كفر الشيخ' },
    { name: 'Damietta',       nameAr: 'دمياط' },
    { name: 'Port Said',      nameAr: 'بورسعيد' },
    { name: 'Ismailia',       nameAr: 'الإسماعيلية' },
    { name: 'Suez',           nameAr: 'السويس' },
    { name: 'Fayoum',         nameAr: 'الفيوم' },
    { name: 'Beni Suef',      nameAr: 'بني سويف' },
    { name: 'Minya',          nameAr: 'المنيا' },
    { name: 'Asyut',          nameAr: 'أسيوط' },
    { name: 'Sohag',          nameAr: 'سوهاج' },
    { name: 'Qena',           nameAr: 'قنا' },
    { name: 'Luxor',          nameAr: 'الأقصر' },
    { name: 'Aswan',          nameAr: 'أسوان' },
    { name: 'Red Sea',        nameAr: 'البحر الأحمر' },
    { name: 'New Valley',     nameAr: 'الوادي الجديد' },
    { name: 'Matruh',         nameAr: 'مطروح' },
    { name: 'North Sinai',    nameAr: 'شمال سيناء' },
    { name: 'South Sinai',    nameAr: 'جنوب سيناء' },
  ],
  SA: [
    { name: 'Riyadh',     nameAr: 'الرياض' },
    { name: 'Makkah',     nameAr: 'مكة المكرمة' },
    { name: 'Madinah',    nameAr: 'المدينة المنورة' },
    { name: 'Eastern',    nameAr: 'المنطقة الشرقية' },
    { name: "Aseer",      nameAr: 'عسير' },
    { name: 'Tabuk',      nameAr: 'تبوك' },
    { name: 'Jazan',      nameAr: 'جازان' },
    { name: 'Hail',       nameAr: 'حائل' },
    { name: 'Najran',     nameAr: 'نجران' },
    { name: 'Al Jouf',    nameAr: 'الجوف' },
    { name: 'Al Baha',    nameAr: 'الباحة' },
    { name: "Qassim",     nameAr: 'القصيم' },
    { name: 'Northern',   nameAr: 'الحدود الشمالية' },
  ],
  AE: [
    { name: 'Abu Dhabi', nameAr: 'أبوظبي' },
    { name: 'Dubai',     nameAr: 'دبي' },
    { name: 'Sharjah',   nameAr: 'الشارقة' },
    { name: 'Ajman',     nameAr: 'عجمان' },
    { name: 'Ras Al Khaimah', nameAr: 'رأس الخيمة' },
    { name: 'Fujairah',  nameAr: 'الفجيرة' },
    { name: 'Umm Al Quwain', nameAr: 'أم القيوين' },
  ],
  KW: [
    { name: 'Al Asimah', nameAr: 'العاصمة' },
    { name: 'Hawalli', nameAr: 'حولي' },
    { name: 'Farwaniya', nameAr: 'الفروانية' },
    { name: 'Mubarak Al-Kabeer', nameAr: 'مبارك الكبير' },
    { name: 'Ahmadi', nameAr: 'الأحمدي' },
    { name: 'Jahra', nameAr: 'الجهراء' },
  ],
  QA: [
    { name: 'Doha', nameAr: 'الدوحة' },
    { name: 'Al Rayyan', nameAr: 'الريان' },
    { name: 'Al Wakrah', nameAr: 'الوكرة' },
    { name: 'Al Khor', nameAr: 'الخور' },
    { name: 'Umm Salal', nameAr: 'أم صلال' },
    { name: 'Al Daayen', nameAr: 'الضعاين' },
    { name: 'Al Shamal', nameAr: 'الشمال' },
    { name: 'Al Shahaniya', nameAr: 'الشيحانية' },
  ],
  BH: [
    { name: 'Capital', nameAr: 'العاصمة' },
    { name: 'Muharraq', nameAr: 'المحرق' },
    { name: 'Northern', nameAr: 'الشمالية' },
    { name: 'Southern', nameAr: 'الجنوبية' },
  ],
  OM: [
    { name: 'Muscat', nameAr: 'مسقط' },
    { name: 'Dhofar', nameAr: 'ظفار' },
    { name: 'Musandam', nameAr: 'مسندم' },
    { name: 'Al Buraimi', nameAr: 'البريمي' },
    { name: 'Ad Dakhiliyah', nameAr: 'الداخلية' },
    { name: 'Ad Dhahirah', nameAr: 'الظاهرة' },
    { name: 'Al Batinah North', nameAr: 'شمال الباطنة' },
    { name: 'Al Batinah South', nameAr: 'جنوب الباطنة' },
    { name: 'Ash Sharqiyah North', nameAr: 'شمال الشرقية' },
    { name: 'Ash Sharqiyah South', nameAr: 'جنوب الشرقية' },
    { name: 'Al Wusta', nameAr: 'الوسطى' },
  ],
  JO: [
    { name: 'Amman', nameAr: 'عمان' },
    { name: 'Irbid', nameAr: 'إربد' },
    { name: 'Zarqa', nameAr: 'الزرقاء' },
    { name: 'Mafraq', nameAr: 'المفرق' },
    { name: 'Ajloun', nameAr: 'عجلون' },
    { name: 'Jerash', nameAr: 'جرش' },
    { name: 'Madaba', nameAr: 'مادبا' },
    { name: 'Balqa', nameAr: 'البلقاء' },
    { name: 'Karak', nameAr: 'الكرك' },
    { name: 'Tafileh', nameAr: 'الطفيلة' },
    { name: 'Ma\'an', nameAr: 'معان' },
    { name: 'Aqaba', nameAr: 'العقبة' },
  ],
  LB: [
    { name: 'Beirut', nameAr: 'بيروت' },
    { name: 'Mount Lebanon', nameAr: 'جبل لبنان' },
    { name: 'North', nameAr: 'الشمال' },
    { name: 'Akkar', nameAr: 'عكار' },
    { name: 'Beqaa', nameAr: 'البقاع' },
    { name: 'Baalbek-Hermel', nameAr: 'بعلبك - الهرمل' },
    { name: 'South', nameAr: 'الجنوب' },
    { name: 'Nabatieh', nameAr: 'النبطية' },
  ],
  SD: [
    { name: 'Khartoum', nameAr: 'الخرطوم' },
    { name: 'Al Jazirah', nameAr: 'الجزيرة' },
    { name: 'Red Sea', nameAr: 'البحر الأحمر' },
    { name: 'Kassala', nameAr: 'كسلا' },
    { name: 'Gedaref', nameAr: 'القضارف' },
    { name: 'Sennar', nameAr: 'سنار' },
    { name: 'White Nile', nameAr: 'النيل الأبيض' },
    { name: 'Blue Nile', nameAr: 'النيل الأزرق' },
    { name: 'Northern', nameAr: 'الشمالية' },
    { name: 'River Nile', nameAr: 'نهر النيل' },
  ],
  LY: [
    { name: 'Tripoli', nameAr: 'طرابلس' },
    { name: 'Benghazi', nameAr: 'بنغازي' },
    { name: 'Misrata', nameAr: 'مصراتة' },
    { name: 'Zawiya', nameAr: 'الزاوية' },
    { name: 'Sabha', nameAr: 'سبها' },
  ],
  TN: [
    { name: 'Tunis', nameAr: 'تونس' },
    { name: 'Ariana', nameAr: 'أريانة' },
    { name: 'Ben Arous', nameAr: 'بن عروس' },
    { name: 'Manouba', nameAr: 'منوبة' },
    { name: 'Nabeul', nameAr: 'نابل' },
    { name: 'Zaghouan', nameAr: 'زغوان' },
    { name: 'Bizerte', nameAr: 'بنزرت' },
    { name: 'Béja', nameAr: 'باجة' },
    { name: 'Jendouba', nameAr: 'جندوبة' },
    { name: 'Kef', nameAr: 'الكاف' },
    { name: 'Siliana', nameAr: 'سليانة' },
    { name: 'Kairouan', nameAr: 'القيروان' },
    { name: 'Kasserine', nameAr: 'القصرين' },
    { name: 'Sidi Bouzid', nameAr: 'سيدي بوزيد' },
    { name: 'Sousse', nameAr: 'سوسة' },
    { name: 'Monastir', nameAr: 'المنستير' },
    { name: 'Mahdia', nameAr: 'المهدية' },
    { name: 'Sfax', nameAr: 'صفاقس' },
    { name: 'Gafsa', nameAr: 'قفصة' },
    { name: 'Tozeur', nameAr: 'توزر' },
    { name: 'Kebili', nameAr: 'قبلي' },
    { name: 'Gabès', nameAr: 'قابص' },
    { name: 'Medenine', nameAr: 'مدنين' },
    { name: 'Tataouine', nameAr: 'تطاوين' },
  ],
  DZ: [
    { name: 'Algiers', nameAr: 'الجزائر' },
    { name: 'Oran', nameAr: 'وهران' },
    { name: 'Constantine', nameAr: 'قسنطينة' },
    { name: 'Annaba', nameAr: 'عنابة' },
    { name: 'Blida', nameAr: 'البليدة' },
    { name: 'Batna', nameAr: 'باتنة' },
    { name: 'Djelfa', nameAr: 'الجلفة' },
    { name: 'Sétif', nameAr: 'سطيف' },
    { name: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس' },
    { name: 'Biskra', nameAr: 'بسكرة' },
    { name: 'Tébessa', nameAr: 'تبسة' },
  ],
  MA: [
    { name: 'Casablanca-Settat', nameAr: 'الدار البيضاء - سطات' },
    { name: 'Rabat-Salé-Kénitra', nameAr: 'الرباط - سلا - القنيطرة' },
    { name: 'Fès-Meknès', nameAr: 'فاس - مكناس' },
    { name: 'Marrakech-Safi', nameAr: 'مراكش - آسفي' },
    { name: 'Tanger-Tétouan-Al Hoceïma', nameAr: 'طنجة - تطوان - الحسيمة' },
    { name: 'Souss-Massa', nameAr: 'سوس - ماسة' },
  ],
  US: [
    { name: 'California', nameAr: 'كاليفورنيا' },
    { name: 'Texas', nameAr: 'تكساس' },
    { name: 'Florida', nameAr: 'فلوريدا' },
    { name: 'New York', nameAr: 'نيويورك' },
  ],
  GB: [
    { name: 'England', nameAr: 'إنجلترا' },
    { name: 'Scotland', nameAr: 'اسكتلندا' },
    { name: 'Wales', nameAr: 'ويلز' },
    { name: 'Northern Ireland', nameAr: 'أيرلندا الشمالية' },
  ]
};

/** Get governorates for a given country code. Falls back to empty array. */
export function getGovernorates(countryCode: string): Governorate[] {
  return GOVERNORATES_BY_COUNTRY[countryCode] ?? [];
}

/** Find a country by its code */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}
