use serde_json::{Map, Value};
use std::error::Error;

use super::types;

fn get_outputs(outputs: &Map<String, Value>) -> Result<Vec<types::Output>, Box<dyn Error>> {
    let mut output_vec: Vec<types::Output> = Vec::new();
    for (name, value) in outputs {
        let output = types::Output::new(name.clone(),value)?;
        output_vec.push(output);
    }
    Ok(output_vec)
}


fn get_nodes(resources: &Vec<Value>, is_root:bool) -> Result<Vec<types::Node>, Box<dyn Error>> {
    let mut nodes: Vec<types::Node> = Vec::new();
    for resource in resources {
        let node = types::Node::new(resource, is_root)?;
        nodes.push(node);
    }
    Ok(nodes)
}


fn get_links(resources: &Vec<Value>) -> Result<Vec<types::Link>, Box<dyn Error>> {
    let mut links: Vec<types::Link> = Vec::new();
    for resource in resources {
        let source_addr = resource.get("address").ok_or("Missing `address` field")?.as_str().ok_or("`address` field is not a string")?.to_string();

        let depends_on = match resource.get("depends_on") {
            Some(depends_on) => depends_on.as_array().ok_or("`depends_on` field is not an array")?,
            None => { continue; }
        };
        for depend in depends_on {
            let target_addr = depend.as_str().ok_or("value in `depends_on` field is not a string")?.to_string();
            let link: types::Link = types::Link::new(source_addr.clone(), target_addr);
            links.push(link);
        }
    }
    Ok(links)
}


pub fn parse_terraform(json_data: &Value) -> Result<types::Graph, Box<dyn Error>> {
    let values = json_data.get("values").ok_or("Missing top level `values` field")?;

    let mut resources= values.get("root_module")
                .ok_or("Missing `root_module` field")?
                .get("resources")
                .ok_or("Missing `resources` field")?
                .as_array()
                .ok_or("`resources` field is not an array")?
                .clone();

    let child_resources = match values.get("child_modules") {
        Some(child_resources) => child_resources.get("resources").ok_or("Missing `resources` field")?.as_array().ok_or("`resources` field is not an array")?.clone(),
        None => Vec::<Value>::new().clone()
    };

    let outputs = match values.get("outputs") {
        Some(outputs) => {
            let sanitized_outputs = outputs.as_object().ok_or("`outputs` field is not a valid JSON object")?;
            get_outputs(sanitized_outputs)?
        },
        None => Vec::<types::Output>::new()
    };

    let mut nodes: Vec<types::Node> = get_nodes(&resources, true)?;
    let child_nodes: Vec<types::Node> = get_nodes(&child_resources, false)?;
    nodes.extend(child_nodes);
    resources.extend(child_resources);

    let links: Vec<types::Link> = get_links(&resources)?;

    Ok(types::Graph {
        nodes,
        links,
        outputs,
    })
}
