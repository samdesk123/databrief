// Common functions
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Store management
function getStoreInfo() {
    return {
        names: {
            'supermarket': 'Woolworths Supermarket',
            'bigw': 'BIG W',
            'bws': 'BWS',
            'everyday': 'Everyday Market'
        },
        logos: {
            'supermarket': 'assets/images/woolworths_super.png',
            'bigw': 'assets/images/bigw-logo.svg',
            'bws': 'assets/images/bws-logo.webp',
            'everyday': 'assets/images/Market.webp'
        }
    };
}

// Local storage management
function clearFormData() {
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    localStorage.removeItem('message');
    localStorage.removeItem('formData');
    localStorage.removeItem('pendingSubmission');
}

function clearAllStoreData() {
    clearFormData();
    localStorage.removeItem('selectedStore');
    localStorage.removeItem('previousStore');
} 