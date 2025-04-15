// Form handling
async function loadRoles() {
    try {
        const response = await fetch('http://localhost:4000/api/roles');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success && data.roles) {
            const roleSelect = document.getElementById('role');
            roleSelect.innerHTML = '<option value="">Select a role</option>';
            
            data.roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.id;
                option.textContent = role.role_name;
                roleSelect.appendChild(option);
            });

            const savedRole = localStorage.getItem('role');
            if (savedRole) {
                roleSelect.value = savedRole;
            }
        }
    } catch (error) {
        console.error('Error loading roles:', error);
        alert('Error loading roles. Please try again.');
    }
}

function changeStore() {
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('role').value = '';
    document.getElementById('message').value = '';
    
    clearAllStoreData();
    window.location.href = 'index.html';
}

// Initialize form
function initializeForm() {
    const form = document.getElementById('myForm');
    const formElements = form.elements;

    // Load store information
    const selectedStore = localStorage.getItem('selectedStore');
    if (!selectedStore) {
        window.location.href = 'index.html';
        return;
    }

    const { names: storeNames, logos: storeLogos } = getStoreInfo();
    
    document.getElementById('storeName').textContent = storeNames[selectedStore] || selectedStore;
    document.getElementById('storeLogo').src = storeLogos[selectedStore] || '';
    document.getElementById('storeLogo').alt = storeNames[selectedStore] || selectedStore;
    
    // Handle store changes
    const previousStore = localStorage.getItem('previousStore');
    if (previousStore && previousStore !== selectedStore) {
        clearFormData();
    }
    
    localStorage.setItem('previousStore', selectedStore);
    loadRoles();

    // Save form data as user types
    for (let element of formElements) {
        element.addEventListener('input', (e) => {
            localStorage.setItem(e.target.name, e.target.value);
        });
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const formData = {
                store: selectedStore,
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                role: document.getElementById('role').value,
                message: document.getElementById('message').value
            };

            localStorage.setItem('pendingSubmission', JSON.stringify(formData));
            window.location.href = 'success.html';
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing form. Please try again.');
        }
    });

    // Handle role changes
    document.getElementById('role').addEventListener('change', (e) => {
        localStorage.setItem('role', e.target.value);
    });
}

// Initialize when page loads
window.addEventListener('load', initializeForm); 