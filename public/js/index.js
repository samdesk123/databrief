// Check if there's a previously selected tile
window.addEventListener('load', () => {
    const selectedStore = localStorage.getItem('selectedStore');
    if (selectedStore) {
        const tile = document.querySelector(`[data-store="${selectedStore}"]`);
        if (tile) {
            tile.classList.add('selected');
        }
    }
});

function selectTile(element, store) {
    // Remove selection from all tiles
    document.querySelectorAll('.tile').forEach(tile => {
        tile.classList.remove('selected');
    });
    
    // Add selection to clicked tile
    element.classList.add('selected');
    
    // Save selection to localStorage
    localStorage.setItem('selectedStore', store);
    
    // Navigate to intermediate page after a brief delay
    setTimeout(() => {
        window.location.href = 'intermediate.html';
    }, 300);
} 