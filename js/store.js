/**
 * JobTracker Data Store with GitHub Sync
 * Handles persistence to LocalStorage and Sync to GitHub Repository.
 */

const STORAGE_KEY = 'job_tracker_data_v1';
const SETTINGS_KEY = 'job_tracker_settings_v1';

class Store {
    constructor() {
        this.jobs = this.load();
        this.settings = this.loadSettings();
        this.listeners = [];
        this.syncListeners = [];
        this.isSyncing = false;

        // Auto-sync on load if credentials exist
        if (this.settings.token) {
            this.syncWithGitHub();
        }
    }

    // --- Local Data ---

    load() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs));
        this.notify();
        // Trigger Sync
        if (this.settings.token) {
            this.pushToGitHub();
        }
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

    // --- Settings & Auth ---

    loadSettings() {
        const data = localStorage.getItem(SETTINGS_KEY);
        return data ? JSON.parse(data) : { token: '', owner: '', repo: '', path: 'jobs.json' };
    }

    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        this.syncWithGitHub(); // Try to sync immediately
    }

    // --- GitHub Sync Logic ---

    async syncWithGitHub() {
        if (!this.settings.token || this.isSyncing) return;

        this.isSyncing = true;
        this.notifySync("Syncing...");

        try {
            // 1. Fetch Cloud Data
            const cloudData = await this.fetchFromGitHub();

            if (cloudData) {
                // 2. Merge (Simple Strategy: Union by ID, verify conflicts later)
                // For now, let's assume Cloud is "Truth" if it exists, but we merge unique local changes?
                // SAFEST: Let's unify lists. If equal ID, take the one with latest timestamp?
                // Implementation: Simple Append for now + distinct by ID

                const finalJobs = this.mergeJobs(this.jobs, cloudData);

                // 3. Update Local
                this.jobs = finalJobs;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs));
                this.notify();

                // 4. Push back merged state to ensure cloud is up to date
                await this.saveToGitHub(this.jobs);
            } else {
                // No cloud file yet, create it with local data
                await this.saveToGitHub(this.jobs);
            }

            this.notifySync("Synced", "success");
        } catch (error) {
            console.error("Sync Error:", error);
            this.notifySync("Sync Failed", "error");
        } finally {
            this.isSyncing = false;
        }
    }

    async pushToGitHub() {
        if (!this.settings.token) return;
        this.notifySync("Saving...");
        try {
            await this.saveToGitHub(this.jobs);
            this.notifySync("Saved", "success");
        } catch (e) {
            console.error(e);
            this.notifySync("Save Failed", "error");
        }
    }

    mergeJobs(local, cloud) {
        const map = new Map();
        [...local, ...cloud].forEach(job => {
            // In a real robust system, check 'updatedAt'. Here we trust Cloud over Local if duplicate for simplicity, 
            // OR we can default to local if it's currently being edited.
            // Let's use ID mapping.
            map.set(job.id, job);
        });
        return Array.from(map.values());
    }

    async fetchFromGitHub() {
        const { owner, repo, path, token } = this.settings;
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.status === 404) return null; // File doesn't exist
        if (!response.ok) throw new Error('GitHub API Error');

        const data = await response.json();
        const content = atob(data.content); // Base64 decode
        return JSON.parse(content);
    }

    async saveToGitHub(contentObj) {
        const { owner, repo, path, token } = this.settings;
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

        // Get current SHA first (needed for update)
        let sha = null;
        try {
            const getRes = await fetch(url, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (getRes.ok) {
                const json = await getRes.json();
                sha = json.sha;
            }
        } catch (e) { }

        const contentStr = JSON.stringify(contentObj, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(contentStr))); // Unicode safe base64

        const body = {
            message: "Update jobs.json from JobTracker App",
            content: contentBase64,
            ...(sha && { sha })
        };

        const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!putRes.ok) throw new Error('Failed to write to GitHub');
    }

    // --- Events ---

    subscribe(listener) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    subscribeSync(listener) {
        this.syncListeners.push(listener);
        return () => { this.syncListeners = this.syncListeners.filter(l => l !== listener); };
    }

    notify() {
        this.listeners.forEach(l => l(this.jobs));
    }

    notifySync(status, type = 'info') {
        this.syncListeners.forEach(l => l(status, type));
    }

    // Export/Import legacy methods remain valid...
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
