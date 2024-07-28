const svg = d3.select("svg");
const edgesLayer = svg.append('g').attr('id', 'edges-layer');
const nodesLayer = svg.append('g').attr('id', 'nodes-layer');

let nodes = [];
let edges = [];
let selectedNodes = [];
let degreeChart;

// Initialize and update the degree distribution chart
function updateDegreeDistribution() {
    const degreeCounts = {};
    nodes.forEach(node => {
        const degree = edges.reduce((acc, edge) => {
            if (edge.source.id === node.id || edge.target.id === node.id) {
                return acc + 1;
            }
            return acc;
        }, 0);
        degreeCounts[degree] = (degreeCounts[degree] || 0) + 1;
    });

    const data = {
        labels: Object.keys(degreeCounts).sort((a, b) => a - b),
        datasets: [{
            label: 'Degree Distribution',
            data: Object.values(degreeCounts),
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };

    if (degreeChart) {
        degreeChart.data = data;
        degreeChart.update();
    } else {
        const ctx = document.getElementById('degree-distribution').getContext('2d');
        degreeChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }
}

// Graph manipulation functions
function addNode(x, y) {
    const newNode = { id: nodes.length + 1, x: x, y: y };
    nodes.push(newNode);
    drawEdges();
    drawNodes();
    updateDegreeDistribution();
}

function addEdge(source, target) {
    const newEdge = { id: `e${edges.length + 1}`, source: source, target: target };
    edges.push(newEdge);
    drawEdges();
    updateDegreeDistribution();
}

function drawEdges() {
    const lines = edgesLayer.selectAll("line")
        .data(edges, d => d.id);

    lines.enter()
        .append("line")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
        .style("stroke", "black")
        .style("stroke-width", 3)
        .on("contextmenu", function(event, d) {
            event.preventDefault();
            removeEdge(d);
        });

    lines.exit().remove();
}

function drawNodes() {
    const circles = nodesLayer.selectAll("circle")
        .data(nodes, d => d.id);

    circles.enter()
        .append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 20)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .style("fill-opacity", 1.0)
        .on("click", function(event, d) {
            event.stopPropagation();
            handleNodeClick(d);
        })
        .on("contextmenu", function(event, d) {
            event.preventDefault();
            removeNode(d);
        });

    circles.exit().remove();
}

function handleNodeClick(node) {
    selectedNodes.push(node);
    if (selectedNodes.length === 2) {
        addEdge(selectedNodes[0], selectedNodes[1]);
        selectedNodes = [];
    }
}

function removeNode(node) {
    nodes = nodes.filter(n => n.id !== node.id);
    edges = edges.filter(e => e.source.id !== node.id && e.target.id !== node.id);
    drawEdges();
    drawNodes();
    updateDegreeDistribution();
}

function removeEdge(edge) {
    edges = edges.filter(e => e.id !== edge.id);
    drawEdges();
    updateDegreeDistribution();
}

svg.on("click", function(event) {
    const [x, y] = d3.pointer(event);
    addNode(x, y);
});

// Functions to convert graph data to CSV formats
function graphToAdjListCSV(nodes, edges) {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Node,Connected Nodes\n";
    nodes.forEach(node => {
        let connections = edges.filter(edge => edge.source.id === node.id || edge.target.id === node.id)
                               .map(edge => edge.source.id === node.id ? edge.target.id : edge.source.id);
        csvContent += `${node.id},${connections.join(";")}\n`;
    });
    return csvContent;
}

function graphToAdjMatrixCSV(nodes, edges) {
    let matrix = [];
    for (let i = 0; i < nodes.length; i++) {
        matrix[i] = new Array(nodes.length).fill(0);
    }
    edges.forEach(edge => {
        let rowIndex = nodes.findIndex(n => n.id === edge.source.id);
        let colIndex = nodes.findIndex(n => n.id === edge.target.id);
        matrix[rowIndex][colIndex] = 1;
        matrix[colIndex][rowIndex] = 1; // For undirected graphs
    });

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "," + nodes.map(n => n.id).join(",") + "\n";
    matrix.forEach((row, index) => {
        csvContent += `${nodes[index].id},${row.join(",")}\n`;
    });
    return csvContent;
}

function downloadCSV(csvContent, fileName) {
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Event listeners for buttons
document.getElementById("save-adj-list").addEventListener("click", () => {
    let csvContent = graphToAdjListCSV(nodes, edges);
    downloadCSV(csvContent, "graph_adjacency_list.csv");
});

document.getElementById("save-adj-matrix").addEventListener("click", () => {
    let csvContent = graphToAdjMatrixCSV(nodes, edges);
    downloadCSV(csvContent, "graph_adjacency_matrix.csv");
});

// Event listener for network topology selection
document.getElementById("network-select").addEventListener("change", function() {
    const selectedNetwork = this.value;
    generateSliders(selectedNetwork);
});

// Event listener for the Create Network button
document.getElementById("create-network").addEventListener("click", function() {
    const selectedNetwork = document.getElementById("network-select").value;
    createNetwork(selectedNetwork);
});

// Function to generate sliders based on selected network topology
function generateSliders(network) {
    const slidersDiv = document.getElementById("sliders");
    slidersDiv.innerHTML = ""; // Clear previous sliders

    // Default slider for number of nodes
    createSlider(slidersDiv, "Number of Nodes", "nodes-slider", 10, 100, 1, 50);

    switch (network) {
        case "complete_graph":
        case "cycle_graph":
        case "path_graph":
        case "star_graph":
        case "wheel_graph":
        case "ladder_graph":
        case "clique_graph":
        case "circular_ladder_graph":
        case "krackhardt_kite_graph":
        case "lollipop_graph":
        case "petersen_graph":
            // Only number of nodes slider needed
            break;
        case "grid_graph":
            createSlider(slidersDiv, "Grid Rows", "rows-slider", 2, 10, 1, 5);
            createSlider(slidersDiv, "Grid Columns", "cols-slider", 2, 10, 1, 5);
            break;
        case "erdos_renyi_graph":
            createSlider(slidersDiv, "Probability", "probability-slider", 0, 1, 0.01, 0.5);
            break;
        case "barabasi_albert_graph":
            createSlider(slidersDiv, "Edges to Attach", "edges-slider", 1, 10, 1, 3);
            break;
        case "watts_strogatz_graph":
            createSlider(slidersDiv, "Nearest Neighbors", "neighbors-slider", 2, 10, 1, 4);
            createSlider(slidersDiv, "Rewiring Probability", "rewiring-slider", 0, 1, 0.01, 0.1);
            break;
        case "random_regular_graph":
            createSlider(slidersDiv, "Degree", "degree-slider", 1, 10, 1, 3);
            break;
        case "balanced_tree":
            createSlider(slidersDiv, "Branching Factor", "branching-slider", 2, 5, 1, 2);
            createSlider(slidersDiv, "Height", "height-slider", 1, 5, 1, 3);
            break;
        case "hypercube_graph":
            createSlider(slidersDiv, "Dimensions", "dimensions-slider", 1, 10, 1, 3);
            break;
        case "random_geometric_graph":
            createSlider(slidersDiv, "Radius", "radius-slider", 0, 1, 0.01, 0.5);
            break;
        case "dorogovtsev_goltsev_mendes_graph":
            // No additional sliders needed
            break;
        case "power_law_tree":
            createSlider(slidersDiv, "Attachment Exponent", "exponent-slider", 2, 5, 0.1, 2.5);
            break;
        // Add cases for neural network topologies if needed
        default:
            break;
    }
}

// Function to create a slider
function createSlider(parent, label, id, min, max, step, value) {
    const container = document.createElement("div");
    container.classList.add("slider-container");

    const labelElement = document.createElement("label");
    labelElement.setAttribute("for", id);
    labelElement.textContent = label;
    container.appendChild(labelElement);

    const slider = document.createElement("input");
    slider.setAttribute("type", "range");
    slider.setAttribute("id", id);
    slider.setAttribute("min", min);
    slider.setAttribute("max", max);
    slider.setAttribute("step", step);
    slider.setAttribute("value", value);
    container.appendChild(slider);

    const output = document.createElement("output");
    output.setAttribute("for", id);
    output.textContent = value;
    container.appendChild(output);

    slider.addEventListener("input", function() {
        output.textContent = this.value;
    });

    parent.appendChild(container);
}

// Function to create and draw the selected network topology
function createNetwork(network) {
    const numNodes = parseInt(document.getElementById("nodes-slider").value, 10);

    nodes = [];
    edges = [];

    switch (network) {
        case "complete_graph":
            createCompleteGraph(numNodes);
            break;
        case "cycle_graph":
            createCycleGraph(numNodes);
            break;
        case "path_graph":
            createPathGraph(numNodes);
            break;
        case "star_graph":
            createStarGraph(numNodes);
            break;
        case "wheel_graph":
            createWheelGraph(numNodes);
            break;
        case "ladder_graph":
            createLadderGraph(numNodes);
            break;
        case "clique_graph":
            createCliqueGraph(numNodes);
            break;
        case "circular_ladder_graph":
            createCircularLadderGraph(numNodes);
            break;
        case "krackhardt_kite_graph":
            createKrackhardtKiteGraph(numNodes);
            break;
        case "lollipop_graph":
            createLollipopGraph(numNodes);
            break;
        case "petersen_graph":
            createPetersenGraph(numNodes);
            break;
        case "grid_graph":
            const numRows = parseInt(document.getElementById("rows-slider").value, 10);
            const numCols = parseInt(document.getElementById("cols-slider").value, 10);
            createGridGraph(numRows, numCols);
            break;
        case "erdos_renyi_graph":
            const probability = parseFloat(document.getElementById("probability-slider").value);
            createErdosRenyiGraph(numNodes, probability);
            break;
        case "barabasi_albert_graph":
            const edgesToAttach = parseInt(document.getElementById("edges-slider").value, 10);
            createBarabasiAlbertGraph(numNodes, edgesToAttach);
            break;
        case "watts_strogatz_graph":
            const nearestNeighbors = parseInt(document.getElementById("neighbors-slider").value, 10);
            const rewiringProbability = parseFloat(document.getElementById("rewiring-slider").value);
            createWattsStrogatzGraph(numNodes, nearestNeighbors, rewiringProbability);
            break;
        case "random_regular_graph":
            const degree = parseInt(document.getElementById("degree-slider").value, 10);
            createRandomRegularGraph(numNodes, degree);
            break;
        case "balanced_tree":
            const branchingFactor = parseInt(document.getElementById("branching-slider").value, 10);
            const height = parseInt(document.getElementById("height-slider").value, 10);
            createBalancedTree(branchingFactor, height);
            break;
        case "hypercube_graph":
            const dimensions = parseInt(document.getElementById("dimensions-slider").value, 10);
            createHypercubeGraph(dimensions);
            break;
        case "random_geometric_graph":
            const radius = parseFloat(document.getElementById("radius-slider").value);
            createRandomGeometricGraph(numNodes, radius);
            break;
        case "dorogovtsev_goltsev_mendes_graph":
            createDorogovtsevGoltsevMendesGraph(numNodes);
            break;
        case "power_law_tree":
            const exponent = parseFloat(document.getElementById("exponent-slider").value);
            createPowerLawTree(numNodes, exponent);
            break;
        default:
            break;
    }

    drawNodes();
    drawEdges();
    updateDegreeDistribution();
}

// Define functions to create each type of graph topology
function createCompleteGraph(numNodes) {
    for (let i = 1; i <= numNodes; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
    }
    for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
            edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[j] });
        }
    }
}

function createCycleGraph(numNodes) {
    for (let i = 1; i <= numNodes; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
    }
    for (let i = 0; i < numNodes; i++) {
        edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[(i + 1) % numNodes] });
    }
}

function createPathGraph(numNodes) {
    for (let i = 1; i <= numNodes; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
    }
    for (let i = 0; i < numNodes - 1; i++) {
        edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[i + 1] });
    }
}

function createStarGraph(numNodes) {
    for (let i = 1; i <= numNodes; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
    }
    for (let i = 1; i < numNodes; i++) {
        edges.push({ id: `e${edges.length + 1}`, source: nodes[0], target: nodes[i] });
    }
}

function createWheelGraph(numNodes) {
    createCycleGraph(numNodes - 1);
    nodes.push({ id: numNodes, x: Math.random() * 600, y: Math.random() * 600 });
    for (let i = 0; i < numNodes - 1; i++) {
        edges.push({ id: `e${edges.length + 1}`, source: nodes[numNodes - 1], target: nodes[i] });
    }
}

function createLadderGraph(numNodes) {
    for (let i = 1; i <= numNodes; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
    }
    for (let i = 0; i < numNodes / 2 - 1; i++) {
        edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[i + 1] });
        edges.push({ id: `e${edges.length + 1}`, source: nodes[i + numNodes / 2], target: nodes[i + numNodes / 2 + 1] });
        edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[i + numNodes / 2] });
    }
}

function createCliqueGraph(numNodes) {
    createCompleteGraph(numNodes);
}

function createCircularLadderGraph(numNodes) {
    createLadderGraph(numNodes);
    edges.push({ id: `e${edges.length + 1}`, source: nodes[0], target: nodes[numNodes / 2] });
    edges.push({ id: `e${edges.length + 1}`, source: nodes[numNodes / 2 - 1], target: nodes[numNodes - 1] });
}

function createKrackhardtKiteGraph(numNodes) {
    // Placeholder function, should be implemented based on the specific graph structure
}

function createLollipopGraph(numNodes) {
    createCliqueGraph(Math.floor(numNodes / 2));
    createPathGraph(Math.ceil(numNodes / 2));
    for (let i = Math.floor(numNodes / 2); i < numNodes - 1; i++) {
        edges.push({ id: `e${edges.length + 1}`, source: nodes[Math.floor(numNodes / 2) - 1], target: nodes[i] });
    }
}

function createPetersenGraph(numNodes) {
    // Placeholder function, should be implemented based on the specific graph structure
}

function createGridGraph(numRows, numCols) {
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            nodes.push({ id: i * numCols + j + 1, x: j * 50 + Math.random() * 10, y: i * 50 + Math.random() * 10 });
            if (i > 0) edges.push({ id: `e${edges.length + 1}`, source: nodes[(i - 1) * numCols + j], target: nodes[i * numCols + j] });
            if (j > 0) edges.push({ id: `e${edges.length + 1}`, source: nodes[i * numCols + j - 1], target: nodes[i * numCols + j] });
        }
    }
}

function createErdosRenyiGraph(numNodes, probability) {
    for (let i = 1; i <= numNodes; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
    }
    for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
            if (Math.random() < probability) {
                edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[j] });
            }
        }
    }
}

function createBarabasiAlbertGraph(numNodes, edgesToAttach) {
    for (let i = 1; i <= edgesToAttach; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
    }
    for (let i = 0; i < edgesToAttach; i++) {
        for (let j = i + 1; j < edgesToAttach; j++) {
            edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[j] });
        }
    }
    for (let i = edgesToAttach + 1; i <= numNodes; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
        let targets = [];
        while (targets.length < edgesToAttach) {
            let target = nodes[Math.floor(Math.random() * (i - 1))];
            if (!targets.includes(target)) targets.push(target);
        }
        targets.forEach(target => {
            edges.push({ id: `e${edges.length + 1}`, source: nodes[i - 1], target: target });
        });
    }
}

function createWattsStrogatzGraph(numNodes, nearestNeighbors, rewiringProbability) {
    for (let i = 1; i <= numNodes; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
    }
    for (let i = 0; i < numNodes; i++) {
        for (let j = 1; j <= nearestNeighbors / 2; j++) {
            let target = (i + j) % numNodes;
            edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[target] });
            if (Math.random() < rewiringProbability) {
                let newTarget = Math.floor(Math.random() * numNodes);
                if (newTarget !== i && !edges.some(edge => (edge.source.id === i + 1 && edge.target.id === newTarget + 1) || (edge.source.id === newTarget + 1 && edge.target.id === i + 1))) {
                    edges.pop();
                    edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[newTarget] });
                }
            }
        }
    }
}

function createRandomRegularGraph(numNodes, degree) {
    // Placeholder function, should be implemented based on the specific graph structure
}

function createBalancedTree(branchingFactor, height) {
    let id = 1;
    function addChildren(parentId, level) {
        if (level >= height) return;
        for (let i = 0; i < branchingFactor; i++) {
            let childId = id++;
            nodes.push({ id: childId, x: Math.random() * 600, y: Math.random() * 600 });
            edges.push({ id: `e${edges.length + 1}`, source: nodes[parentId - 1], target: nodes[childId - 1] });
            addChildren(childId, level + 1);
        }
    }
    nodes.push({ id: id++, x: Math.random() * 600, y: Math.random() * 600 });
    addChildren(1, 0);
}

function createHypercubeGraph(dimensions) {
    let numNodes = Math.pow(2, dimensions);
    for (let i = 0; i < numNodes; i++) {
        nodes.push({ id: i + 1, x: Math.random() * 600, y: Math.random() * 600 });
        for (let j = 0; j < dimensions; j++) {
            let neighbor = i ^ (1 << j);
            if (neighbor < i) continue;
            edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[neighbor] });
        }
    }
}

function createRandomGeometricGraph(numNodes, radius) {
    for (let i = 1; i <= numNodes; i++) {
        nodes.push({ id: i, x: Math.random() * 600, y: Math.random() * 600 });
    }
    for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
            let dx = nodes[i].x - nodes[j].x;
            let dy = nodes[i].y - nodes[j].y;
            if (Math.sqrt(dx * dx + dy * dy) <= radius * 600) {
                edges.push({ id: `e${edges.length + 1}`, source: nodes[i], target: nodes[j] });
            }
        }
    }
}

function createDorogovtsevGoltsevMendesGraph(numNodes) {
    // Placeholder function, should be implemented based on the specific graph structure
}

function createPowerLawTree(numNodes, exponent) {
    // Placeholder function, should be implemented based on the specific graph structure
}

