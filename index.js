import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch GitHub data for your username
        const githubData = await fetchGitHubData('ikumar55'); // Replace with your GitHub username
        console.log('GitHub Data:', githubData);

        // Select the container for profile stats
        const profileStats = document.querySelector('#profile-stats');
        if (profileStats && githubData) {
            profileStats.innerHTML = `
                <dl>
                    <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
                    <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
                    <dt>Followers:</dt><dd>${githubData.followers}</dd>
                    <dt>Following:</dt><dd>${githubData.following}</dd>
                </dl>
            `;
            console.log('GitHub stats rendered successfully.');
        } else {
            console.error('GitHub data is unavailable or profileStats container is missing.');
        }
    } catch (error) {
        console.error('Error fetching GitHub data:', error);
    }

    try {
        // Fetch the projects
        const projects = await fetchJSON('./lib/projects.json');
        console.log('Projects Data:', projects);

        // Filter the first 3 projects
        const latestProjects = projects.slice(0, 3);

        // Select the container for displaying projects
        const projectsContainer = document.querySelector('.projects');

        // Render the latest projects
        renderProjects(latestProjects, projectsContainer, 'h2');
    } catch (error) {
        console.error('Error rendering latest projects:', error);
    }
});

