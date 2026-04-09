// Utility to track token and handle dynamic authenticated requests
const API_URL = '/api/v1';

export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem('velvet_husk_token', token);
    } else {
        localStorage.removeItem('velvet_husk_token');
    }
};

export const getAuthToken = () => {
    return localStorage.getItem('velvet_husk_token');
};

export const apiFetch = async (endpoint, options = {}) => {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        // Check if token expired or unauthorized
        if (response.status === 401) {
            setAuthToken(null);
            if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                window.location.href = '/';
            }
        }

        if (!response.ok) {
            throw new Error(data.message || 'API Error Occurred');
        }

        return data;
    } catch (error) {
        console.error('API Call Failed:', error.message);
        throw error;
    }
};
