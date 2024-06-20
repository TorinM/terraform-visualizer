use std::collections::HashMap;

use serde_json::Value;
use serde::{Deserialize, Serialize};

fn parse_terraform_value(value: &Value) -> String {
    match value {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Array(a) => {
            let mut array_str = String::from("[");
            for (i, v) in a.iter().enumerate() {
                array_str.push_str(&parse_terraform_value(v));
                if i < a.len() - 1 {
                    array_str.push_str(", ");
                }
            }
            array_str.push_str("]");
            array_str
        },
        Value::Object(o) => {
            let mut object_str = String::from("{");
            for (i, (k, v)) in o.iter().enumerate() {
                object_str.push_str(&format!("\"{}\": {}", k, parse_terraform_value(v)));
                if i < o.len() - 1 {
                    object_str.push_str(", ");
                }
            }
            object_str.push_str("}");
            object_str
        },
        Value::Null => "null".to_string(),
    }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Graph {
    pub nodes: Vec<Node>,
    pub links: Vec<Link>,
    pub outputs: Vec<Output>,
}
impl Graph {
    #[allow(dead_code)]
    pub fn to_json_string(&self) -> String {
        serde_json::to_string(&self).unwrap()
    }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub address: String,
    pub node_type: String,
    pub name: String,
    pub provider: String,
    pub mode: String,
    pub values: HashMap<String, String>,
}
impl Node {
    pub fn new(resource: &Value) -> Result<Node, Box<dyn std::error::Error>> {
        let address = resource.get("address").ok_or("Missing `address` field")?
            .as_str().ok_or("`address` field is not a string")?.to_string();
        let node_type = resource.get("type").ok_or("Missing `type` field")?
            .as_str().ok_or("`type` field is not a string")?.to_string();
        let name = resource.get("name").ok_or("Missing `name` field")?
            .as_str().ok_or("`name` field is not a string")?.to_string();
        let provider = resource.get("provider_name").ok_or("Missing `provider_name` field")?
            .as_str().ok_or("`provider_name` field is not a string")?.to_string();
        let mode = resource.get("mode").ok_or("Missing `mode` field")?
            .as_str().ok_or("`mode` field is not a string")?.to_string();

        let mut values_hm: HashMap<String, String> = HashMap::new();
        let values_json: &Value = resource.get("values").ok_or("Missing `values` field")?;
        for (key, value) in values_json.as_object().ok_or("`values` field is not a valid JSON object")? {
            let value = parse_terraform_value(value);
    
            values_hm.insert(key.clone(), value);
        }

        Ok(Node {
            address,
            node_type,
            name,
            provider,
            mode,
            values: values_hm,
        })
    }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Link {
    pub source_addr: String,
    pub target_addr: String,
}
impl Link {
    pub fn new(source_addr: String, target_addr: String) -> Link {
        Link { source_addr, target_addr }
    }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Output {
    pub name: String,
    pub value: String,
    pub sensitive: bool,
}
impl Output {
    pub fn new(name: String, output: &Value) -> Result<Output, Box<dyn std::error::Error>> {
        let sensitive = output.get("sensitive").ok_or("Missing `sensitive` field")?
            .as_bool().ok_or("`sensitive` field is not a boolean")?;

        let value = if sensitive {
            "<sensitive>".to_string()
        } else {
            output.get("value").ok_or("Missing `value` field")?
                .as_str().ok_or("`value` field in `output` is not a string")?.to_string()
        };

        Ok(Output {
            name,
            value,
            sensitive,
        })
    }
}
