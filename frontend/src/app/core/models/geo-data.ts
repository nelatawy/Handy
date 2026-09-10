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
};

/** Get governorates for a given country code. Falls back to empty array. */
export function getGovernorates(countryCode: string): Governorate[] {
  return GOVERNORATES_BY_COUNTRY[countryCode] ?? [];
}

/** Find a country by its code */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}
