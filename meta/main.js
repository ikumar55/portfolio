// meta/main.js
const width = 1000;
const height = 600;

let svg;

let data = [];
let commits = [];
let selectedCommits = [];

let filteredCommits = [];


// Global scales to be used by the brush functions
let xScale, yScale;
// Global brush selection variable
let brushSelection = null;


let commitProgress = 100; // 0..100
let timeScale;  




/**
 * 1) Load the CSV into 'data' and parse numeric/date fields.
 *    After loading, call displayStats().
 */
async function loadData() {
  data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  displayStats();
  processCommits();

  // Define your timeScale etc.
  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

  // Initialize the SVG only once
  initializeChart();

  // Draw initial scatter plot with all commits
  updateScatterPlot(commits);

  // Set up the slider UI
  setupSlider();
}



/**
 * 2) Convert line-level data into commit-level data.
 */
function processCommits() {
  commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime } = first;

    let ret = {
      id: commit,
      url: 'https://github.com/ikumar55/portfolio/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };

    // Hide the original lines array so it doesn't clutter console logs
    Object.defineProperty(ret, 'lines', {
      value: lines,
      enumerable: false,
      writable: true,
      configurable: true,
    });

    return ret;
  });
}

/**
 * 3) Display summary stats as a single <dl class="stats">.
 */
function displayStats() {
  // Convert line-level data -> commit-level data
  processCommits();

  const dl = d3.select('#stats')
    .append('dl')
    .attr('class', 'stats');

  dl.append('dt').text('COMMITS');
  dl.append('dd').text(commits.length);

  const distinctFiles = d3.groups(data, (d) => d.file).length;
  dl.append('dt').text('FILES');
  dl.append('dd').text(distinctFiles);

  dl.append('dt').html('TOTAL <abbr title="Lines of Code">LOC</abbr>');
  dl.append('dd').text(data.length);

  const maxDepth = d3.max(data, (d) => d.depth);
  dl.append('dt').text('MAX DEPTH');
  dl.append('dd').text(maxDepth);

  const maxLineLength = d3.max(data, (d) => d.length);
  dl.append('dt').text('LONGEST LINE');
  dl.append('dd').text(maxLineLength);

  const maxLineNumber = d3.max(data, (d) => d.line);
  dl.append('dt').text('MAX LINES');
  dl.append('dd').text(maxLineNumber);
}

/**
 * 4) When the DOM is ready, load the data.
 */
document.addEventListener('DOMContentLoaded', loadData);

// -------------------
// Tooltip functions
// -------------------
function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const linesChanged = document.getElementById('commit-lines-changed');

  if (!commit || Object.keys(commit).length === 0) {
    link.href = '';
    link.textContent = '';
    date.textContent = '';
    linesChanged.textContent = '';
    return;
  }

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime.toLocaleString('en', { dateStyle: 'full' });
  linesChanged.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

// -------------------
// Brushing functions
// -------------------

// Returns true if the commit's x and y positions are within the brush selection
// 3) isCommitSelected() just checks the array
function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

// Update the visual state of dots based on brush selection
function updateSelection() {
  d3.selectAll('circle')
    .classed('selected', d => isCommitSelected(d));
}

// Update the selection count display
function updateSelectionCount() {
  const countElement = document.getElementById('selection-count');
  countElement.textContent = selectedCommits.length
    ? `${selectedCommits.length} commits selected`
    : 'No commits selected';
}

// Update language breakdown for selected commits
function updateLanguageBreakdown() {

  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  // If no commits are selected, you might decide to use all commits instead:
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
  return breakdown;
}

// 2) brushed function updates selectedCommits instead of brushSelection
function brushed(evt) {
  const selection = evt.selection;
  selectedCommits = !selection
    ? []
    : commits.filter(commit => {
        let [[x0, y0], [x1, y1]] = selection;
        let cx = xScale(commit.datetime);
        let cy = yScale(commit.hourFrac);
        return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
      });
  
  // After updating selectedCommits, call any “update” functions:
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

// -------------------
// Scatterplot and Brush
// -------------------
function updateScatterPlot(data) {
  // Define margins and usable area again (if needed)
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Update scales
  xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

  // Update axes
  svg.select('.x-axis')
    .transition().duration(300)
    .call(xAxis);

  svg.select('.y-axis')
    .transition().duration(300)
    .call(yAxis);

  // Create a radius scale based on the filtered data
  const [minLines, maxLines] = d3.extent(data, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 0])
    .range([2, 30]);

  // Sort data so bigger circles are drawn first
  const sortedData = d3.sort(data, d => -d.totalLines);

  // Join data with a key function on the existing dots group
  const dots = svg.select('.dots');
  const circles = dots.selectAll('circle')
    .data(sortedData, d => d.id);

  // EXIT: Remove circles that are no longer needed
  circles.exit().remove();

  // UPDATE: Update attributes for existing circles
  circles
    .transition()
    .duration(300)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('--r', d => rScale(d.totalLines));

  // ENTER: Append new circles for new data points
  const circlesEnter = circles.enter()
    .append('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    // Start new circles with r = 0 so they animate in
    .attr('r', 0)
    .style('--r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', function(event, d) {
      d3.select(this)
        .classed('selected', isCommitSelected(d))
        .style('fill-opacity', 1);
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', event => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', function(event, d) {
      d3.select(this)
        .classed('selected', isCommitSelected(d))
        .style('fill-opacity', 0.7);
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });

  // Transition new circles to their intended size
  circlesEnter.transition()
    .duration(300)
    .attr('r', d => rScale(d.totalLines));
}





function initializeChart() {
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Add grid lines (if these are static)
  svg.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(
      d3.axisLeft(d3.scaleLinear().range([usableArea.bottom, usableArea.top]))
        .tickSize(-usableArea.width)
        .tickFormat('')
    )
    .call(g => g.select('.domain').remove());

  // Create axes groups that we can update later
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`);

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  // Create the dots group for circles
  svg.append('g')
    .attr('class', 'dots');
}











function setupSlider() {
  const slider = document.getElementById('commitProgressSlider');
  const selectedTimeElem = document.getElementById('selectedTime');
  
  // Show initial date/time for commitProgress = 100
  updateSelectedTimeDisplay();

  // Listen for changes to the slider
  slider.addEventListener('input', () => {
    commitProgress = +slider.value;
    updateSelectedTimeDisplay();
  });

  function updateSelectedTimeDisplay() {
    const commitMaxTime = timeScale.invert(commitProgress);
    selectedTimeElem.textContent = commitMaxTime.toLocaleString('en', {
      dateStyle: 'long',
      timeStyle: 'short'
    });
  
    // Filter and update the scatter plot
    filterCommitsByTime();          // sets filteredCommits
    updateScatterPlot(filteredCommits); // draws only those commits
  }
  
}



function filterCommitsByTime() {
  // Convert commitProgress (0..100) to a Date
  const commitMaxTime = timeScale.invert(commitProgress);

  // Filter commits whose datetime is <= commitMaxTime
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
}



let lines = filteredCommits.flatMap((d) => d.lines);
let files = [];
files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  });