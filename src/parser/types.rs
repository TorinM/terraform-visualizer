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
        let address = resource.get("address").ok_or("Missing address field")?.to_string();
        let node_type = resource.get("type").ok_or("Missing type field")?.to_string();
        let name = resource.get("name").ok_or("Missing name field")?.to_string();
        let provider = resource.get("provider").ok_or("Missing provider field")?.to_string();

        let mut values_hm: HashMap<String, String> = HashMap::new();
        let values_json: &Value = resource.get("values").ok_or("Missing values field")?;
        for (key, value) in values_json.as_object().ok_or("value field is not a valid JSON object")? {
            let value = value.to_string();
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
    pub source: String,
    pub target: String
}
impl Link {
    pub fn new(source: String, target: String) -> Link {
        Link { source, target }
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
        let sensitive = output.get("sensitive").ok_or("Missing sensitive field")?.as_bool().ok_or("sensitive field is not a boolean")?;

        let value = if sensitive {
            output.get("value").ok_or("Missing value field")?.to_string()
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
