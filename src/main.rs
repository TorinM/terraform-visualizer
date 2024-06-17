use warp::Filter;

#[tokio::main]
async fn main() {
    // Serve static files from the "static" directory
    let static_files = warp::fs::dir("static");

    // Create a warp filter to handle the data endpoint
    let data = warp::path("data")
        .map(|| {
            // Generate data for D3.js here (e.g., parse Terraform plan and convert to JSON)
            let data = r#"{"nodes": [], "links": []}"#; // Example data
            warp::reply::json(&data)
        });

    // Combine filters
    let routes = static_files.or(data);

    // Start the server
    println!("Server started at http://127.0.0.1:3030");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}