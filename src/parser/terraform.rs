// let data = r#"{"nodes": [], "links": []}"#; // Example data

use super::types;

fn parse_outputs(outputs: &serde_json::Value) -> Vec<types::Output> {
    let mut output_vec: Vec<types::Output> = Vec::new();
    for (key, value) in outputs.as_object().unwrap() {
        let output = types::Output {
            name: key.clone(),
            value: value.get("value").unwrap().to_string(),
            sensitive: value.get("sensitive").unwrap().as_bool().unwrap(),
        };
        output_vec.push(output);
    }
    output_vec
}

pub fn get_nodes(json: &serde_json::Value) -> Vec<types::Node> {
    let mut nodes: Vec<types::Node> = Vec::new();
    let resources = json.get("resources").unwrap().as_array().unwrap();
    for resource in resources {
        let node = types::Node {
            address: resource.get("address").unwrap().to_string(),
        };
        nodes.push(node);
    }
    nodes
}

pub fn get_links(json: &serde_json::Value) -> Vec<types::Link> {
    let mut links: Vec<types::Link> = Vec::new();
    let resources = json.get("resources").unwrap().as_array().unwrap();
    for resource in resources {
        let source = types::Node {
            address: resource.get("address").unwrap().to_string(),
        };
        let target = types::Node {
            address: resource.get("address").unwrap().to_string(),
        };
        let link = types::Link {
            source: source,
            target: target,
        };
        links.push(link);
    }
    links
}


pub fn parse_terraform(json_data: &str) -> serde_json::Value {
    let json: serde_json::Value = serde_json::from_str(json_data).unwrap();

    let values = json.get("values").unwrap();

    let mut nodes: Vec<types::Node> = Vec::new();
    let mut links: Vec<types::Link> = Vec::new();
    let mut outputs: Vec<types::Output> = Vec::new();

    if let Some(output_key) = values.get("outputs") {
        outputs = parse_outputs(output_key);
    }

    json
}