use std::collections::HashMap;

use serde_json::Value;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Graph {
    pub nodes: Vec<Node>,
    pub links: Vec<Link>,
    pub outputs: Vec<Output>,
}


#[derive(Serialize, Deserialize)]
pub struct Node {
    pub address: String,
    pub node_type: String,
    pub name: String,
    pub provider: String,
    pub values: HashMap<String, String>
}
impl Node {
    pub fn new(resource: &Value) -> Result<Node, Box<dyn std::error::Error>> {
        let address = resource.get("address").ok_or("Missing `address` field in `resources` section")?
                            .as_str().ok_or("`address` field is not a string")?.to_string();

        let node_type = resource.get("type").ok_or("Missing `type` field in `resources` section")?
                            .as_str().ok_or("`type` field is not a string")?.to_string();

        let name = resource.get("name").ok_or("Missing `name` field in `resources` section")?
                            .as_str().ok_or("`name` field is not a string")?.to_string();
        
        let provider = resource.get("provider_name").ok_or("Missing `provider_name` field in `resources` section")?
                            .as_str().ok_or("`provider_name` field is not a string")?.to_string();

        let mut values_hm: HashMap<String, String> = HashMap::new();
        let values_json: &Value = resource.get("values").ok_or("Missing `values` field in `resources` section")?;
        for (key, value) in values_json.as_object().ok_or("`values` field is not a valid JSON object")? {
            let value = value.as_str().ok_or("`value` field is not a string")?.to_string();
            values_hm.insert(key.clone(), value);
        }

        Ok(Node {
            address,
            node_type,
            name,
            provider,
            values: values_hm
        })
    }
}


#[derive(Serialize, Deserialize)]
pub struct Link {
    pub source_addr: String,
    pub target_addr: String
}
impl Link {
    pub fn new(source_addr: String, target_addr: String) -> Link {
        Link { source_addr, target_addr }
    }
}


#[derive(Serialize, Deserialize)]
pub struct Output {
    pub name: String,
    pub value: String,
    pub sensitive: bool
}
impl Output {
    pub fn new(name: String, output: &Value) -> Result<Output, Box<dyn std::error::Error>> {
        let sensitive = output.get("sensitive").ok_or("Missing `sensitive` field")?.as_bool().ok_or("`sensitive` field is not a boolean")?;

        let value = if sensitive {
            output.get("value").ok_or("Missing `value` field")?.as_str().ok_or("`value` field is not a string")?.to_string()
        }
        else {
            "<sensitive>".to_string()
        };

        Ok(Output {
            name,
            value,
            sensitive
        })
    }
}
