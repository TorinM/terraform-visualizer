document.addEventListener('DOMContentLoaded', () => {
    let rawData;

    const fetchData = () => {
        fetch('/data')
            .then(response => response.json())
            .then(data => {
                rawData = data; // Store the fetched data
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
        const container = document.getElementById('visualization');
        const width = container.clientWidth;
        const height = container.clientHeight;

        d3.select(".loading").remove(); // Remove loading symbol

        const svg = d3.select("#visualization")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%");

        const links = data.links.map(link => ({
            source: data.nodes.find(node => node.address === link.source_addr),
            target: data.nodes.find(node => node.address === link.target_addr)
        }));

        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(links).id(d => d.address).distance(50))
            .force("charge", d3.forceManyBody().strength(-50))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(30).strength(0.7))
            .force("boundary", boundaryForce(data, 0, 0, width, height))
            .on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                node
                    .attr("transform", d => `translate(${d.x},${d.y})`);
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
            .attr("fill", d => d.mode === "data" ? "green" : d.mode === "managed" ? "blue" : "gray");

        node.append("title")
            .text(d => d.address);

        // Tooltip for displaying node data
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "#f9f9f9")
            .style("padding", "10px")
            .style("border", "1px solid #d3d3d3")
            .style("border-radius", "5px")
            .style("pointer-events", "none")
            .style("opacity", 0);

        // Function to pretty print JSON
        const prettyPrintJSON = (nodeData) => {
            let html = '<pre>';
            const clonedData = JSON.parse(JSON.stringify(nodeData));
            const cleanedData = JSON.stringify(stripDataFromNode(clonedData), null, 2);
            html += cleanedData.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += '</pre>';
            return html;
        };

        node.on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`<strong>Node Data:</strong><br/>${prettyPrintJSON(d)}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
            d3.select(event.currentTarget).select("circle").attr("r", 16);
        })
        .on("mouseout", (event, d) => {
            tooltip.transition().duration(500).style("opacity", 0);
            d3.select(event.currentTarget).select("circle").attr("r", 8);
        });

        const outputList = d3.select(".output").html("").append("ul");
        data.outputs.forEach(output => {
            const listItem = outputList.append("li");
            listItem.append("span").attr("class", "key").text(output.name);
            listItem.append("span").attr("class", "value").text(output.value);
        });
    };

    const boundaryForce = (data, x0, y0, x1, y1) => {
        return (alpha) => {
            for (let i = 0, n = data.nodes.length; i < n; ++i) {
                const node = data.nodes[i];
                node.x = Math.max(x0, Math.min(x1, node.x));
                node.y = Math.max(y0, Math.min(y1, node.y));
            }
        };
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            const copyButton = document.getElementById('copyButton');
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy JSON';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const stripDataFromNode = (nodeData) => {
        // Deep clone the data object to avoid modifying the original data
        delete nodeData.x;
        delete nodeData.y;
        delete nodeData.vx;
        delete nodeData.vy;
        delete nodeData.fx;
        delete nodeData.fy;
        delete nodeData.index;
        return nodeData;
    };

    document.getElementById('copyButton').addEventListener('click', () => {
        if (rawData) {
            const clonedData = JSON.parse(JSON.stringify(rawData));
            clonedData.nodes.forEach(node => {
                stripDataFromNode(node);
            });
            copyToClipboard(JSON.stringify(clonedData, null, 2));
        } else {
            alert('No data to copy');
        }
    });

    fetchData(); // Initial fetch
});