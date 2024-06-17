pub struct Node {
    pub address: String,
    
}

pub struct Link {
    pub source: Node,
    pub target: Node,   
}

pub struct Output {
    pub name: String,
    pub value: String,
    pub sensitive: bool
}