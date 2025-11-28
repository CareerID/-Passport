// ============================================
// CAREERID SKILLS PASSPORT - JAVASCRIPT
// Connects to Airtable, handles three views
// NOTE: Airtable Personal Access Token has been removed
//       Never commit real tokens into this file.
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    // ⚠️ IMPORTANT:
    // Do NOT put your real Airtable PAT here.
    // Later we’ll load data via a secure Netlify Function.
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

// ============================================
// AIRTABLE API FUNCTIONS
// ============================================

/**
 * Fetch data from Airtable
 * NOTE: This currently calls Airtable directly.
 * Once we add a Netlify Function, this will instead call
 * /.netlify/functions/airtable and won’t need CONFIG.AIRTABLE_PAT.
 */
async function fetchAirtableData(tableName, filterFormula = '') {
    const url = `https://api.airtable.com/v0/${CONFIG.BASE_ID}/${encodeURIComponent(tableName)}`;
    const params = new URLSearchParams();
    
    if (filterFormula) {
        params.append('filterByFormula', filterFormula);
    }
    
    try {
        const response = await fetch(`${url}?${params}`, {
            headers: {
                // This will be updated later to call a secure backend.
                // For now, the PAT is blank for safety.
                'Authorization': `Bearer ${CONFIG.AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.records;
    } catch (error) {
        console.error(`Error fetching from ${tableName}:`, error);
        return [];
    }
}

/**
 * Get person data
 */
async function getPersonData() {
    const filter = `{Full Name} = "${CONFIG.PERSON_NAME}"`;
    const records = await fetchAirtableData(CONFIG.TABLES.people, filter);
    return records.length > 0 ? records[0].fields : null;
}

/**
 * Get skills with visibility filtering
 */
async function getSkills(view = 'public') {
    // First get all person-skills records
    const filter = `{Person} = "${CONFIG.PERSON_NAME}"`;
    const personSkills = await fetchAirtableData(CONFIG.TABLES.personSkills, filter);
    
    // Filter by visibility based on view
    const filteredSkills = personSkills.filter(record => {
        const visibility = record.fields.Visibility;
        
        if (view === 'private') {
            return true; // Show all
        } else if (view === 'employer') {
            return visibility === 'Employer' || visibility === 'Public';
        } else { // public
            return visibility === 'Public';
        }
    });
    
    return filteredSkills;
}

/**
 * Get experiences with visibility filtering
 */
async function getExperiences(view = 'public') {
    const filter = `{Person} = "${CONFIG.PERSON_NAME}"`;
    const experiences = await fetchAirtableData(CONFIG.TABLES.experiences, filter);
    
    // Filter by visibility if the field exists
    return experiences.filter(record => {
        const visibility = record.fields.Visibility;
        if (!visibility) return true; // If no visibility field, show all
        
        if (view === 'private') {
            return true;
        } else if (view === 'employer') {
            return visibility === 'Employer' || visibility === 'Public';
        } else {
            return visibility === 'Public';
        }
    });
}

/**
 * Get projects/achievements with visibility filtering
 */
async function getProjects(view = 'public') {
    const filter = `{Person} = "${CONFIG.PERSON_NAME}"`;
    const projects = await fetchAirtableData(CONFIG.TABLES.achievements, filter);
    
    return projects.filter(record => {
        const visibility = record.fields.Visibility;
        if (!visibility) return true;
        
        if (view === 'private') {
            return true;
        } else if (view === 'employer') {
            return visibility === 'Employer' || visibility === 'Public';
        } else {
            return visibility === 'Public';
        }
    });
}

/**
 * Get training history
 */
async function getTraining() {
    const filter = `{Person} = "${CONFIG.PERSON_NAME}"`;
    return await fetchAirtableData(CONFIG.TABLES.training, filter);
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

/**
 * Render About section based on view
 */
function renderAbout(personData) {
    if (!personData) return;
    
    // Public about
    const publicAbout = document.getElementById('aboutPublic');
    if (publicAbout && personData['About (Public)']) {
        publicAbout.textContent = personData['About (Public)'];
    } else if (publicAbout) {
        publicAbout.textContent = 'Add your public profile in Airtable → People → About (Public)';
    }
    
    // Employer about
    const employerAbout = document.getElementById('aboutEmployer');
    if (employerAbout && personData['About (Employer)']) {
        employerAbout.textContent = personData['About (Employer)'];
    } else if (employerAbout) {
        employerAbout.textContent = 'Add employer information in Airtable → People → About (Employer)';
    }
    
    // Private about
    const privateAbout = document.getElementById('aboutPrivate');
    if (privateAbout && personData['About (Private)']) {
        privateAbout.textContent = personData['About (Private)'];
    } else if (privateAbout) {
        privateAbout.textContent = 'Add private notes in Airtable → People → About (Private)';
    }
}

/**
 * Render skills
 */
function renderSkills(skills) {
    const container = document.getElementById('skillsContainer');
    if (!container) return;
    
    if (skills.length === 0) {
        container.innerHTML = '<p class="loading">No skills to display for this view.</p>';
        return;
    }
    
    container.innerHTML = skills.map(record => {
        const fields = record.fields;
        const skillName = Array.isArray(fields.Skill) ? fields.Skill[0] : fields.Skill || 'Unnamed Skill';
        const proficiency = fields.Proficiency || 'Not specified';
        const status = fields.Status || 'Current';
        const visibility = fields.Visibility || 'Public';
        
        // Get proficiency class
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

/**
 * Render experiences
 */
function renderExperiences(experiences) {
    const container = document.getElementById('experienceContainer');
    if (!container) return;
    
    if (experiences.length === 0) {
        container.innerHTML = '<p class="loading">Add experiences in Airtable → Experiences table</p>';
        return;
    }
    
    container.innerHTML = experiences.map(record => {
        const fields = record.fields;
        const role = fields.Role || 'Role';
        const company = fields.Organization || 'Company';
        const dates = fields['Date Range'] || 'Dates';
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

/**
 * Render projects
 */
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
        const description = fields.Description || '';
        
        return `
            <article class="project-card">
                <h3 class="project-title">${name}</h3>
                <p class="project-description">${description}</p>
            </article>
        `;
    }).join('');
}

/**
 * Render training
 */
function renderTraining(training) {
    const container = document.getElementById('trainingContainer');
    if (!container) return;
    
    if (training.length === 0) {
        container.innerHTML = '<p class="loading">Add training in Airtable → Training & Learning table</p>';
        return;
    }
    
    container.innerHTML = training.map(record => {
        const fields = record.fields;
        const name = fields['Course/Training Name'] || 'Training';
        const provider = fields.Provider || '';
        const date = fields['Completion Date'] || '';
        
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

/**
 * Update visibility of content sections based on view
 */
function updateViewVisibility(view) {
    // Update employer content visibility
    const employerContent = document.querySelectorAll('.employer-content');
    employerContent.forEach(el => {
        el.style.display = (view === 'employer' || view === 'private') ? 'block' : 'none';
    });
    
    // Update private content visibility
    const privateContent = document.querySelectorAll('.private-content');
    privateContent.forEach(el => {
        el.style.display = (view === 'private') ? 'block' : 'none';
    });
    
    // Update button states
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

/**
 * Load all data for a specific view
 */
async function loadView(view) {
    currentView = view;
    updateViewVisibility(view);
    
    try {
        // Load person data
        const personData = await getPersonData();
        renderAbout(personData);
        
        // Load skills for this view
        const skills = await getSkills(view);
        renderSkills(skills);
        
        // Load experiences for this view
        const experiences = await getExperiences(view);
        renderExperiences(experiences);
        
        // Load projects for this view
        const projects = await getProjects(view);
        renderProjects(projects);
        
        // Load training (always show all)
        const training = await getTraining();
        renderTraining(training);
        
    } catch (error) {
        console.error('Error loading view:', error);
        document.getElementById('skillsContainer').innerHTML = 
            '<div class="error">Error loading data. Check console for details.</div>';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Set up view switching buttons
 */
function setupViewButtons() {
    document.getElementById('publicView')?.addEventListener('click', () => loadView('public'));
    document.getElementById('employerView')?.addEventListener('click', () => {
        // In production, you'd add password protection here
        const password = prompt('Enter employer access code:');
        if (password === 'employer123') { // Change this!
            loadView('employer');
        } else {
            alert('Incorrect access code');
        }
    });
    document.getElementById('privateView')?.addEventListener('click', () => {
        // In production, you'd add proper authentication here
        const password = prompt('Enter private access code:');
        if (password === 'private123') { // Change this!
            loadView('private');
        } else {
            alert('Incorrect access code');
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the app
 */
async function init() {
    console.log('CareerID Skills Passport initializing...');
    
    // Set up view buttons
    setupViewButtons();
    
    // Load initial view (public)
    await loadView('public');
    
    console.log('CareerID Skills Passport loaded successfully!');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================
// EXPORT FOR TESTING (optional)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchAirtableData,
        getPersonData,
        getSkills,
        loadView
    };
}
