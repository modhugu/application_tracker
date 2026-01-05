/**
 * Renders a single Job Card HTML
 */
window.JobCard = function (job) {
    const statusClass = `status-${job.status.toLowerCase()}`;
    // Handle potential invalid dates gracefully
    let dateFormatted = job.date;
    try {
        dateFormatted = new Date(job.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) { }

    return `
    <div class="job-card" data-id="${job.id}">
        <div class="card-header">
            <div class="company-info">
                <h3>${job.company}</h3>
                <span>${job.role}</span>
            </div>
            <span class="status-badge ${statusClass}">${job.status}</span>
        </div>
        
        <div class="card-body">
            <div class="meta-row">
                <div class="meta-item">
                    <i data-lucide="calendar"></i>
                    <span>${dateFormatted}</span>
                </div>
                ${job.job_code ? `
                <div class="meta-item">
                    <i data-lucide="hash"></i>
                    <span>${job.job_code}</span>
                </div>` : ''}
            </div>
        </div>

        <div class="card-footer">
            <button class="btn-icon" onclick="window.open('${job.url}', '_blank')" title="Open Link">
                <i data-lucide="external-link"></i>
            </button>
            <button class="btn-icon action-edit" data-id="${job.id}" title="Edit">
                <i data-lucide="edit-2"></i>
            </button>
            <button class="btn-icon action-delete" data-id="${job.id}" title="Delete">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    </div>
    `;
}
