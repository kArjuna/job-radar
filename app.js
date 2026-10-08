const categories = ["AI / ML Engineer", "Data Engineering", "Data Analyst", "Data Scientist", "Software Developer", "Software Engineer"];
const linkedinQueries = {
  "AI / ML Engineer": "machine learning engineer OR AI engineer OR ML engineer",
  "Data Engineering": "data engineer OR analytics engineer",
  "Data Analyst": "data analyst OR business intelligence analyst",
  "Data Scientist": "data scientist OR applied scientist",
  "Software Developer": "software developer OR application developer",
  "Software Engineer": "software engineer OR backend engineer OR frontend engineer",
};
const jobList = document.querySelector("#job-list");
const sourceGrid = document.querySelector("#source-grid");
const linkedinList = document.querySelector("#linkedin-list");
let jobs = [];
let companies = [];

const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function relativeDate(value) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3600000));
  if (hours < 1) return "Just posted";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function renderJobs() {
  const query = document.querySelector("#search-input").value.trim().toLowerCase();
  const category = document.querySelector("#category-filter").value;
  const segment = document.querySelector("#segment-filter").value;
  const age = Number(document.querySelector("#age-filter").value || 0);
  const sponsorshipOnly = document.querySelector("#sponsorship-filter").checked;
  const filtered = jobs.filter((job) => {
    const text = `${job.title} ${job.company} ${job.location} ${(job.skills || []).join(" ")}`.toLowerCase();
    const hoursOld = (Date.now() - new Date(job.posted_at).getTime()) / 3600000;
    return (!query || text.includes(query)) && (!category || job.category === category) && (!segment || job.segment === segment)
      && (!age || hoursOld <= age) && (!sponsorshipOnly || job.sponsorship === "Yes");
  });
  document.querySelector("#result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "role" : "roles"}`;
  document.querySelector("#empty-state").hidden = filtered.length > 0;
  jobList.innerHTML = filtered.map((job, index) => `
    <article class="job-card" style="animation-delay:${Math.min(index, 8) * 25}ms">
      <div class="job-card-main"><h3 class="job-title">${escapeHTML(job.title)}</h3><div class="company-name">${escapeHTML(job.company)}</div><div class="job-place">${escapeHTML(job.location || "Location not listed")}</div></div>
      <div class="job-card-category"><span class="job-category">${escapeHTML(job.category)}</span></div>
      <div class="job-skills">${(job.skills || []).slice(0, 5).map((skill) => `<span class="skill">${escapeHTML(skill)}</span>`).join("") || '<span class="skill">See description</span>'}</div>
      <div class="job-meta"><span class="posted">${escapeHTML(relativeDate(job.posted_at))}</span><span class="posted">${escapeHTML(job.experience)}</span><span class="sponsor ${job.sponsorship === "No" ? "no" : ""}">${job.sponsorship === "Yes" ? "Visa support noted" : job.sponsorship === "No" ? "No sponsorship" : "Visa: unspecified"}</span></div>
      <a class="job-open" href="${escapeHTML(job.url)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHTML(job.title)} at ${escapeHTML(job.company)}">↗</a>
    </article>`).join("");
}

function renderSources() {
  const query = document.querySelector("#source-search").value.trim().toLowerCase();
  const segment = document.querySelector("#source-segment").value;
  const filtered = companies.filter((company) => (!query || company.name.toLowerCase().includes(query)) && (!segment || company.segment === segment));
  document.querySelector("#source-total").textContent = `${filtered.length} companies`;
  sourceGrid.innerHTML = filtered.map((company) => `<a class="source-card" href="${escapeHTML(company.careers_url)}" target="_blank" rel="noreferrer">
    <div class="source-card-top"><h3>${escapeHTML(company.name)}</h3><span class="source-segment">${company.segment === "startup" ? "STARTUP" : "ESTABLISHED"}</span></div>
    <div class="source-card-bottom"><span class="${company.provider ? "source-scan" : "source-manual"}">${company.provider ? "● AUTO-SCAN" : "CAREER PAGE"}</span><span class="source-arrow">↗</span></div>
  </a>`).join("");
}

function linkedinUrl(category) {
  const query = new URLSearchParams({
    keywords: linkedinQueries[category],
    location: "United States",
    geoId: "103644278",
  });
  const age = document.querySelector("#linkedin-age").value;
  const experience = document.querySelector("#linkedin-experience").value;
  if (age) query.set("f_TPR", `r${Number(age) * 3600}`);
  if (experience) query.set("f_E", experience);
  return `https://www.linkedin.com/jobs/search/?${query}`;
}

function renderLinkedInSearches() {
  const selectedCategory = document.querySelector("#linkedin-category").value;
  const matches = categories.filter((category) => !selectedCategory || category === selectedCategory);
  document.querySelector("#linkedin-result-count").textContent = `${matches.length} ${matches.length === 1 ? "search" : "searches"}`;
  linkedinList.innerHTML = matches.map((category) => `<article class="linkedin-result">
    <div class="linkedin-result-info"><span class="job-category">${escapeHTML(category)}</span><h3>${escapeHTML(category)} jobs</h3><p>${escapeHTML(linkedinQueries[category])}</p></div>
    <a class="linkedin-result-link" href="${escapeHTML(linkedinUrl(category))}" target="_blank" rel="noreferrer"><span>in</span> View jobs <span aria-hidden="true">↗</span></a>
  </article>`).join("");
}

function showView(viewName) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  document.querySelector("#breadcrumb-current").textContent = { jobs: "JOBS", linkedin: "LINKEDIN", sources: "CAREER PAGES" }[viewName];
  location.hash = viewName;
}

async function start() {
  document.querySelector("#category-filter").insertAdjacentHTML("beforeend", categories.map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join(""));
  document.querySelector("#linkedin-category").insertAdjacentHTML("beforeend", categories.map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join(""));
  const owner = location.hostname.split(".")[0];
  const repository = location.pathname.split("/").filter(Boolean)[0] || "";
  document.querySelector("#refresh-button").href = `https://github.com/${owner}/${repository}/actions/workflows/deploy.yml`;

  const [jobResponse, sourceResponse] = await Promise.allSettled([fetch("data/jobs.json"), fetch("sources.json")]);
  if (jobResponse.status === "fulfilled" && jobResponse.value.ok) {
    const payload = await jobResponse.value.json();
    jobs = payload.jobs || [];
    if (payload.updated_at) document.querySelector("#updated-label").textContent = `Scanned ${relativeDate(payload.updated_at)}`;
  } else {
    document.querySelector("#updated-label").textContent = "Job feed not available";
  }
  if (sourceResponse.status === "fulfilled" && sourceResponse.value.ok) companies = (await sourceResponse.value.json()).companies || [];
  const today = jobs.filter((job) => Date.now() - new Date(job.posted_at).getTime() <= 86400000).length;
  document.querySelector("#stat-total").textContent = jobs.length;
  document.querySelector("#stat-today").textContent = today;
  document.querySelector("#stat-sources").textContent = companies.filter((company) => company.provider).length;
  document.querySelector("#stat-sponsorship").textContent = jobs.filter((job) => job.sponsorship === "Yes").length;
  document.querySelector("#nav-job-count").textContent = jobs.length;
  renderJobs();
  renderSources();
  renderLinkedInSearches();
  showView(["#jobs", "#linkedin", "#sources"].includes(location.hash) ? location.hash.slice(1) : "jobs");
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelector("#linkedin-search").addEventListener("click", (event) => {
  event.preventDefault();
  showView("linkedin");
});
document.querySelectorAll("#search-input, #category-filter, #segment-filter, #age-filter, #sponsorship-filter").forEach((control) => control.addEventListener(control.type === "search" ? "input" : "change", renderJobs));
document.querySelectorAll("#source-search, #source-segment").forEach((control) => control.addEventListener(control.type === "search" ? "input" : "change", renderSources));
document.querySelectorAll("#linkedin-category, #linkedin-age, #linkedin-experience").forEach((control) => control.addEventListener("change", renderLinkedInSearches));
start();