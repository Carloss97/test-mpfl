// Local preview dialogs only; these actions do not change process data.
document.querySelectorAll('[data-pd-preview]').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelector('#preview-heading').dataset.i18n = 'pd_' + button.dataset.pdPreview;
        document.querySelector('#preview-description').dataset.i18n = 'pd_mockAction';
        setLanguage(currentLanguage);
        companyDialog.showModal();
    });
});

const processActionsMenu = document.querySelector('.pd-more');
document.addEventListener('click', event => {
    if (!processActionsMenu.contains(event.target)) processActionsMenu.open = false;
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && processActionsMenu.open && !companyDialog.open) {
        processActionsMenu.open = false;
        processActionsMenu.querySelector('summary').focus();
    }
});
