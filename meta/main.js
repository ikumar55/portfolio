// meta/main.js
const width = 1000;
const height = 600;

let data = [];
let commits = [];

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

  // Create the <dl> in #stats
  const dl = d3.select('#stats')
    .append('dl')
    .attr('class', 'stats');

  // 1) COMMITS
  dl.append('dt').text('COMMITS');
  dl.append('dd').text(commits.length);

  // 2) FILES
  const distinctFiles = d3.groups(data, (d) => d.file).length;
  dl.append('dt').text('FILES');
  dl.append('dd').text(distinctFiles);

  // 3) TOTAL LOC
  dl.append('dt').html('TOTAL <abbr title="Lines of Code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // 4) MAX DEPTH
  const maxDepth = d3.max(data, (d) => d.depth);
  dl.append('dt').text('MAX DEPTH');
  dl.append('dd').text(maxDepth);

  // 5) LONGEST LINE (max line length in characters)
  const maxLineLength = d3.max(data, (d) => d.length);
  dl.append('dt').text('LONGEST LINE');
  dl.append('dd').text(maxLineLength);

  // 6) MAX LINES (highest line number in the codebase)
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

  // If the commit object is empty, clear the tooltip
  if (!commit || Object.keys(commit).length === 0) {
    link.href = '';
    link.textContent = '';
    date.textContent = '';
    linesChanged.textContent = '';
    return;
  }

  // Set commit link + ID
  link.href = commit.url;
  link.textContent = commit.id;

  // Set commit date
  date.textContent = commit.datetime.toLocaleString('en', {
    dateStyle: 'full'
  });

  // Set total lines changed (the circle size)
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
// Scatterplot
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

  // 2) Define scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3
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

  // 8) Create a radius scale so that circle area ~ lines edited
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]); // tweak as needed

  // 9) Sort commits so bigger circles are drawn first
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // 10) Draw circles using sortedCommits
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
      // Highlight the hovered circle
      d3.select(this).style('fill-opacity', 1);

      // Tooltip logic
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', function (event) {
      // Move the tooltip with the mouse
      updateTooltipPosition(event);
    })
    .on('mouseleave', function () {
      // Restore opacity
      d3.select(this).style('fill-opacity', 0.7);

      // Clear tooltip
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });
}
