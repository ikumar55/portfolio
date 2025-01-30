console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}




const navLinks = $$("nav a");
// Find the link to the current page
const currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname
);
