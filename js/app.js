// Main App Controller
// Relies on window.JobStore and window.JobCard

// DOM Elements
const jobBoard = document.getElementById('job-board');
const searchInput = document.getElementById('search-input');
const statsText = document.getElementById('stats-text');

// Job Modal
const modal = document.getElementById('job-modal');
const jobForm = document.getElementById('job-form');
const btnAddJob = document.getElementById('btn-add-job');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancel = document.getElementById('btn-cancel');
const modalTitle = document.getElementById('modal-title');

// Import/Export
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const fileImport = document.getElementById('file-import');

// State
let isEditing = false;
const store = window.JobStore;

// -------------------------------------------------------------
// UI Rendering
// -------------------------------------------------------------

function render() {
    const jobs = store.getJobs();
    const query = searchInput.value.toLowerCase();

    // Filter
    const filteredJobs = jobs.filter(job =>
        job.company.toLowerCase().includes(query) ||
        job.role.toLowerCase().includes(query) ||
        (job.job_code && job.job_code.toLowerCase().includes(query))
    );

    // Update Stats
    statsText.textContent = `Tracking ${filteredJobs.length} active opportunities`;

    // Render Cards
    jobBoard.innerHTML = filteredJobs.map(job => window.JobCard(job)).join('');

    // Re-initialize icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    attachCardListeners();
}

function attachCardListeners() {
    document.querySelectorAll('.action-edit').forEach(btn => {
        btn.addEventListener('click', (e) => openEditModal(e.currentTarget.dataset.id));
    });

    document.querySelectorAll('.action-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('Are you sure you want to delete this application?')) {
                store.deleteJob(e.currentTarget.dataset.id);
            }
        });
    });
}

// -------------------------------------------------------------
// Modal & Form Handling
// -------------------------------------------------------------

function openModal(editing = false) {
    modal.classList.remove('hidden');
    isEditing = editing;
    modalTitle.textContent = editing ? 'Edit Application' : 'Add New Application';
    if (!editing) {
        jobForm.reset();
        document.getElementById('job-id').value = '';
        document.getElementById('date').valueAsDate = new Date();
    }
}

function closeModal() {
    modal.classList.add('hidden');
}

function openEditModal(id) {
    const job = store.getJobs().find(j => j.id === id);
    if (!job) return;

    document.getElementById('job-id').value = job.id;
    document.getElementById('company').value = job.company;
    document.getElementById('role').value = job.role;
    document.getElementById('date').value = job.date;
    document.getElementById('job_code').value = job.job_code || '';
    document.getElementById('url').value = job.url;
    document.getElementById('status').value = job.status;

    openModal(true);
}

// -------------------------------------------------------------
// Settings Handling
// -------------------------------------------------------------

function openSettings() {
    const settings = store.settings;
    document.getElementById('gh-token').value = settings.token;
    document.getElementById('gh-owner').value = settings.owner;
    document.getElementById('gh-repo').value = settings.repo;
    document.getElementById('gh-path').value = settings.path;
    settingsModal.classList.remove('hidden');
}

function closeSettings() {
    settingsModal.classList.add('hidden');
}

// -------------------------------------------------------------
// Event Listeners
// -------------------------------------------------------------

// Job Form
jobForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = {
        id: document.getElementById('job-id').value || null,
        company: document.getElementById('company').value,
        role: document.getElementById('role').value,
        date: document.getElementById('date').value,
        job_code: document.getElementById('job_code').value,
        url: document.getElementById('url').value,
        status: document.getElementById('status').value
    };

    if (isEditing) {
        store.updateJob(formData);
    } else {
        store.addJob(formData);
    }
    closeModal();
});

// Search
searchInput.addEventListener('input', render);

// Job Modal Controls
btnAddJob.addEventListener('click', () => openModal(false));
btnCloseModal.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);

// Settings Controls
// (Settings controls removed as per instruction)

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Import/Export
btnExport.addEventListener('click', () => store.exportData());
btnImport.addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', (e) => {
    if (e.target.files[0]) store.importData(e.target.files[0]).then(() => {
        alert('Imported!');
        fileImport.value = '';
    });
});

// -------------------------------------------------------------
// Init
// -------------------------------------------------------------

store.subscribe(render);

render(); // Initial Render
if (window.lucide) window.lucide.createIcons();
