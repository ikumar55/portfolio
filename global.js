// // Define the $$ function
// function $$(selector, context = document) {
//     return Array.from(context.querySelectorAll(selector));
//   }
  
//   // Get all navigation links
//   const navLinks = $$("nav a");
  
//   // Find the link to the current page
//   let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname
//   );


// currentLink?.classList.add('current');


let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: 'https://github.com/ikumar55', title: 'Github' }];


let nav = document.createElement('nav');
document.body.prepend(nav);

const ARE_WE_HOME = document.documentElement.classList.contains('home');



for (let p of pages) {
    let url = p.url;
    let title = p.title;
  
    // Adjust relative URLs if not on the home page
    url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;
  
    // Create the <a> element
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
  
    // Highlight the current page
    a.classList.toggle(
      'current',
      a.host === location.host && a.pathname === location.pathname
    );
  
    // Open external links in a new tab
    a.toggleAttribute('target', a.host !== location.host);
  
    // Append the <a> element to the <nav>
    nav.append(a);
  }