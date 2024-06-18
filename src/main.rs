use warp::Filter;

use std::sync::Arc;

mod input;
mod parser;

#[tokio::main]
async fn main() {
    let file_path = match input::get_file_path()
    {
        Ok(path) => Arc::new(path),
        Err(e) => {
            eprintln!("{}", e);
            return;
        }
    };

    let static_files = warp::fs::dir("static");

    let data = 
    {
        let file_path = file_path.clone();
        warp::path("data")
            .map(move || {
                let file_path = Arc::clone(&file_path);
                match input::read_input(&file_path) {
                    Ok(json_data_raw) => {
                        match parser::terraform::parse_terraform(&json_data_raw)
                        {
                            Ok(data) => warp::reply::json(&data),
                            Err(e) => {
                                eprintln!("Fatal error parsing input. Message: {}", e);
                                warp::reply::json(&serde_json::json!({"error": "Error parsing input file"}))
                            }
                        }
                    },
                    Err(e) => {
                        eprintln!("Fatal error reading input. Message: {}", e);
                        return warp::reply::json(&serde_json::json!({"error": "Error reading input file"}));
                    }
                }
            })
    };

    let routes = static_files.or(data);

    // Start the server
    println!("Server started at http://127.0.0.1:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await
}
