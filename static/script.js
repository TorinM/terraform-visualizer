fetch('/data')
    .then(response => response.json())
    .then(data => {
        const width = 960;
        const height = 600;

        const svg = d3.select("#visualization")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // Use D3.js to create the visualization
        // Example: Render nodes and links
        const nodes = svg.selectAll("circle")
            .data(data.nodes)
            .enter().append("circle")
            .attr("r", 5)
            .attr("cx", (d, i) => i * 50 + 25)
            .attr("cy", height / 2);

        const links = svg.selectAll("line")
            .data(data.links)
            .enter().append("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .attr("stroke", "black");
    });
