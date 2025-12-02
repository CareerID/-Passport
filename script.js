// ============================================
// CAREERID SKILLS PASSPORT - JAVASCRIPT
// Uses Netlify serverless function to talk to Airtable securely
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    // Token now lives ONLY in Netlify environment variables.
    AIRTABLE_PAT: '',
    BASE_ID: 'app7jO2b1qmIFNOU4',
    TABLES: {
        people: 'People',
        skills: 'Skills',
        personSkills: 'Person - Skills',
        experiences: 'Experiences',
        achievements: 'Achievements',
        training: 'Training & Learning'
    },
    PERSON_NAME: 'Stephanie Thompson'
};

// Current view state
let currentView = 'public'; // 'public', 'employer', or 'private'

// Cache for skills lookup (ID -> name)
let skillsLookup = null;

// ============================================
// HELPER: get person name from a record
// Works with both "Person" and "People" fields
// ============================================
function getPersonNameFromFields(fields) {
    const raw = fields.Person ?? fields.People ?? null;
    if (!raw) return null;
    if (Array.isArray(raw) && raw.length > 0) return raw[0];
    if (typeof raw === 'string') return raw;
    return null;
}

// ============================================
// AIRTABLE VIA NETLIFY FUNCTION
// ============================================
async function fetchAirtableData(tableName, filterFormula = '') {
    try {
        const response = await fetch('/.netlify/functions/airtable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableName, filterFormula })
        });

        if (!response.ok) {
            throw new Error(`Netlify function error: ${response.status}`);
        }

        const data = await response.json();
        return data.records || [];
    } catch (error) {
        console.error(`Error fetching from ${tableName}:`, error);
        return [];
    }
}

// ============================================
// DATA LOADERS
// ============================================

// Get main People record for Stephanie
async function getPersonData() {
    const records = await fetchAirtableData(CONFIG.TABLES.people);

    const match = records.find(rec => {
        const f = rec.fields;
        return (
            f['Full Name'] === CONFIG.PERSON_NAME ||
            f.Name === CONFIG.PERSON_NAME
        );
    });

    return match ? match.fields : null;
}

// Get skills with visibility filtering and Skill name lookup
async function getSkills(view = 'public') {
    const personSkills = await fetchAirtableData(CONFIG.TABLES.personSkills);

    // Build Skills lookup once (record ID -> Name)
    if (!skillsLookup) {
        const allSkills = await fetchAirtableData(CONFIG.TABLES.skills);
        skillsLookup = {};
        allSkills.forEach(rec => {
            const f = rec.fields;
            const displayName =
                f['Skill Name'] || // if you add later
                f.Name ||          // current field
                rec.id;
            skillsLookup[rec.id] = displayName;
        });
    }

    const filtered = personSkills
        // Only this person
        .filter(rec => getPersonNameFromFields(rec.fields) === CONFIG.PERSON_NAME)
        // Visibility
        .filter(rec => {
            const vis = rec.fields.Visibility || 'Public';
            if (view === 'private') return true;
            if (view === 'employer') return vis === 'Employer' || vis === 'Public';
            return vis === 'Public';
        })
        // Attach human-readable skill name
        .map(rec => {
            const fields = rec.fields;
            let displayName = 'Unnamed Skill';

            if (Array.isArray(fields.Skill) && fields.Skill.length > 0) {
                const linkedId = fields.Skill[0];
                displayName = skillsLookup[linkedId] || linkedId;
            } else if (typeof fields.Skill === 'string') {
                displayName = fields.Skill;
            }

            return { ...rec, _skillName: displayName };
        });

    return filtered;
}

// Experiences
async function getExperiences(view = 'public') {
    const records = await fetchAirtableData(CONFIG.TABLES.experiences);

    return records
        .filter(rec => getPersonNameFromFields(rec.fields) === CONFIG.PERSON_NAME)
        .filter(rec => {
            const vis = rec.fields.Visibility;
            if (!vis) return true;
            if (view === 'private') return true;
            if (view === 'employer') return vis === 'Employer' || vis === 'Public';
            return vis === 'Public';
        });
}

// Projects / Achievements
async function getProjects(view = 'public') {
    const records = await fetchAirtableData(CONFIG.TABLES.achievements);

    return records
        .filter(rec => getPersonNameFromFields(rec.fields) === CONFIG.PERSON_NAME)
        .filter(rec => {
            const vis = rec.fields.Visibility;
            if (!vis) return true;
            if (view === 'private') return true;
            if (view === 'employer') return vis === 'Employer' || vis === 'Public';
            return vis === 'Public';
        });
}

// Training & Learning
async function getTraining() {
    const records = await fetchAirtableData(CONFIG.TABLES.training);
    return records.filter(rec => getPersonNameFromFields(rec.fields) === CONFIG.PERSON_NAME);
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderAbout(personData) {
    if (!personData) return;

    const publicAbout = document.getElementById('aboutPublic');
    const employerAbout = document.getElementById('aboutEmployer');
    const privateAbout = document.getElementById('aboutPrivate');

    const aboutPublic =
        personData['About (Public)'] ||
        personData['About - Public'] ||
        '';

    const aboutEmployer =
        personData['About - Employer'] ||
        personData['About (Professional)'] ||
        '';

    const aboutPrivate =
        personData['About (Private)'] ||
        personData['About - Private'] ||
        '';

    if (publicAbout) {
        publicAbout.textContent =
            aboutPublic || 'Add your public profile in Airtable → People → About (Public)';
    }

    if (employerAbout) {
        employerAbout.textContent =
            aboutEmployer || 'Add employer content in Airtable → People → About - Employer';
    }

    if (privateAbout) {
        privateAbout.textContent =
            aboutPrivate || 'Add private notes in Airtable → People → About (Private)';
    }
}

function renderSkills(skills) {
    const container = document.getElementById('skillsContainer');
    if (!container) return;

    if (skills.length === 0) {
        container.innerHTML = '<p class="loading">No skills to display for this view.</p>';
        return;
    }

    container.innerHTML = skills.map(record => {
        const fields = record.fields;
        const skillName = record._skillName ||
            (Array.isArray(fields.Skill) ? fields.Skill[0] : fields.Skill || 'Unnamed Skill');
        const proficiency = fields.Proficiency || 'Not specified';
        const status = fields.Status || 'Current';
        const visibility = fields.Visibility || 'Public';

        const proficiencyClass = proficiency.toLowerCase().replace(/\s+/g, '-');
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        const visibilityClass = visibility.toLowerCase();

        return `
            <div class="skill-card" role="listitem">
                <div class="skill-header">
                    <h3 class="skill-name">${skillName}</h3>
                    <span class="visibility-badge ${visibilityClass}">${visibility}</span>
                </div>
                <div class="skill-meta">
                    <span class="level-badge ${proficiencyClass}">${proficiency}</span>
                    <span class="status-badge ${statusClass}">${status}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderExperiences(experiences) {
    const container = document.getElementById('experienceContainer');
    if (!container) return;

    if (experiences.length === 0) {
        container.innerHTML = '<p class="loading">Add experiences in Airtable → Experiences table</p>';
        return;
    }

    container.innerHTML = experiences.map(record => {
        const fields = record.fields;
        const role = fields.Name || 'Role';
        const company = fields.Company || 'Company';

        let dates = '';
        if (fields['Start Date'] || fields['End Date']) {
            const start = fields['Start Date'] || '';
            const end = fields['End Date'] || 'Present';
            dates = `${start} – ${end}`;
        }

        const description = fields.Description || '';

        return `
            <article class="experience-item">
                <div class="experience-header">
                    <h3 class="experience-role">${role}</h3>
                    <p class="experience-company">${company}</p>
                    <p class="experience-dates">${dates}</p>
                </div>
                <div class="experience-description">
                    <p>${description}</p>
                </div>
            </article>
        `;
    }).join('');
}

function renderProjects(projects) {
    const container = document.getElementById('projectsContainer');
    if (!container) return;

    if (projects.length === 0) {
        container.innerHTML = '<p class="loading">Add projects in Airtable → Achievements table</p>';
        return;
    }

    container.innerHTML = projects.map(record => {
        const fields = record.fields;
        const name = fields.Name || 'Project';
        const description = fields.Notes || fields.Status || '';

        return `
            <article class="project-card">
                <h3 class="project-title">${name}</h3>
                <p class="project-description">${description}</p>
            </article>
        `;
    }).join('');
}

function renderTraining(training) {
    const container = document.getElementById('trainingContainer');
    if (!container) return;

    if (training.length === 0) {
        container.innerHTML = '<p class="loading">Add training in Airtable → Training & Learning table</p>';
        return;
    }

    container.innerHTML = training.map(record => {
        const fields = record.fields;
        const name = fields.Name || 'Training';
        const provider = fields.Notes || '';
        const date = fields['Completion date'] || '';

        return `
            <div class="training-item">
                <p class="training-name">${name}</p>
                ${provider ? `<p class="training-provider">${provider}</p>` : ''}
                ${date ? `<p class="training-date">${date}</p>` : ''}
            </div>
        `;
    }).join('');
}

// ============================================
// VIEW SWITCHING
// ============================================
function updateViewVisibility(view) {
    const employerContent = document.querySelectorAll('.employer-content');
    employerContent.forEach(el => {
        el.style.display = (view === 'employer' || view === 'private') ? 'block' : 'none';
    });

    const privateContent = document.querySelectorAll('.private-content');
    privateContent.forEach(el => {
        el.style.display = (view === 'private') ? 'block' : 'none';
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });

    const activeBtn = document.getElementById(`${view}View`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-pressed', 'true');
    }
}

async function loadView(view) {
    currentView = view;
    updateViewVisibility(view);

    try {
        const personData = await getPersonData();
        renderAbout(personData);

        const skills = await getSkills(view);
        renderSkills(skills);

        const experiences = await getExperiences(view);
        renderExperiences(experiences);

        const projects = await getProjects(view);
        renderProjects(projects);

        const training = await getTraining();
        renderTraining(training);
    } catch (error) {
        console.error('Error loading view:', error);
    }
}

function setupViewButtons() {
    document.getElementById('publicView')?.addEventListener('click', () => loadView('public'));

    document.getElementById('employerView')?.addEventListener('click', () => {
        const password = prompt('Enter employer access code:');
        if (password === 'employer123') {
            loadView('employer');
        } else {
            alert('Incorrect access code');
        }
    });

    document.getElementById('privateView')?.addEventListener('click', () => {
        const password = prompt('Enter private access code:');
        if (password === 'private123') {
            loadView('private');
        } else {
            alert('Incorrect access code');
        }
    });
}

// ============================================
// INITIALISATION
// ============================================
async function init() {
    console.log('CareerID Skills Passport initializing...');
    setupViewButtons();
    await loadView('public');
    console.log('CareerID Skills Passport loaded.');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// For testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchAirtableData,
        getPersonData,
        getSkills,
        loadView
    };
}
