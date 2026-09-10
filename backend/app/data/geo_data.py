"""Mirrors the frontends geo-data.ts. Keep these two files in sync manually
until the sync is automated (see BACKEND_PLAN.md §12.3)."""

EG_GOVERNORATES = [
    "Cairo",
    "Giza",
    "Alexandria",
    "Dakahlia",
    "Sharkia",
    "Qalyubia",
    "Beheira",
    "Gharbia",
    "Monufia",
    "Kafr El Sheikh",
    "Damietta",
    "Port Said",
    "Ismailia",
    "Suez",
    "Fayoum",
    "Beni Suef",
    "Minya",
    "Asyut",
    "Sohag",
    "Qena",
    "Luxor",
    "Aswan",
    "Red Sea",
    "New Valley",
    "Matruh",
    "North Sinai",
    "South Sinai",
]

SA_GOVERNORATES = [
    "Riyadh",
    "Makkah",
    "Madinah",
    "Eastern",
    "Tabuk",
    "Jazan",
    "Hail",
    "Najran",
    "Al Jouf",
    "Al Baha",
    "Northern",
]

AE_GOVERNORATES = [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Fujairah",
    "Umm Al Quwain",
]

KW_GOVERNORATES = [
    "Al Asimah",
    "Hawalli",
    "Farwaniya",
    "Mubarak Al-Kabeer",
    "Ahmadi",
    "Jahra",
]

QA_GOVERNORATES = [
    "Doha",
    "Al Rayyan",
    "Al Wakrah",
    "Al Khor",
    "Umm Salal",
    "Al Daayen",
    "Al Shamal",
    "Al Shahaniya",
]

BH_GOVERNORATES = [
    "Capital",
    "Muharraq",
    "Northern",
    "Southern",
]

OM_GOVERNORATES = [
    "Muscat",
    "Dhofar",
    "Musandam",
    "Al Buraimi",
    "Ad Dakhiliyah",
    "Ad Dhahirah",
    "Al Batinah North",
    "Al Batinah South",
    "Ash Sharqiyah North",
    "Ash Sharqiyah South",
    "Al Wusta",
]

JO_GOVERNORATES = [
    "Amman",
    "Irbid",
    "Zarqa",
    "Mafraq",
    "Ajloun",
    "Jerash",
    "Madaba",
    "Balqa",
    "Karak",
    "Tafileh",
    "Ma'an",
    "Aqaba",
]

LB_GOVERNORATES = [
    "Beirut",
    "Mount Lebanon",
    "North",
    "Akkar",
    "Beqaa",
    "Baalbek-Hermel",
    "South",
    "Nabatieh",
]

SD_GOVERNORATES = [
    "Khartoum",
    "Al Jazirah",
    "Red Sea",
    "Kassala",
    "Gedaref",
    "Sennar",
    "White Nile",
    "Blue Nile",
    "Northern",
    "River Nile",
]

LY_GOVERNORATES = [
    "Tripoli",
    "Benghazi",
    "Misrata",
    "Zawiya",
    "Sabha",
]

TN_GOVERNORATES = [
    "Tunis",
    "Ariana",
    "Ben Arous",
    "Manouba",
    "Nabeul",
    "Zaghouan",
    "Bizerte",
    "Béja",
    "Jendouba",
    "Kef",
    "Siliana",
    "Kairouan",
    "Kasserine",
    "Sidi Bouzid",
    "Sousse",
    "Monastir",
    "Mahdia",
    "Sfax",
    "Gafsa",
    "Tozeur",
    "Kebili",
    "Gabès",
    "Medenine",
    "Tataouine",
]

DZ_GOVERNORATES = [
    "Algiers",
    "Oran",
    "Constantine",
    "Annaba",
    "Blida",
    "Batna",
    "Djelfa",
    "Sétif",
    "Sidi Bel Abbès",
    "Biskra",
    "Tébessa",
]

MA_GOVERNORATES = [
    "Casablanca-Settat",
    "Rabat-Salé-Kénitra",
    "Fès-Meknès",
    "Marrakech-Safi",
    "Tanger-Tétouan-Al Hoceïma",
    "Souss-Massa",
]

US_GOVERNORATES = [
    "California",
    "Texas",
    "Florida",
    "New York",
]

GB_GOVERNORATES = [
    "England",
    "Scotland",
    "Wales",
    "Northern Ireland",
]

COUNTRIES = {
    "EG": EG_GOVERNORATES,
    "SA": SA_GOVERNORATES,
    "AE": AE_GOVERNORATES,
    "KW": KW_GOVERNORATES,
    "QA": QA_GOVERNORATES,
    "BH": BH_GOVERNORATES,
    "OM": OM_GOVERNORATES,
    "JO": JO_GOVERNORATES,
    "LB": LB_GOVERNORATES,
    "SD": SD_GOVERNORATES,
    "LY": LY_GOVERNORATES,
    "TN": TN_GOVERNORATES,
    "DZ": DZ_GOVERNORATES,
    "MA": MA_GOVERNORATES,
    "US": US_GOVERNORATES,
    "GB": GB_GOVERNORATES,
}


def is_valid_country(country: str) -> bool:
    return country in COUNTRIES


def is_valid_governorate(country: str, governorate: str) -> bool:
    governorates = COUNTRIES.get(country)
    if not governorates:
        return True  # not modeled yet for this country — don't hard-block
    return governorate in governorates
