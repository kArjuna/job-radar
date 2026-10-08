import unittest
from datetime import datetime, timedelta, timezone

from collector import allowed_experience, category_for, is_us_location, normalize_listing, parse_date


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 10, 8, 12, tzinfo=timezone.utc)
        self.company = {
            "name": "Example",
            "segment": "large",
            "careers_url": "https://example.com/jobs",
            "provider": "greenhouse",
        }

    def test_keeps_recent_junior_software_role(self):
        job = normalize_listing(self.company, {
            "title": "Software Engineer, New Grad",
            "updated_at": (self.now - timedelta(hours=12)).isoformat(),
            "absolute_url": "https://example.com/job/1",
            "location": "Seattle, WA",
            "content": "Python and AWS. 0-2 years experience. Visa sponsorship available.",
        }, self.now)
        self.assertIsNotNone(job)
        self.assertEqual(job["category"], "Software Engineer")
        self.assertEqual(job["sponsorship"], "Yes")
        self.assertIn("Python", job["skills"])

    def test_rejects_old_or_experienced_role(self):
        old = (self.now - timedelta(days=3)).isoformat()
        self.assertIsNone(normalize_listing(self.company, {
            "title": "Data Analyst", "updated_at": old, "content": "Entry level"
        }, self.now))
        self.assertIsNone(normalize_listing(self.company, {
            "title": "Senior Data Analyst", "updated_at": self.now.isoformat(), "content": ""
        }, self.now))
        self.assertFalse(allowed_experience("Requires 5+ years of experience"))
        self.assertFalse(allowed_experience("Requires 3 years of experience"))
        self.assertIsNone(normalize_listing(self.company, {
            "title": "Software Engineer", "updated_at": self.now.isoformat(), "content": "Requires 2+ years of experience"
        }, self.now))
        self.assertIsNone(normalize_listing(self.company, {
            "title": "Software Engineer", "updated_at": self.now.isoformat(), "content": ""
        }, self.now))

    def test_classifies_requested_role_families(self):
        self.assertEqual(category_for("Machine Learning Engineer"), "AI / ML Engineer")
        self.assertEqual(category_for("Data Engineer, Platform"), "Data Engineering")
        self.assertIsNone(category_for("Product Manager"))

    def test_parses_timestamp_formats(self):
        self.assertEqual(parse_date("2026-10-08T12:00:00Z"), self.now)
        self.assertIsNone(parse_date("not a date"))

    def test_keeps_us_locations_and_rejects_unknown_or_foreign_locations(self):
        self.assertTrue(is_us_location("Seattle, WA"))
        self.assertTrue(is_us_location("Remote - United States"))
        self.assertTrue(is_us_location("San Francisco, Seattle, New York"))
        self.assertFalse(is_us_location("Toronto, Canada"))
        self.assertFalse(is_us_location("London"))
        self.assertFalse(is_us_location(""))

    def test_normalization_excludes_non_us_jobs(self):
        job = normalize_listing(self.company, {
            "title": "Software Engineer, New Grad",
            "updated_at": self.now.isoformat(),
            "location": "Toronto, Canada",
            "content": "0-2 years experience",
        }, self.now)
        self.assertIsNone(job)


if __name__ == "__main__":
    unittest.main()