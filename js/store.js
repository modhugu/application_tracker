/**
 * JobTracker Data Store (Local Only)
 * Handles persistence to LocalStorage and Export/Import logic.
 */

const STORAGE_KEY = 'job_tracker_data_v1';

class Store {
    constructor() {
        this.jobs = this.load();
        this.listeners = [];
    }

    // --- Local Data ---

    load() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs));
        this.notify();
    }

    getJobs() {
        return [...this.jobs].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    addJob(job) {
        if (!job.id) job.id = crypto.randomUUID();
        job.createdAt = new Date().toISOString();
        this.jobs.unshift(job);
        this.save();
        return job;
    }

    updateJob(updatedJob) {
        const index = this.jobs.findIndex(j => j.id === updatedJob.id);
        if (index !== -1) {
            this.jobs[index] = { ...this.jobs[index], ...updatedJob };
            this.save();
        }
    }

    deleteJob(id) {
        this.jobs = this.jobs.filter(j => j.id !== id);
        this.save();
    }

    // --- Events ---

    subscribe(listener) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    notify() {
        this.listeners.forEach(l => l(this.jobs));
    }

    // --- Export / Import ---

    exportData() {
        const dataStr = JSON.stringify(this.jobs, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedJobs = JSON.parse(e.target.result);
                    if (Array.isArray(importedJobs)) {
                        this.jobs = importedJobs;
                        this.save();
                        resolve(true);
                    } else {
                        reject(new Error("Invalid array"));
                    }
                } catch (err) { reject(err); }
            };
            reader.readAsText(file);
        });
    }
}

// Expose globally
window.JobStore = new Store();
