/* Scripts for index.html: scroll animations
   Sections slide gently into view as they reach the screen. Nothing moves
   for visitors who ask their device for reduced motion (see the <head>). */
(function(){

  const root = document.documentElement;
  if(!root.classList.contains('motion')) return;

  // what reveals on scroll; items inside one group arrive one after another
  const GROUPS = [
    ['.section h2, .section-lead'],
    ['.steps li'],
    ['.safe-item'],
    ['.join-card'],
    ['.login-box'],
    ['.footer']
  ];

  GROUPS.forEach(([selector]) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('reveal');
      // stagger siblings in the same row: 0, 90, 180 ms ...
      const index = [...el.parentElement.children].filter(c => c.matches(selector)).indexOf(el);
      el.style.setProperty('--delay', `${Math.max(0, index) * 90}ms`);
    });
  });

  // once in place, hand the element back to its normal styles (hover effects etc.)
  const show = (el) => {
    el.classList.add('in');
    el.addEventListener('transitionend', function done(e){
      if(e.target !== el || e.propertyName !== 'transform') return;
      el.removeEventListener('transitionend', done);
      el.classList.remove('reveal', 'in');
      el.style.removeProperty('--delay');
    });
  };

  if(!('IntersectionObserver' in window)){
    document.querySelectorAll('.reveal').forEach(show);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        show(entry.target);
        observer.unobserve(entry.target); // animate once
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // the top bar gets a shadow once the page has scrolled
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

})();
