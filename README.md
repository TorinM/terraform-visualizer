# Terraform Visualizer

Takes a Terraform Show file and generates a visual map on the web browser.

## Usage

This tool requires a valid JSON Terraform Show file. Generated by:

```bash
terraform show -json > tf.json
```

Then run the tool:

```bash
./terraform-visualizer tf.json
```

This will launch a web server on `http://localhost:3030` with the visual map.

## Dependencies

- [serde_json](https://crates.io/crates/serde_json)
- [tokio](https://crates.io/crates/tokio)
- [warp](https://crates.io/crates/warp)

## Contributing

This project is open to contributions. Feel free to open an issue or a pull request.
