import { apiFetch, getAuthToken } from './api.js';

export async function initDashboard() {
    const token = getAuthToken();
    if (!token) {
        // Not authenticated
        window.location.href = 'index.html';
        return;
    }

    try {
        const data = await apiFetch('/auth/me', { method: 'GET' });
        const user = data.data.user;

        // Try dynamically injecting name
        const headline = document.querySelector('h1.font-headline');
        if (headline && user) {
            headline.innerHTML = `Welcome back,<br><span class="text-primary">${user.name}</span>`;
        }

    } catch (error) {
        console.error("Dashboard auth failed:", error);
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);
