// UI-only preview controls. No requests, authentication or business operations.
const companySidebar = document.querySelector('.co-sidebar');
const companyMenu = document.querySelector('.co-menu');
const companyDialog = document.querySelector('.co-dialog');
const profileMenu = document.querySelector('.co-profile-menu');
const profileButton = profileMenu.querySelector('.co-profile');
const profileDropdown = profileMenu.querySelector('.co-profile-dropdown');

function closeProfileMenu() {
    profileDropdown.hidden = true;
    profileButton.setAttribute('aria-expanded', 'false');
}

profileButton.addEventListener('click', () => {
    profileDropdown.hidden = !profileDropdown.hidden;
    profileButton.setAttribute('aria-expanded', String(!profileDropdown.hidden));
});

document.addEventListener('click', event => {
    if (!profileMenu.contains(event.target)) closeProfileMenu();
});

document.addEventListener('focusin', event => {
    if (!profileMenu.contains(event.target)) closeProfileMenu();
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !profileDropdown.hidden) {
        closeProfileMenu();
        profileButton.focus();
    }
});

function closeCompanyMenu() {
    companySidebar.classList.remove('is-open');
    companyMenu.setAttribute('aria-expanded', 'false');
}

companyMenu.addEventListener('click', () => {
    const open = companySidebar.classList.toggle('is-open');
    companyMenu.setAttribute('aria-expanded', String(open));
});

document.addEventListener('click', event => {
    if (!companySidebar.contains(event.target) && !companyMenu.contains(event.target)) {
        closeCompanyMenu();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && companySidebar.classList.contains('is-open')) {
        closeCompanyMenu();
        companyMenu.focus();
    }
});

window.matchMedia('(max-width: 760px)').addEventListener('change', closeCompanyMenu);

document.querySelectorAll('[data-preview]').forEach(button => {
    button.addEventListener('click', () => {
        const kind = button.dataset.preview;
        const heading = kind === 'pending' ? 'previewTitle' : kind;
        const description = kind === 'pending' ? 'previewText' : kind + 'Text';
        document.querySelector('#preview-heading').dataset.i18n = 'company_' + heading;
        document.querySelector('#preview-description').dataset.i18n = 'company_' + description;
        setLanguage(currentLanguage);
        companyDialog.showModal();
    });
});
