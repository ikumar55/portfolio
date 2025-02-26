// meta/main.js
const width = 1000;
const height = 600;

let data = [];
let commits = [];

// Global scales to be used by the brush functions
let xScale, yScale;
// Global brush selection variable
let brushSelection = null;

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

  // Now that 'data' is ready, display the stats
  displayStats();

  // processCommits => populates the global 'commits' array
  processCommits();

  // Now that commits is populated, create the scatterplot
  createScatterPlot();
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
function isCommitSelected(commit) {
  if (!brushSelection) return false;

  const [[x0, y0], [x1, y1]] = brushSelection;
  const cx = xScale(commit.datetime);
  const cy = yScale(commit.hourFrac);
  return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
}

// Update the visual state of dots based on brush selection
function updateSelection() {
  d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

// Update the selection count display
function updateSelectionCount() {
  const selectedCommits = brushSelection
    ? commits.filter(isCommitSelected)
    : [];
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
  return selectedCommits;
}

// Update language breakdown for selected commits
function updateLanguageBreakdown() {
  const selectedCommits = brushSelection
    ? commits.filter(isCommitSelected)
    : [];
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

// Brush event handler
function brushed(event) {
  brushSelection = event.selection;
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

// -------------------
// Scatterplot and Brush
// -------------------
function createScatterPlot() {
  // 1) Select the container and append an SVG
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // 2) Define scales (assign them to global variables so brush functions can use them)
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // 3) Define axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // 4) Add horizontal grid lines (drawn behind dots)
  svg
    .append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(
      d3.axisLeft(yScale)
        .tickSize(-usableArea.width)
        .tickFormat('')
    )
    .call((g) => g.select('.domain').remove());

  // 5) Add the Y axis
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // 6) Add the X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  // 7) Prepare a <g> for our circles
  const dots = svg.append('g').attr('class', 'dots');

  // 8) Create a radius scale (circle area ~ totalLines)
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  // 9) Sort commits so larger circles are drawn first (so smaller ones appear on top)
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // 10) Draw circles using sortedCommits with tooltip integration
  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', function (event, d) {
      d3.select(this).style('fill-opacity', 1);
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', function (event) {
      updateTooltipPosition(event);
    })
    .on('mouseleave', function () {
      d3.select(this).style('fill-opacity', 0.7);
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });

  // 11) Initialize the brush
  const brush = d3.brush()
    .on('start brush end', brushed);
  d3.select(svg.node()).call(brush);
  // Raise the dots (and any elements after the overlay) so that tooltips still work
  d3.select(svg.node()).selectAll('.dots, .overlay ~ *').raise();
}