//! Provides functions to handle and verify user input files.
//! Forces user to provide a valid `terraform show -json example.json` file.

use std::env;
use std::path::Path;
use serde_json;

/// Verifies the user input file is a valid JSON file.
/// Wraps the serde_json::from_str function.
fn verify_input_file_json(data: &str) -> Result<serde_json::Value, serde_json::Error>{
    match serde_json::from_str(data) {
        Ok(json) => Ok(json),
        Err(e) => Err(e),
    }
}


/// Gets the file path from the command line arguments.
/// Forces user to provide a file path as the first (and only) argument.
pub fn get_file_path() -> Result<String, String> {
    let args: Vec<String> = env::args().collect();
    if args.len() != 2 {
        eprintln!("Usage: {} <PATH TO terraform.json FILE>", args[0]);
        return Err("Bad arguments".to_string());
    }
    Ok(args[1].clone())
}


/// Verifies the user input file exists.
/// Wraps the std::path::Path::exists function.
pub fn verify_file_exists(file_path: &str) -> Result<(), String> {
    if !Path::new(file_path).exists() {
        eprintln!("File '{}' not found.", file_path);
        return Err("File not found".to_string());
    }
    Ok(())
}


/// Reads the user input file with std::fs::read_to_string.
/// Verifies the file is a valid JSON file with verify_input_file_json.
/// Returns the file contents as a String.
pub fn read_input(file_path: &String) -> Result<String, Box<dyn std::error::Error>> {
    match std::fs::read_to_string(file_path) {
        Ok(data) => {
            match verify_input_file_json(&data) {
                Ok(_) => Ok(data),
                Err(e) => {
                    eprintln!("Error reading input file. Verify input file is from `terraform show -json example.json`");
                    Err(Box::new(e))
                }
            }
        }
        Err(e) => {
            eprintln!("Fatal error reading input file: {}", e);
            Err(Box::new(e))
        }
    }
}
