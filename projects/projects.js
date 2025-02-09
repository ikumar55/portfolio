import { fetchJSON, renderProjects } from '../global.js';

let selectedIndex = -1; // No index selected initially


document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch project data
        const projects = await fetchJSON('../lib/projects.json');

        // Select the container where projects will be rendered
        const projectsContainer = document.querySelector('.projects');

        // Render projects dynamically
        renderProjects(projects, projectsContainer, 'h2');

        // Select the projects title element
        const projectsTitle = document.querySelector('.projects-title');

        // Update the title with the project count
        projectsTitle.textContent = `Projects (${projects.length})`;
    } catch (error) {
        console.error('Error rendering projects:', error);
    }
});





import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Fetch project data dynamically
let projects = await d3.json("../lib/projects.json"); // Adjust path if needed

// Function to render the pie chart and legend
function renderPieChart(projectsGiven) {
    // Clear previous chart and legend
    let svg = d3.select("#projects-pie-plot");
    svg.selectAll("path").remove();

    let legend = d3.select(".legend");
    legend.selectAll("li").remove();

    // Recalculate rolled data
    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length, // Count the projects for each year
        (d) => d.year // Group by year
    );

    // Recalculate data
    let data = rolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    // Generate pie chart
    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let arcData = sliceGenerator(data);
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    // Initialize a variable to track the selected wedge
    let selectedIndex = -1;

    // Append paths to the SVG
    arcData.forEach((d, idx) => {
        svg
            .append("path")
            .attr("d", arcGenerator(d))
            .attr("fill", colors(idx))
            .attr("class", idx === selectedIndex ? "selected" : "") // Highlight selected wedge
            .style("cursor", "pointer") // Indicate wedges are clickable
            .on("click", () => {
                // Toggle the selected index
                selectedIndex = selectedIndex === idx ? -1 : idx;

                // Filter projects based on search query and selected year
                let filteredProjects = projects.filter((p) => {
                    let matchesQuery = Object.values(p).join("\n").toLowerCase().includes(query.toLowerCase());
                    let matchesYear = selectedIndex === -1 || p.year === data[selectedIndex].label;
                    return matchesQuery && matchesYear;
                });

                // Render filtered projects
                renderProjects(filteredProjects, projectsContainer, "h2");

                // Update the classes for all wedges
                svg
                    .selectAll("path")
                    .attr("class", (_, i) => (i === selectedIndex ? "selected" : ""));

                // Update legend highlight
                legend
                    .selectAll("li")
                    .attr("class", (_, i) => (i === selectedIndex ? "selected" : ""));
            });
    });

    // Generate legend
    data.forEach((d, idx) => {
        legend
            .append("li")
            .attr("style", `--color:${colors(idx)}`)
            .attr("class", idx === selectedIndex ? "legend-item selected" : "legend-item")
            .html(
                `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`
            )
            .on("click", () => {
                // Toggle the selected index when clicking on the legend
                selectedIndex = selectedIndex === idx ? -1 : idx;

                // Filter projects based on search query and selected year
                let filteredProjects = projects.filter((p) => {
                    let matchesQuery = Object.values(p).join("\n").toLowerCase().includes(query.toLowerCase());
                    let matchesYear = selectedIndex === -1 || p.year === data[selectedIndex].label;
                    return matchesQuery && matchesYear;
                });

                // Render filtered projects
                renderProjects(filteredProjects, projectsContainer, "h2");

                // Update the classes for all wedges
                svg
                    .selectAll("path")
                    .attr("class", (_, i) => (i === selectedIndex ? "selected" : ""));

                // Update legend highlight
                legend
                    .selectAll("li")
                    .attr("class", (_, i) => (i === selectedIndex ? "selected" : ""));
            });
    });
}



// Initial rendering of pie chart
renderPieChart(projects);

// Search functionality
let query = ''; // Search query
let searchInput = document.querySelector('.searchBar'); // Search input
let projectsContainer = document.querySelector('.projects'); // Projects container

searchInput.addEventListener('input', (event) => {
    // Update query value
    query = event.target.value;

    // Filter projects
    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    });

    // Render filtered projects
    renderProjects(filteredProjects, projectsContainer, 'h2');

    // Re-render pie chart based on filtered projects
    renderPieChart(filteredProjects);
});