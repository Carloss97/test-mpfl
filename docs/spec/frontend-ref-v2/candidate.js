// Informational previews only; no account, application or assessment operations.
const candidateDialog = document.querySelector('.cp-dialog');
document.querySelectorAll('[data-cp-preview]').forEach(button => {
    button.addEventListener('click', () => {
        const key = button.dataset.cpPreview;
        document.querySelector('#cp-dialog-heading').dataset.i18n = key;
        document.querySelector('#cp-dialog-text').dataset.i18n = key === 'cp_help' ? 'cp_helpText' : 'cp_next';
        setLanguage(currentLanguage);
        candidateDialog.showModal();
    });
});
