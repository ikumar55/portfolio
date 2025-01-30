console.log("IT’S ALIVE!");

// Get all navigation links
const navLinks = $$("nav a");
console.log("All nav links:", navLinks); // Debugging: Check if links are retrieved

// Find the link to the current page
const currentLink = navLinks.find((a) => {
  console.log("Checking link:", a.href); // Log each link's href
  console.log("Host:", a.host, "Pathname:", a.pathname); // Log the host and pathname
  console.log("Location Host:", location.host, "Location Pathname:", location.pathname); // Log location details
  return a.host === location.host && a.pathname === location.pathname;
});

// Debugging: Check if we found the current link
console.log("Current Link Found:", currentLink);
