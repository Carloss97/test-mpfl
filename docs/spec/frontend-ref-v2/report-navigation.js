const reportProcessPages = {supervisor: 'process-detail.html', operator: 'process-operator.html', technician: 'process-technician.html'};
const reportProcess = new URLSearchParams(window.location.search).get('process');
document.querySelector('.pd-back').href = reportProcessPages[reportProcess] || reportProcessPages.supervisor;
