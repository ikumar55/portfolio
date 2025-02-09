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
    { url: 'https://github.com/ikumar55', title: 'Github' }
  ];
  
  // Create the <nav> element and add it to the page
  let nav = document.createElement('nav');
  document.body.prepend(nav);
  
  // Create a <ul> element for the list
  let ul = document.createElement('ul');
  nav.append(ul);
  
  // Detect if we’re on the home page
  const ARE_WE_HOME = document.documentElement.classList.contains('home');
  
  // Add links to the <ul>
  for (let p of pages) {
    let url = p.url;
    let title = p.title;
  
    // Adjust relative URLs if not on the home page
    url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;
  
    // Create <li> and <a> elements
    let li = document.createElement('li');
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
  
    // Highlight the current page
    if (a.host === location.host && a.pathname === location.pathname) {
      a.classList.add('current');
    }
  
    // Open external links in a new tab
    if (a.host !== location.host) {
      a.setAttribute('target', '_blank');
    }
  
    // Append the <a> to the <li>, and the <li> to the <ul>
    li.append(a);
    ul.append(li);
  }


  document.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent default form submission
    const form = event.target;
    const data = new FormData(form);
  
    let mailtoURL = form.action + "?"; // Start building the mailto URL
  
    const params = [];
    for (let [name, value] of data.entries()) {
      if (name === "message") {
        params.push(`body=${encodeURIComponent(value)}`); // Add 'body' parameter for message
      } else {
        params.push(`${name}=${encodeURIComponent(value)}`); // Add other fields like 'subject'
      }
    }
  
    mailtoURL += params.join("&"); // Concatenate all parameters with '&'
  
    location.href = mailtoURL; // Open the mailto link
  });


export async function fetchJSON(url) {
  try {
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      return await response.json();
  } catch (error) {
      console.error('Error fetching JSON:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';
  projects.forEach(project => {
      const article = document.createElement('article');
      article.innerHTML = `
          <${headingLevel}>${project.title || 'Untitled Project'}</${headingLevel}>
          <img src="${project.image || 'default-image.png'}" alt="${project.title || 'Project Image'}">
          <div>
              <p>${project.description || 'No description available.'}</p>
              <p class="project-year">Year: ${project.year || 'Unknown'}</p>
          </div>
      `;
      containerElement.appendChild(article);
  });
}




export async function fetchGitHubData(username) {
  // Use the fetchJSON method to request data from the GitHub API
  return fetchJSON(`https://api.github.com/users/${username}`);
}

console.log('global.js loaded. Exports:', { fetchGitHubData });
