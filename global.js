// Define the $$ function
function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }
  
  // Get all navigation links
  const navLinks = $$("nav a");
  
  // Find the link to the current page
  let currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
  );


currentLink?.classList.add('current');