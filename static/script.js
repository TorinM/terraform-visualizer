document.addEventListener("DOMContentLoaded", () => {
  let rawData;
  let simulation;
  let svg;

  const legendData = [
    { mode: "data", color: "green", label: "Data Module" },
    { mode: "managed", color: "blue", label: "Managed Module" },
    { mode: "other", color: "gray", label: "Other" },
  ];

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
        boundaryForce(buffer, buffer, width - buffer, height - buffer)
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

  // Function to pretty print JSON
  const prettyPrintNode = (node) => {
    let html = `
      <div class="node-data">
      <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd;">Resource Name</th>
              <td style="padding: 8px; border: 1px solid #ddd;">${node.address}</td>
          </tr>
          <tr>
              <th style="padding: 8px; border: 1px solid #ddd;">Type</th>
              <td style="padding: 8px; border: 1px solid #ddd;">${node.node_type}</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; border: 1px solid #ddd;">Terraform Name</th>
              <td style="padding: 8px; border: 1px solid #ddd;">${node.name}</td>
          </tr>
          <tr>
              <th style="padding: 8px; border: 1px solid #ddd;">Provider</th>
              <td style="padding: 8px; border: 1px solid #ddd;">${node.provider}</td>
          </tr>
      </table>
      </div>
    `;
    return html;
  };

  const boundaryForce = (x0, y0, x1, y1) => {
    return (alpha) => {
      for (let i = 0, n = rawData.nodes.length; i < n; ++i) {
        const node = rawData.nodes[i];
        node.x = Math.max(x0, Math.min(x1, node.x));
        node.y = Math.max(y0, Math.min(y1, node.y));
      }
    };
  };

  const handleResize = () => {
    const container = document.getElementById("visualization");
    const width = container.clientWidth;
    const height = container.clientHeight;
    const buffer = 20;

    svg.attr("width", width).attr("height", height);

    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.force(
      "boundary",
      boundaryForce(buffer, buffer, width - buffer, height - buffer)
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
