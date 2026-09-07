// Search and sorting act only on the demo cards already in this page.
const processCards = [...document.querySelectorAll('.pl-card')];
const processSearch = document.querySelector('#process-search');
const processArea = document.querySelector('#process-area');
const processLocation = document.querySelector('#process-location');
const processSort = document.querySelector('#process-sort');
const normalizeProcessText = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function updateProcessList() {
    const query = normalizeProcessText(processSearch.value);
    const ordered = [...processCards].sort((a, b) => {
        switch (processSort.value) {
            case 'oldest': return a.dataset.date.localeCompare(b.dataset.date);
            case 'candidates': return Number(b.dataset.candidates) - Number(a.dataset.candidates);
            case 'score': return Number(b.dataset.score) - Number(a.dataset.score);
            case 'name': return a.querySelector('h2').textContent.localeCompare(b.querySelector('h2').textContent, currentLanguage);
            default: return b.dataset.date.localeCompare(a.dataset.date);
        }
    });
    let count = 0;
    for (const card of ordered) {
        const searchable = card.querySelector('h2').textContent + ' ' + card.querySelector('p').textContent;
        card.hidden = !(normalizeProcessText(searchable).includes(query) && (!processArea.value || card.dataset.area === processArea.value) && (!processLocation.value || card.dataset.location === processLocation.value));
        if (!card.hidden) count++;
        document.querySelector('#process-list').append(card);
    }
    document.querySelector('#process-count').textContent = count;
    document.querySelector('#process-empty').hidden = count > 0;
}
processSearch.addEventListener('input', updateProcessList);
[processArea, processLocation, processSort].forEach(control => control.addEventListener('change', updateProcessList));
document.querySelector('#process-reset').addEventListener('click', () => {
    processSearch.value = processArea.value = processLocation.value = '';
    processSort.value = 'recent';
    updateProcessList();
});
document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', updateProcessList));
updateProcessList();
