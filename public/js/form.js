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

function initializeForm() {
    loadRoles();

    const form = document.getElementById('form');
    if (!form) {
        console.error('Form element not found in DOM');
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = {
            store: document.getElementById('store')?.value || '',
            name: document.getElementById('name')?.value || '',
            email: document.getElementById('email')?.value || '',
            message: document.getElementById('message')?.value || ''
        };

        if (!formData.store || !formData.name || !formData.email || !formData.message) {
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
