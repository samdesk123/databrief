// Check if there's a previously selected tile
window.addEventListener('load', () => {
    const selectedStoreData = JSON.parse(localStorage.getItem('selectedStore'));
    if (selectedStoreData && selectedStoreData.id) {
        const tile = document.querySelector(`[data-store="${selectedStoreData.id}"]`);
        if (tile) {
            tile.classList.add('selected');
        }
    }
});

function selectTile(element, storeId) {
    document.querySelectorAll('.tile').forEach(tile => tile.classList.remove('selected'));
    element.classList.add('selected');

    const storeName = element.querySelector('h2').textContent;
    const storeLogo = element.querySelector('img').getAttribute('src');

    localStorage.setItem('selectedStore', JSON.stringify({
        id: storeId,
        name: storeName,
        logo: storeLogo
    }));

    setTimeout(() => {
        window.location.href = 'intermediate.html';
    }, 300);
}