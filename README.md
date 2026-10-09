# Job Radar

Job Radar is a simple public dashboard for finding recent early-career jobs in the US. It focuses on job roles in AI, data, and software, and it only keeps roles that look junior-friendly and recent.

Think of it as a "job watchlist" that checks public company career pages and job boards, filters out the noise, and shows the best-fit openings in one place.

## What this project does

This app helps you:

- see recent job openings from large companies, startups, and mid-size companies
- filter for US-only jobs
- focus on early-career jobs instead of senior roles
- check whether a job mentions visa sponsorship
- search by role type, company, skill, or hiring timeframe
- open the original employer page or LinkedIn job search directly

It does not rely on a database or a server backend. Instead, it builds a simple static web page that is easy to host for free on GitHub Pages.

## Why this project exists

Finding good early-career jobs is hard because:

- many listings are old or already filled
- some jobs are outside the US
- some roles ask for 5+ years of experience even when they are advertised as "junior"
- company career pages are spread across many different places

Job Radar solves this by collecting public job information and applying a few careful rules before showing it.

## What skills and technologies are used

### 1) Python
Python is used to collect and process job data.

Why it is used:
- easy to fetch public job pages and JSON feeds
- excellent for text filtering and matching job titles
- good for checking dates, job locations, and experience requirements
- simple to run in GitHub Actions automatically

The Python script is responsible for:
- reading the list of tracked companies
- fetching public job listings from supported boards
- checking the job age
- filtering to US locations only
- recognizing job categories such as AI Engineer or Data Analyst
- removing jobs that ask for too much experience
- saving the final cleaned result as a JSON file

### 2) JSON data files
The app stores structured data in JSON files.

Why it is used:
- easy to read by a browser
- lightweight and fast for static hosting
- simple to update and version control

The main data file contains the final list of eligible jobs and the time they were refreshed.

### 3) HTML, CSS, and JavaScript
This is the front-end user experience.

Why they are used:
- they work well for a static website
- no backend server is needed
- GitHub Pages can host them for free
- they allow filters, search, tabs, and dashboard-style cards

The web page:
- shows job cards by role family
- lets users search by skill, company, or keyword
- supports the Jobs, LinkedIn, and Career pages tabs
- shows summary metrics such as total roles or sponsorship counts

### 4) GitHub Pages
This is how the site is published publicly.

Why it is used:
- it is free for public repositories
- it is simple to deploy static sites
- it works well for this kind of dashboard

The site is hosted from GitHub Pages and is refreshed by a GitHub Action.

### 5) GitHub Actions
GitHub Actions handles the scheduled refresh.

Why it is used:
- it can run automatically on a schedule
- it can update the job data without manual work
- it keeps the site fresh without a paid server

The workflow downloads the project, runs the collector script, and publishes the updated site.

## Matching rules in plain English

The app does not show every job it finds. It filters aggressively so the results are more useful.

It keeps jobs only when the following are true:

- the job is recent
- the job looks like a junior or early-career role
- the location is in the US
- the role matches one of the supported job families like AI / ML Engineer, Data Engineer, Data Analyst, Data Scientist, Software Developer, or Software Engineer
- the job does not ask for more than about 2 years of experience
- the job text makes it clear whether visa sponsorship is available or not

This keeps the feed useful and reduces noise from senior roles or international jobs.

## What the project is not

This project is not:

- a large enterprise hiring platform
- a live real-time job feed
- a LinkedIn scraper or a private API integration
- a backend app with a database

It is a lightweight public dashboard built for free hosting and daily refreshes.

## How the project is organized

- `collector.py` — the job collection and filtering script
- `sources.json` — list of large companies, startups, and mid-size companies to track
- `data/jobs.json` — the generated output file with cleaned jobs
- `index.html` — the page layout
- `styles.css` — the styling
- `app.js` — the interactive dashboard logic
- `tests/test_collector.py` — checks for the filtering and matching logic

## Run it locally

Open a terminal in the project folder and run:

```bash
python collector.py
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also run the tests with:

```bash
python -m unittest discover -s tests -v
```

## Public site

The public site is available here:

https://karjuna.github.io/job-radar/

## In one sentence

Job Radar is a free public dashboard that collects recent US-based, early-career tech jobs, filters out low-quality matches, and displays them in a clean, simple view.
