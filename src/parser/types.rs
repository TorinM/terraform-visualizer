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
    pub fn new(resource: &Value) -> Node {
        let address = resource.get("address").unwrap().to_string();
        let node_type = resource.get("type").unwrap().to_string();
        let name = resource.get("name").unwrap().to_string();
        let provider = resource.get("provider").unwrap().to_string();

        let mut values_hm: HashMap<String, String> = HashMap::new();
        let values_json: &Value = resource.get("provider").unwrap();
        for (key, value) in values_json.as_object().unwrap() {
            let value = value.to_string();
            values_hm.insert(key.clone(), value);
        }

        Node {
            address,
            node_type,
            name,
            provider,
            values: values_hm
        }
    }
}


#[derive(Serialize, Deserialize)]
pub struct Link {
    pub source: String,
    pub target: String
}
impl Link {
    pub fn new(source: String, target: String) -> Link {
        Link {
            source,
            target
        }
    }
}


#[derive(Serialize, Deserialize)]
pub struct Output {
    pub name: String,
    pub value: String,
    pub sensitive: bool
}
impl Output {
    pub fn new(output: &Value) -> Output {
        let name = output.get("name").unwrap().to_string();
        let sensitive = output.get("sensitive").unwrap().as_bool().unwrap();

        let value = if sensitive {
            output.get("value").unwrap().to_string()
        }
        else {
            "<sensitive>".to_string()
        };

        Output {
            name,
            value,
            sensitive
        }
    }
}
