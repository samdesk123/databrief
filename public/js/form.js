const API_BASE_URL = 'https://databrief-141102685385.us-central1.run.app';

async function loadRoles() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/roles`);
        if (!response.ok) {
            throw new Error(`Failed to fetch roles. Status: ${response.status}`);
        }
        const data = await response.json();
        if (!data.roles || !Array.isArray(data.roles)) {
            throw new Error('Invalid roles format from server');
        }
        populateRoles(data.roles);
    } catch (error) {
        console.error('Error loading roles:', error);
        alert('Failed to load roles. Please ensure the backend is running and CORS is configured.');
    }
}

function populateRoles(roles) {
    const roleSelect = document.getElementById('role');
    roleSelect.innerHTML = '<option disabled selected>Choose a role</option>';

    roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.role_name;
        option.textContent = role.role_name;
        roleSelect.appendChild(option);
    });
}

async function loadSelectedStore() {
    try {
        // TEMP FIX: Hardcoded fallback for demo/test
        const store = {
            name: 'Demo Store',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Woolworths_Supermarket_logo.svg'
        };

        document.getElementById('storeName').textContent = store.name;
        document.getElementById('storeLogo').src = store.logoUrl;

        // UNCOMMENT below for real API call once working
        /*
        const response = await fetch(`${API_BASE_URL}/api/selected-store`);
        if (!response.ok) {
            throw new Error(`Failed to fetch selected store. Status: ${response.status}`);
        }

        const store = await response.json();
        document.getElementById('storeName').textContent = store.name || 'Unknown Store';
        document.getElementById('storeLogo').src = store.logoUrl || '';
        */
    } catch (error) {
        console.error('Error loading selected store:', error);
        document.getElementById('storeName').textContent = 'Error loading store';
    }
}

function initializeForm() {
    loadRoles();
    loadSelectedStore();

    const form = document.getElementById('myForm');
    if (!form) {
        console.error('Form element not found in DOM');
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = {
            store: document.getElementById('storeName')?.textContent || '',
            name: document.getElementById('name')?.value || '',
            email: document.getElementById('email')?.value || '',
            role: document.getElementById('role')?.value || '',
            message: document.getElementById('message')?.value || ''
        };

        if (!formData.store || !formData.name || !formData.email || !formData.role || !formData.message) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/submit-form`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                alert('Form submitted successfully!');
                form.reset();
            } else {
                alert(`Submission error: ${result.message}`);
            }
        } catch (error) {
            console.error('Form submission error:', error);
            alert('There was a problem submitting the form. Try again later.');
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeForm);
