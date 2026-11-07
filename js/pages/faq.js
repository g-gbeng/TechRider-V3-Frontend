/* Scripts for faq.html: back button, opening answers, filter tabs and search */

/* universal back button: ?from=<page> goes back there */
function goBack(){
  const from = new URLSearchParams(window.location.search).get('from');
  if(from && /^[a-z0-9-]+(\.html)?$/i.test(from)){
    window.location.href = from;
  }else if(history.length > 1){
    history.back();
  }else{
    window.location.href = 'index.html';
  }
}

/* accordion: each question opens and closes its answer.
   The answer slides to its real height, so long answers are never cut off. */
const items = [...document.querySelectorAll('.faqItem')];

function setOpen(item, open){
  const answer = item.querySelector('.answer');
  const question = item.querySelector('.question');
  question.setAttribute('aria-expanded', open ? 'true' : 'false');
  if(open === item.classList.contains('active')) return;
  if(open){
    item.classList.add('active');
    answer.style.maxHeight = '0px';
    requestAnimationFrame(() => { answer.style.maxHeight = answer.scrollHeight + 'px'; });
    answer.addEventListener('transitionend', function done(){
      answer.removeEventListener('transitionend', done);
      if(item.classList.contains('active')) answer.style.maxHeight = '';
    });
  }else{
    answer.style.maxHeight = answer.scrollHeight + 'px';
    requestAnimationFrame(() => {
      item.classList.remove('active');
      answer.style.maxHeight = '0px';
    });
  }
}

items.forEach((item, i) => {
  const question = item.querySelector('.question');
  const answer = item.querySelector('.answer');
  const answerId = (item.id || 'faq-' + i) + '-answer';
  answer.id = answerId;
  question.setAttribute('role', 'button');
  question.setAttribute('tabindex', '0');
  question.setAttribute('aria-controls', answerId);
  question.setAttribute('aria-expanded', 'false');
  question.querySelector('i')?.setAttribute('aria-hidden', 'true');

  question.addEventListener('click', () => setOpen(item, !item.classList.contains('active')));
  question.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      setOpen(item, !item.classList.contains('active'));
    }
  });
});

/* faq.html#signup-documents opens that question and scrolls to it */
function openFromHash(){
  const id = decodeURIComponent(location.hash.slice(1));
  if(!id) return;
  const item = document.getElementById(id);
  if(!item || !item.classList.contains('faqItem')) return;
  const section = item.closest('.faqCategory');
  if(section && section.style.display === 'none') filterFAQ('all', document.querySelector('.filterBtn'));
  setOpen(item, true);
  item.classList.add('flash');
  setTimeout(() => item.classList.remove('flash'), 2200);
  setTimeout(() => item.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}
window.addEventListener('hashchange', openFromHash);
openFromHash();

/* filter tabs */
function filterFAQ(type, button){
  document.querySelectorAll('.faqCategory').forEach(category => {
    category.style.display = (type === 'all' || category.classList.contains(type)) ? '' : 'none';
  });
  document.querySelectorAll('.filterBtn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
  if(button){
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
  }
}

/* search: hides questions that don't match, and sections left empty */
function searchFAQ(){
  const input = document.getElementById('searchInput').value.trim().toLowerCase();
  items.forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(input) ? '' : 'none';
  });
  document.querySelectorAll('.faqCategory').forEach(category => {
    const any = [...category.querySelectorAll('.faqItem')].some(i => i.style.display !== 'none');
    category.classList.toggle('emptySearch', !any);
  });
}
