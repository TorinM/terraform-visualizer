document.addEventListener('DOMContentLoaded', () => {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            // Log the entire fetched data to see its structure
            console.log("Fetched Data:", data);

            // Additional logging to see the specific parts of the data
            console.log("Nodes:", data.nodes);
            console.log("Links:", data.links);
            console.log("Outputs:", data.outputs);

            // Check if the necessary keys exist
            if (!data) {
                throw new Error("No data fetched");
            }
            if (!Array.isArray(data.nodes)) {
                console.error("data.nodes is missing or not an array");
                throw new Error("Invalid data format: nodes");
            }
            if (!Array.isArray(data.links)) {
                console.error("data.links is missing or not an array");
                throw new Error("Invalid data format: links");
            }
            if (!Array.isArray(data.outputs)) {
                console.error("data.outputs is missing or not an array");
                throw new Error("Invalid data format: outputs");
            }

            const nodeAddresses = new Set(data.nodes.map(node => node.address));
            console.log("Node Addresses Set:", nodeAddresses);

            data.links.forEach(link => {
                if (!nodeAddresses.has(link.source_addr)) {
                    console.error(`Invalid source address in link: ${link.source_addr}`);
                }
                if (!nodeAddresses.has(link.target_addr)) {
                    console.error(`Invalid target address in link: ${link.target_addr}`);
                }
            });

            const width = 960;
            const height = 600;

            const svg = d3.select("#visualization")
                .append("svg")
                .attr("width", width)
                .attr("height", height);

            // Map link addresses to node objects
            const links = data.links.map(link => ({
                source: data.nodes.find(node => node.address === link.source_addr),
                target: data.nodes.find(node => node.address === link.target_addr)
            }));

            // Create a force simulation
            const simulation = d3.forceSimulation(data.nodes)
                .force("link", d3.forceLink(links).id(d => d.address))
                .force("charge", d3.forceManyBody())
                .force("center", d3.forceCenter(width / 2, height / 2));

            // Create links
            const link = svg.append("g")
                .attr("class", "links")
                .selectAll("line")
                .data(links)
                .enter().append("line")
                .attr("stroke", "black");

            // Create nodes
            const node = svg.append("g")
                .attr("class", "nodes")
                .selectAll("circle")
                .data(data.nodes)
                .enter().append("circle")
                .attr("r", 5)
                .attr("fill", "blue");

            node.append("title")
                .text(d => d.name);

            // Update the simulation on each tick
            simulation
                .nodes(data.nodes)
                .on("tick", () => {
                    link
                        .attr("x1", d => d.source.x)
                        .attr("y1", d => d.source.y)
                        .attr("x2", d => d.target.x)
                        .attr("y2", d => d.target.y);

                    node
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y);
                });

            simulation.force("link").links(links);

            // Display outputs
            const outputList = d3.select(".output").append("ul");
            data.outputs.forEach(output => {
                outputList.append("li").text(`${output.name}: ${output.value}`);
            });
        })
        .catch(error => {
            console.error("Error fetching or processing data:", error);
        });
});