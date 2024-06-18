document.addEventListener('DOMContentLoaded', () => {
    const fetchData = () => {
        fetch('/data')
            .then(response => response.json())
            .then(data => {
                console.log("Fetched Data:", data);

                if (!data) throw new Error("No data fetched");
                if (!Array.isArray(data.nodes)) throw new Error("Invalid data format: nodes");
                if (!Array.isArray(data.links)) throw new Error("Invalid data format: links");
                if (!Array.isArray(data.outputs)) throw new Error("Invalid data format: outputs");

                const nodeAddresses = new Set(data.nodes.map(node => node.address));
                data.links.forEach(link => {
                    if (!nodeAddresses.has(link.source_addr)) console.error(`Invalid source address in link: ${link.source_addr}`);
                    if (!nodeAddresses.has(link.target_addr)) console.error(`Invalid target address in link: ${link.target_addr}`);
                });

                renderVisualization(data);
            })
            .catch(error => {
                console.error("Error fetching or processing data:", error);
            });
    };

    const renderVisualization = (data) => {
        const width = 960;
        const height = 600;

        d3.select(".loading").remove(); // Remove loading symbol

        const svg = d3.select("#visualization")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const links = data.links.map(link => ({
            source: data.nodes.find(node => node.address === link.source_addr),
            target: data.nodes.find(node => node.address === link.target_addr)
        }));

        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(links).id(d => d.address).distance(100))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                node
                    .attr("transform", d => `translate(${d.x},${d.y})`);
            })
            .on("end", () => {
                // Fix positions after the initial layout
                data.nodes.forEach(node => {
                    node.fx = node.x;
                    node.fy = node.y;
                });
            });

        const link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => Math.sqrt(d.value));

        const node = svg.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(data.nodes)
            .enter().append("g")
            .attr("class", "node");

        node.append("circle")
            .attr("r", 8)
            .attr("fill", "blue");

        node.append("title")
            .text(d => d.address);

        node.append("text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(d => d.address);

        const outputList = d3.select(".output").html("").append("ul");
        data.outputs.forEach(output => {
            outputList.append("li").text(`${output.name}: ${output.value}`);
        });
    };

    fetchData(); // Initial fetch
});