document.addEventListener("DOMContentLoaded", () => {
  let rawData;
  let simulation;
  let svg;

  const fetchData = () => {
    fetch("/data")
      .then((response) => response.json())
      .then((data) => {
        rawData = data; // Store the fetched data
        console.log("Fetched Data:", data);

        if (!data) throw new Error("No data fetched");
        if (!Array.isArray(data.nodes))
          throw new Error("Invalid data format: nodes");
        if (!Array.isArray(data.links))
          throw new Error("Invalid data format: links");
        if (!Array.isArray(data.outputs))
          throw new Error("Invalid data format: outputs");

        const nodeAddresses = new Set(data.nodes.map((node) => node.address));
        data.links.forEach((link) => {
          if (!nodeAddresses.has(link.source_addr))
            console.error(
              `Invalid source address in link: ${link.source_addr}`
            );
          if (!nodeAddresses.has(link.target_addr))
            console.error(
              `Invalid target address in link: ${link.target_addr}`
            );
        });

        renderVisualization(data);
        renderOutputs(data.outputs);
      })
      .catch((error) => {
        console.error("Error fetching or processing data:", error);
      });
  };

  const renderVisualization = (data) => {
    const container = document.getElementById("visualization");
    const width = container.clientWidth;
    const height = container.clientHeight;
    const buffer = 20; // Buffer space to keep nodes fully visible within the boundary

    d3.select(".loading").remove(); // Remove loading symbol

    svg = d3
      .select("#visualization")
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%");

    const links = data.links.map((link) => ({
      source: data.nodes.find((node) => node.address === link.source_addr),
      target: data.nodes.find((node) => node.address === link.target_addr),
    }));

    const legendWidth = document.getElementById("legend").offsetWidth + 20;
    const legendHeight = document.getElementById("legend").offsetHeight + 20;

    simulation = d3
      .forceSimulation(data.nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.address)
          .distance(50)
      )
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30).strength(0.7))
      .force(
        "boundary",
        boundaryForce(
          buffer,
          buffer,
          width - buffer,
          height - buffer,
          legendWidth,
          legendHeight
        )
      )
      .on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });

    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.value));

    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter()
      .append("g")
      .attr("class", "node");

    node
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d) =>
        d.mode === "data" ? "green" : d.mode === "managed" ? "blue" : "gray"
      );

    node.append("title").text((d) => d.address);

    // Tooltip for displaying node data
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#f9f9f9")
      .style("padding", "10px")
      .style("border", "1px solid #d3d3d3")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    node
      .on("mouseover", (event, d) => {
        tooltipVisible = true;
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(prettyPrintNode(d));

        // Calculate tooltip position
        const tooltipWidth = tooltip.node().offsetWidth;
        const tooltipHeight = tooltip.node().offsetHeight;
        let left = event.pageX + 10;
        let top = event.pageY + 10;

        // Ensure the tooltip does not go off the right edge of the window
        if (left + tooltipWidth > window.innerWidth) {
          left = window.innerWidth - tooltipWidth - 10;
        }

        // Ensure the tooltip does not go off the bottom edge of the window
        if (top + tooltipHeight > window.innerHeight) {
          top = window.innerHeight - tooltipHeight - 10;
        }

        tooltip.style("left", `${left}px`).style("top", `${top}px`);
        d3.select(event.currentTarget).select("circle").attr("r", 16);
      })
      .on("mouseout", (event, d) => {
        tooltipVisible = false;
        setTimeout(() => {
          if (!tooltipVisible) {
            tooltip.transition().duration(500).style("opacity", 0);
          }
        }, 300); // Delay to account for the user moving the mouse to the tooltip
        d3.select(event.currentTarget).select("circle").attr("r", 8);
      });
  };

  const boundaryForce = (x0, y0, x1, y1, legendWidth, legendHeight) => {
    return (alpha) => {
      for (let i = 0, n = rawData.nodes.length; i < n; ++i) {
        const node = rawData.nodes[i];
        if (node.x < x0 + legendWidth && node.y < y0 + legendHeight) {
          node.x = x0 + legendWidth;
          node.y = y0 + legendHeight;
        } else {
          node.x = Math.max(x0, Math.min(x1, node.x));
          node.y = Math.max(y0, Math.min(y1, node.y));
        }
      }
    };
  };

  const handleResize = () => {
    const container = document.getElementById("visualization");
    const width = container.clientWidth;
    const height = container.clientHeight;
    const buffer = 20;

    svg.attr("width", width).attr("height", height);

    const legendWidth = document.getElementById("legend").offsetWidth;
    const legendHeight = document.getElementById("legend").offsetHeight;

    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.force(
      "boundary",
      boundaryForce(
        buffer,
        buffer,
        width - buffer,
        height - buffer,
        legendWidth,
        legendHeight
      )
    );
    simulation.alpha(1).restart(); // Restart the simulation to apply the new forces
  };

  window.addEventListener("resize", handleResize);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      const copyButton = document.getElementById("copyButton");
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy JSON";
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const stripDataFromNode = (nodeData) => {
    delete nodeData.x;
    delete nodeData.y;
    delete nodeData.vx;
    delete nodeData.vy;
    delete nodeData.fx;
    delete nodeData.fy;
    delete nodeData.index;
    return nodeData;
  };

  const prettyPrintNode = (node) => {
    const nodeTemplate = document.getElementById("node-template").content.cloneNode(true);

    nodeTemplate.querySelector(".node-address").textContent = node.address;
    nodeTemplate.querySelector(".node-type").textContent = node.node_type;
    nodeTemplate.querySelector(".node-name").textContent = node.name;
    nodeTemplate.querySelector(".node-provider").textContent = node.provider;

    return nodeTemplate.querySelector(".node-data").outerHTML;
  };

  const renderOutputs = (outputs) => {
    // Get the container where outputs will be displayed.
    const outputContainer = document.querySelector(".output-container");
    
    // Get the template's content which is predefined in the HTML.
    const template = document.getElementById("output-template").content;
    
    // Clear the output container to ensure it doesn't contain previous entries.
    // outputContainer.innerHTML = "";
    
    // Loop through each output data item provided to the function.
    outputs.forEach((output) => {
        // Clone the template node. 'true' means it will clone the node and its content.
        const outputClone = document.importNode(template, true);
        
        // Populate the cloned template with actual output data.
        // These selectors match the classes specified within the <template> in HTML.
        outputClone.querySelector(".output-name").textContent = `Name: ${output.name}`;
        outputClone.querySelector(".output-value").textContent = `Value: ${output.value}`;
        outputClone.querySelector(".output-sensitive").textContent = `Sensitive: ${output.sensitive ? 'Yes' : 'No'}`;
        
        // Append the populated clone to the output container in the DOM.
        outputContainer.appendChild(outputClone);
    });
  };

  document.getElementById("copyButton").addEventListener("click", () => {
    if (rawData) {
      const clonedData = JSON.parse(JSON.stringify(rawData));
      clonedData.nodes.forEach((node) => {
        stripDataFromNode(node);
      });
      copyToClipboard(JSON.stringify(clonedData, null, 2));
    } else {
      alert("No data to copy");
    }
  });

  fetchData(); // Initial fetch
});
