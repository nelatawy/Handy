"""Mirrors the frontend's geo-data.ts. Keep these two files in sync manually
until the sync is automated (see BACKEND_PLAN.md §12.3)."""

EGYPT_GOVERNORATES = [
    "Cairo",
    "Alexandria",
    "Giza",
    "Qalyubia",
    "Port Said",
    "Suez",
    "Dakahlia",
    "Sharqia",
    "Gharbia",
    "Monufia",
    "Beheira",
    "Kafr El Sheikh",
    "Damietta",
    "Ismailia",
    "Faiyum",
    "Beni Suef",
    "Minya",
    "Asyut",
    "Sohag",
    "Qena",
    "Aswan",
    "Luxor",
    "Red Sea",
    "New Valley",
    "Matrouh",
    "North Sinai",
    "South Sinai",
]

COUNTRIES = {
    "Egypt": EGYPT_GOVERNORATES,
    "Saudi Arabia": [],
    "United Arab Emirates": [],
}


def is_valid_country(country: str) -> bool:
    return country in COUNTRIES


def is_valid_governorate(country: str, governorate: str) -> bool:
    governorates = COUNTRIES.get(country)
    if not governorates:
        return True  # not modeled yet for this country — don't hard-block
    return governorate in governorates
