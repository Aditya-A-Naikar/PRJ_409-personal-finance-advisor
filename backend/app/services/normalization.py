import re

# Canonical display names keyed by lowercase keyword found in description.
# Checked in order — more specific multi-word keys should come first.
KNOWN_MERCHANTS: dict[str, str] = {
    # Food delivery
    "swiggy": "Swiggy",
    "zomato": "Zomato",
    "zepto": "Zepto",
    "domino": "Domino's",
    "mcdonald": "McDonald's",
    "burger king": "Burger King",
    "cafe coffee day": "Cafe Coffee Day",
    # E-commerce
    "amazon": "Amazon",
    "flipkart": "Flipkart",
    "myntra": "Myntra",
    "ajio": "Ajio",
    "snapdeal": "Snapdeal",
    "reliance": "Reliance",
    # Ride-hailing
    "uber": "Uber",
    "ola": "Ola",
    "rapido": "Rapido",
    # Streaming
    "netflix": "Netflix",
    "spotify": "Spotify",
    "hotstar": "Hotstar",
    "disney": "Disney+",
    "youtube premium": "YouTube Premium",
    "amazon prime": "Amazon Prime",
    # Fitness
    "cultfit": "CultFit",
    "gym": "Gym",
    # Telecom
    "jio": "Jio",
    "airtel": "Airtel",
    "bsnl": "BSNL",
    # Banking/Finance
    "hdfc": "HDFC EMI",
    "icici": "ICICI EMI",
    "bajaj": "Bajaj Finance EMI",
    "sbi": "SBI EMI",
    # Healthcare
    "apollo": "Apollo Pharmacy",
    "medplus": "MedPlus",
    "practo": "Practo",
    "1mg": "1mg",
    "fortis": "Fortis Hospital",
    # Education
    "udemy": "Udemy",
    "coursera": "Coursera",
    "byjus": "Byju's",
    "unacademy": "Unacademy",
    # Entertainment
    "bookmyshow": "BookMyShow",
    "pvr": "PVR Cinemas",
    "inox": "INOX",
    # Utilities
    "electricity": "Electricity Board",
    "water board": "Water Board",
    "gas": "Gas",
    "broadband": "Broadband",
    # Fixed labels
    "rent": "Rent",
    "landlord": "Rent",
    "salary": "Salary",
}

_PREFIX_RE = re.compile(
    r"^(UPI[/\-]|POS\s+|NEFT\s+|IMPS\s+|ACH\s+|NACH\s+|AUTO\s+DEBIT\s+|BILLPAY\s+|CREDIT\s+)",
    re.IGNORECASE,
)
_REF_RE = re.compile(r"[/\-]?\d{4,}")
_SEPARATOR_RE = re.compile(r"[\-/]+")


def normalize_merchant(description: str) -> str:
    """
    Converts raw bank/UPI description text to a clean merchant name.

    Examples:
        'UPI/123456/Swiggy'      → 'Swiggy'
        'POS SWIGGY INSTAMART'   → 'Swiggy'
        'AUTO DEBIT EMI HDFC'    → 'HDFC EMI'
        'NEFT SALARY CREDIT XYZ' → 'Salary'
    """
    if not description:
        return "Unknown"

    lower = description.lower()
    # Check longest keywords first (prevents 'gas' matching 'gas connection' wrong etc.)
    for keyword in sorted(KNOWN_MERCHANTS, key=len, reverse=True):
        if keyword in lower:
            return KNOWN_MERCHANTS[keyword]

    # Fallback: strip bank prefixes and reference numbers, title-case remainder
    cleaned = _PREFIX_RE.sub("", description)
    cleaned = _REF_RE.sub("", cleaned)
    cleaned = _SEPARATOR_RE.sub(" ", cleaned).strip()
    return cleaned.title() if cleaned else "Unknown"
