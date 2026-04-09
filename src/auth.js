import { apiFetch, setAuthToken } from './api.js';

export function initAuth() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('login-btn');
        const errorMsg = document.getElementById('error-msg');

        // Loading state
        submitBtn.innerHTML = 'Authenticating... <span class="material-symbols-outlined animate-spin text-sm ml-2">sync</span>';
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-70');
        if (errorMsg) errorMsg.classList.add('hidden');

        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            // Upon success, store token and redirect safely
            if (data.token) {
                setAuthToken(data.token);
                // Also store user locally for quick sync
                localStorage.setItem('velvet_husk_user', JSON.stringify(data.data.user));
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            // Restore button state
            submitBtn.innerHTML = 'Sign In';
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-70');

            // Show error message component
            if (errorMsg) {
                errorMsg.textContent = error.message;
                errorMsg.classList.remove('hidden');
            } else {
                alert(`Login Failed: ${error.message}`);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initAuth);
