import json
import re
import sys
from datetime import datetime, timedelta, timezone
from html import unescape
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).parent
SOURCES_PATH = ROOT / "sources.json"
OUTPUT_PATH = ROOT / "data" / "jobs.json"
MAX_AGE = {"large": timedelta(days=2), "medium": timedelta(days=2), "startup": timedelta(days=2)}
TITLE_TERMS = {
    "AI / ML Engineer": ("machine learning", "ml engineer", "ai engineer", "artificial intelligence", "deep learning", "research engineer"),
    "Data Engineering": ("data engineer", "analytics engineer", "data platform"),
    "Data Analyst": ("data analyst", "business intelligence", "analytics analyst"),
    "Data Scientist": ("data scientist", "applied scientist"),
    "Software Developer": ("software developer", "application developer", "web developer"),
    "Software Engineer": ("software engineer", "backend engineer"),
}
SKILLS = (
    "Python", "SQL", "Java", "TypeScript", "JavaScript", "Go", "C++", "AWS", "GCP", "Azure",
    "Spark", "Databricks", "Airflow", "dbt", "Kafka", "Snowflake", "PyTorch", "TensorFlow",
    "scikit-learn", "LLM", "Kubernetes", "Docker", "Tableau", "Power BI", "React", "PostgreSQL",
)
MAX_EXPERIENCE = re.compile(r"\b(?:(?:at least|minimum of|min\.?)\s*(\d+)|(\d+)\s*\+|(\d+))\s*(?:years?|yrs?)\b", re.I)
EXPERIENCE_RANGE = re.compile(r"(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)", re.I)
UPPER_BOUND = re.compile(r"\b(?:up to|at most|no more than|maximum(?: of)?|max\.?)\s*(\d+)\s*(?:years?|yrs?)\b", re.I)
US_STATES = (
    "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY"
).split()
US_STATE_NAMES = (
    "alabama alaska arizona arkansas california colorado connecticut delaware florida georgia hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts michigan minnesota mississippi missouri montana nebraska nevada new hampshire new jersey new mexico new york north carolina north dakota ohio oklahoma oregon pennsylvania rhode island south carolina south dakota tennessee texas utah vermont virginia washington west virginia wisconsin wyoming"
).split(" ")
US_CITIES = {
    "atlanta", "austin", "boston", "boulder", "brooklyn", "charlotte", "chicago", "cincinnati",
    "cleveland", "columbus", "dallas", "denver", "detroit", "houston", "irvine", "los angeles",
    "miami", "minneapolis", "nashville", "new york", "newark", "oakland", "palo alto", "philadelphia",
    "phoenix", "pittsburgh", "portland", "raleigh", "redmond", "san diego", "san francisco",
    "san jose", "santa clara", "seattle", "sunnyvale", "tampa", "washington", "washington dc",
}


def parse_date(value):
    if not value:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000 if value > 10_000_000_000 else value, timezone.utc)
    cleaned = str(value).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        return None
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def clean_html(value):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]*>", " ", value or ""))).strip()


def is_us_location(location):
    if isinstance(location, dict):
        location = location.get("name", "")
    normalized = re.sub(r"\s+", " ", str(location or "")).strip().lower()
    if not normalized:
        return False
    if re.search(r"\b(?:u\.?s\.?a?\.?|united states(?: of america)?)\b", normalized):
        return True
    state_names = "|".join(re.escape(name) for name in US_STATE_NAMES)
    if re.search(rf"\b(?:{state_names})\b", normalized):
        return True
    state_codes = "|".join(US_STATES)
    if re.search(rf"(?:,|\s)\s*(?:{state_codes})\b(?:\s+\d{{5}})?$", normalized.upper()):
        return True
    locations = re.split(r"\s*(?:,|;|\bor\b)\s*", normalized)
    return any(part.strip() in US_CITIES for part in locations)


def allowed_experience(text):
    for match in EXPERIENCE_RANGE.finditer(text):
        if int(match.group(2)) > 2:
            return False
    for match in MAX_EXPERIENCE.finditer(text):
        if int(match.group(1) or match.group(2) or match.group(3)) > 2:
            return False
    return not re.search(r"\b(senior|sr\.?|staff|principal|lead|director|manager|head of)\b", text, re.I)


def experience_label(title, text):
    for match in EXPERIENCE_RANGE.finditer(text):
        if int(match.group(2)) <= 2:
            return f"Up to {match.group(2)} years"
    for match in UPPER_BOUND.finditer(text):
        years = int(match.group(1))
        if years <= 2:
            return f"Up to {years} years"
    if re.search(r"\b(no|zero) (?:prior )?experience (?:required|needed)|experience not required\b", text, re.I):
        return "No experience required"
    if re.search(r"\b(entry[- ]level|new grad|new graduate|early career|junior|graduate|intern|associate)\b", title, re.I):
        return "Entry level (inferred)"
    return None


def category_for(title):
    normalized = title.lower().replace("-", " ")
    return next((category for category, terms in TITLE_TERMS.items() if any(term in normalized for term in terms)), None)


def classify_sponsorship(text):
    lowered = text.lower()
    if re.search(r"(will|offer|provide|sponsor(?:ship)?)\s+(?:to\s+)?(?:sponsor|visa|work authorization)|visa sponsorship available|h-1b sponsorship", lowered):
        return "Yes"
    if re.search(r"(cannot|unable to|not able to|will not)\s+(?:provide|offer|sponsor)|no visa sponsorship|without sponsorship", lowered):
        return "No"
    return "Unspecified"


def fetch_json(url):
    request = Request(url, headers={"User-Agent": "JobRadar/1.0 (+GitHub Actions)"})
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def get_listings(company):
    provider, board = company.get("provider"), company.get("board")
    if provider == "greenhouse":
        payload = fetch_json(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true")
        return payload.get("jobs", [])
    if provider == "lever":
        return fetch_json(f"https://api.lever.co/v0/postings/{board}?mode=json")
    if provider == "ashby":
        payload = fetch_json(f"https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true")
        return payload.get("jobs", [])
    return []


def normalize_listing(company, listing, now):
    title = listing.get("title", "")
    category = category_for(title)
    if not category:
        return None
    description = clean_html(listing.get("content") or listing.get("description") or "")
    details = " ".join((title, description))
    if not allowed_experience(details):
        return None
    experience = experience_label(title, description)
    if not experience:
        return None

    posted = parse_date(
        listing.get("updated_at") or listing.get("publishedAt") or listing.get("createdAt")
        or listing.get("created_at") or listing.get("datePosted")
    )
    if not posted or posted > now or now - posted > MAX_AGE[company["segment"]]:
        return None

    skills = [skill for skill in SKILLS if re.search(rf"(?<![\w+#]){re.escape(skill)}(?![\w+#])", details, re.I)]
    location = listing.get("location") or listing.get("locationName") or ""
    if isinstance(location, dict):
        location = location.get("name", "")
    if not is_us_location(location):
        return None
    return {
        "id": f"{company['name']}:{listing.get('id') or listing.get('jobId') or listing.get('title')}:{listing.get('url') or listing.get('applyUrl')}",
        "title": title,
        "company": company["name"],
        "segment": company["segment"],
        "category": category,
        "location": location,
        "posted_at": posted.isoformat(),
        "url": listing.get("absolute_url") or listing.get("hostedUrl") or listing.get("applyUrl") or listing.get("url") or company["careers_url"],
        "skills": skills,
        "experience": experience,
        "sponsorship": classify_sponsorship(details),
        "description": description[:1000],
        "source_url": company["careers_url"],
        "provider": company.get("provider", "career page"),
    }


def collect(now=None):
    now = now or datetime.now(timezone.utc)
    source_data = json.loads(SOURCES_PATH.read_text())
    jobs, errors = [], []
    for company in source_data["companies"]:
        if not company.get("provider"):
            continue
        try:
            for listing in get_listings(company):
                job = normalize_listing(company, listing, now)
                if job:
                    jobs.append(job)
        except (HTTPError, URLError, TimeoutError, ValueError, KeyError) as error:
            errors.append({"company": company["name"], "error": str(error)[:200]})
    jobs.sort(key=lambda item: item["posted_at"], reverse=True)
    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "updated_at": now.isoformat(),
        "jobs": jobs,
        "source_errors": errors,
    }, indent=2) + "\n")
    print(f"Collected {len(jobs)} matching jobs; {len(errors)} source errors.")
    if errors:
        print("Sources with errors: " + ", ".join(error["company"] for error in errors))


if __name__ == "__main__":
    try:
        collect()
    except Exception as error:
        print(f"Job collection failed: {error}", file=sys.stderr)
        raise