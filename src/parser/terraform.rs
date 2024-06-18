use serde_json::Value;
use std::error::Error;

use super::types;

fn get_outputs(outputs: &serde_json::Value) -> Result<Vec<types::Output>, Box<dyn Error>> {
    let mut output_vec: Vec<types::Output> = Vec::new();
    for (key, value) in outputs.as_object().ok_or("outputs field is not a valid JSON object")? {
        let output = types::Output {
            name: key.clone(),
            value: value.get("value").ok_or("Missing value field")?.to_string(),
            sensitive: value.get("sensitive").ok_or("Missing sensitive field")?.as_bool().ok_or("resources field is not a boolean")?,
        };
        output_vec.push(output);
    }
    Ok(output_vec)
}


fn get_nodes(json: &serde_json::Value) -> Result<Vec<types::Node>, Box<dyn Error>> {
    let mut nodes: Vec<types::Node> = Vec::new();
    let resources = json.get("resources").ok_or("Missing resources field")?.as_array().ok_or("resources field is not an array")?;
    for resource in resources {
        let node = types::Node::new(resource);
        nodes.push(node);
    }
    Ok(nodes)
}


fn get_links(json: &serde_json::Value) -> Result<Vec<types::Link>, Box<dyn Error>> {
    let mut links: Vec<types::Link> = Vec::new();
    let resources = json.get("resources").ok_or("Missing resources field")?.as_array().ok_or("resources field is not an array")?;

    for resource in resources {
        let source_addr = resource.get("address").ok_or("Missing address field")?.to_string();

        let depends_on = match resource.get("depends_on") {
            Some(depends_on) => depends_on.as_array().ok_or("depends_on field is not an array")?,
            None => { continue; }
        };
        for depend in depends_on {
            let target_addr = depend.to_string();
            let link: types::Link = types::Link::new(source_addr.clone(), target_addr);
            links.push(link);
        }
    }
    Ok(links)
}


fn convert_graph_to_json_string(nodes: Vec<types::Node>, links: Vec<types::Link>, outputs: Vec<types::Output>) -> Result<String, serde_json::Error> {
    let graph = types::Graph {
        nodes,
        links,
        outputs,
    };
    serde_json::to_string(&graph)
}


pub fn parse_terraform(json_data: &Value) -> Result<String, Box<dyn Error>> {
    let values = json_data.get("values").ok_or("Missing values field")?;
    let outputs = values.get("outputs").ok_or("Missing outputs field")?;
    let resources = values.get("root_module").ok_or("Missing root_module field")?.get("resources").ok_or("Missing resources field")?;

    let nodes: Vec<types::Node> = get_nodes(resources)?;
    let links: Vec<types::Link> = get_links(resources)?;
    let outputs: Vec<types::Output> = get_outputs(outputs)?;

    match convert_graph_to_json_string(nodes, links, outputs) {
        Ok(json_string) => Ok(json_string),
        Err(e) => {
            Err(Box::new(e))
        }
    }
}
