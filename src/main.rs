use warp::Filter;

mod input;
mod parser;

#[tokio::main]
async fn main() {
    // Serve static files from the "static" directory
    let static_files = warp::fs::dir("static");

    let file_path = match input::get_file_path(){
        Ok(path) => path,
        Err(e) => {
            eprintln!("Fatal getting file information. Message: {}", e);
            return;
        }
    };

    if let Err(e) = input::verify_file_exists(&file_path) {
        eprintln!("Fatal error verifying input. Message: {}", e);
        return;
    }

    let json_data_raw = match input::read_input(&file_path){
        Ok(json_data) => json_data,
        Err(e) => {
            eprintln!("Fatal error reading input. Message: {}", e);
            return;
        }
    };
    let json_data = match parser::terraform::parse_terraform(&json_data_raw)
    {
        Ok(json_data) => json_data,
        Err(e) => {
            eprintln!("Fatal error parsing Terraform data. Verify input file is from `terraform show -json example.json`. Message: {}", e);
            return;
        }
    };

    let json_data_clone = json_data.clone();
    // Create a warp filter to handle the data endpoint
    let data = warp::path("data")
        .map(move || {
            warp::reply::json(&json_data_clone)
        });

    // Combine filters
    let routes = static_files.or(data);

    // Start the server
    println!("Server started at http://127.0.0.1:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await
}
