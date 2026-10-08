# Job Radar

A GitHub Pages job dashboard for recent AI/ML, data, and software roles. It scans public company applicant-tracking boards each day and publishes a fresh static snapshot.

## Deploy

1. Push this repository to GitHub.
2. In **Settings → Pages**, set the build and deployment source to **GitHub Actions** and set the custom domain to `www.job-radar.com`.
3. At your DNS provider, create a `CNAME` record for `www` pointing to `karjuna.github.io`. Enable **Enforce HTTPS** in Pages after DNS is verified.
4. Open **Actions → Refresh jobs and deploy → Run workflow** for the first scan. The scheduled scan then runs daily at 11:17 UTC.
5. Open [www.job-radar.com](https://www.job-radar.com). The **Refresh jobs** button opens the workflow so you can start another scan; GitHub requires you to be signed in and confirm the run.

The workflow scans configured Greenhouse boards and deploys the dashboard plus its current job snapshot. To add or change tracked career pages, edit [`sources.json`](sources.json). Entries with a verified `provider` and `board` are automatically scanned; other entries are direct career-page links. Greenhouse, Lever, and Ashby public board adapters are supported.

The dashboard loads the latest published snapshot when opened, bypassing the browser cache, and groups listings by role family. It defaults to jobs posted within the last 24 hours. The public boards are scanned once daily by GitHub Actions at 11:17 UTC, so new listings appear after that day's scan and deployment; this is not a live per-visit scan.

## Matching rules

- Large-company and startup board postings must be no older than 48 hours; the dashboard can narrow results to the last 24 hours.
- Only postings with a recognized US location are included; unknown or missing locations are excluded.
- Titles are matched to the six requested role families.
- Roles with requirements above two years are excluded. A role must state a low experience requirement or clearly signal entry-level in its title; unspecified experience is not treated as a match.
- Skill tags are extracted from the posting description. Visa sponsorship is shown as yes, no, or unspecified based on wording in that description, and should be confirmed with the employer.

LinkedIn does not provide a public listings API for this use, so the project does not scrape LinkedIn or claim its results are verified. The **LinkedIn** tab creates per-role searches limited to the United States, with selectable posting age and LinkedIn experience level; searches open on LinkedIn. These seniority levels are not exact years-of-experience limits, so confirm each listing's requirements. Search filters and availability may vary by account.

## Run locally

```sh
python collector.py
python -m http.server 8000
```

Open `http://localhost:8000`. The collector uses only Python's standard library. Run its focused tests with `python -m unittest discover -s tests -v`.
