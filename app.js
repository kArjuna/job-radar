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

function buildDashboardPanels(filteredJobs) {
  const roleCounts = categories.map((category) => ({
    name: category,
    count: filteredJobs.filter((job) => job.category === category).length,
  }));

  const skillMap = new Map();
  filteredJobs.forEach((job) => (job.skills || []).forEach((skill) => {
    skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
  }));
  const topSkills = [...skillMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const companyMap = new Map();
  filteredJobs.forEach((job) => {
    companyMap.set(job.company, (companyMap.get(job.company) || 0) + 1);
  });
  const topCompanies = [...companyMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  const roleBreakdown = document.querySelector("#role-breakdown");
  const maxCount = Math.max(1, ...roleCounts.map((item) => item.count));
  roleBreakdown.innerHTML = roleCounts.map((item) => `
    <div class="mini-bar-row">
      <span>${escapeHTML(item.name)}</span>
      <div class="mini-track"><i style="width:${(item.count / maxCount) * 100}%"></i></div>
      <strong>${item.count}</strong>
    </div>
  `).join("");

  document.querySelector("#skill-breakdown").innerHTML = topSkills.map(([skill, count]) => `
    <span class="tag-pill">${escapeHTML(skill)} <em>${count}</em></span>
  `).join("") || '<span class="empty-tag">No skills mapped yet</span>';

  document.querySelector("#company-breakdown").innerHTML = topCompanies.map(([company, count]) => `
    <div class="company-row">
      <span>${escapeHTML(company)}</span>
      <strong>${count}</strong>
    </div>
  `).join("") || '<div class="empty-tag">No companies yet</div>';
}

function updateStats() {
  const today = jobs.filter((job) => Date.now() - new Date(job.posted_at).getTime() <= 86400000).length;
  document.querySelector("#stat-total").textContent = jobs.length;
  document.querySelector("#stat-today").textContent = today;
  document.querySelector("#stat-sources").textContent = companies.filter((company) => company.provider).length;
  document.querySelector("#stat-sponsorship").textContent = jobs.filter((job) => job.sponsorship === "Yes").length;
  document.querySelector("#nav-job-count").textContent = jobs.length;
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
  buildDashboardPanels(filtered);
  jobList.innerHTML = categories.map((role) => {
    const roleJobs = filtered.filter((job) => job.category === role);
    if (!roleJobs.length) return "";
    return `<section class="role-group" aria-label="${escapeHTML(role)}">
      <div class="role-group-heading"><h3>${escapeHTML(role)}</h3><span>${roleJobs.length} ${roleJobs.length === 1 ? "opening" : "openings"}</span></div>
      ${roleJobs.map((job, index) => `
        <article class="job-card" style="animation-delay:${Math.min(index, 8) * 25}ms">
          <div class="job-card-main"><h3 class="job-title">${escapeHTML(job.title)}</h3><div class="company-name">${escapeHTML(job.company)}</div><div class="job-place">${escapeHTML(job.location || "Location not listed")}</div></div>
          <div class="job-card-category"><span class="job-category">${escapeHTML(job.category)}</span></div>
          <div class="job-skills">${(job.skills || []).slice(0, 5).map((skill) => `<span class="skill">${escapeHTML(skill)}</span>`).join("") || '<span class="skill">See description</span>'}</div>
          <div class="job-meta"><span class="posted">${escapeHTML(relativeDate(job.posted_at))}</span><span class="posted">${escapeHTML(job.experience)}</span><span class="sponsor ${job.sponsorship === "No" ? "no" : ""}">${job.sponsorship === "Yes" ? "Visa support noted" : job.sponsorship === "No" ? "No sponsorship" : "Visa: unspecified"}</span></div>
          <a class="job-open" href="${escapeHTML(job.url)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHTML(job.title)} at ${escapeHTML(job.company)}">↗</a>
        </article>`).join("")}
    </section>`;
  }).join("");
}

function renderSources() {
  const query = document.querySelector("#source-search").value.trim().toLowerCase();
  const segment = document.querySelector("#source-segment").value;
  const filtered = companies.filter((company) => (!query || company.name.toLowerCase().includes(query)) && (!segment || company.segment === segment));
  document.querySelector("#source-total").textContent = `${filtered.length} companies`;
  sourceGrid.innerHTML = filtered.map((company) => `<a class="source-card" href="${escapeHTML(company.careers_url)}" target="_blank" rel="noreferrer">
    <div class="source-card-top"><h3>${escapeHTML(company.name)}</h3><span class="source-segment">${company.segment === "startup" ? "STARTUP" : company.segment === "medium" ? "MEDIUM" : "ESTABLISHED"}</span></div>
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

async function refreshJobs() {
  const button = document.querySelector("#refresh-button");
  button.disabled = true;
  button.innerHTML = '<span aria-hidden="true">↻</span> Refreshing…';

  try {
    const response = await fetch(`data/jobs.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load the newest jobs snapshot.");
    const payload = await response.json();
    jobs = payload.jobs || [];
    if (payload.updated_at) {
      document.querySelector("#updated-label").textContent = `Scanned ${relativeDate(payload.updated_at)}`;
    }
    updateStats();
    renderJobs();
  } catch (error) {
    document.querySelector("#updated-label").textContent = "Refresh failed";
    console.error(error);
  } finally {
    button.disabled = false;
    button.innerHTML = '<span aria-hidden="true">↻</span> Refresh jobs';
  }
}

async function start() {
  document.querySelector("#category-filter").insertAdjacentHTML("beforeend", categories.map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join(""));
  document.querySelector("#linkedin-category").insertAdjacentHTML("beforeend", categories.map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join(""));

  const [jobResponse, sourceResponse] = await Promise.allSettled([
    fetch(`data/jobs.json?ts=${Date.now()}`, { cache: "no-store" }),
    fetch("sources.json", { cache: "no-store" }),
  ]);
  if (jobResponse.status === "fulfilled" && jobResponse.value.ok) {
    const payload = await jobResponse.value.json();
    jobs = payload.jobs || [];
    if (payload.updated_at) document.querySelector("#updated-label").textContent = `Scanned ${relativeDate(payload.updated_at)}`;
  } else {
    document.querySelector("#updated-label").textContent = "Job feed not available";
  }
  if (sourceResponse.status === "fulfilled" && sourceResponse.value.ok) companies = (await sourceResponse.value.json()).companies || [];
  updateStats();
  renderJobs();
  renderSources();
  renderLinkedInSearches();
  showView(["#jobs", "#linkedin", "#sources"].includes(location.hash) ? location.hash.slice(1) : "jobs");
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelector("#refresh-button").addEventListener("click", refreshJobs);
document.querySelector("#linkedin-search").addEventListener("click", (event) => {
  event.preventDefault();
  showView("linkedin");
});
document.querySelectorAll("#search-input, #category-filter, #segment-filter, #age-filter, #sponsorship-filter").forEach((control) => control.addEventListener(control.type === "search" ? "input" : "change", renderJobs));
document.querySelectorAll("#source-search, #source-segment").forEach((control) => control.addEventListener(control.type === "search" ? "input" : "change", renderSources));
document.querySelectorAll("#linkedin-category, #linkedin-age, #linkedin-experience").forEach((control) => control.addEventListener("change", renderLinkedInSearches));
start();