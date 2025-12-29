/// Security utilities and constants
///
/// This module provides centralized security constants and validation functions
/// to prevent common injection and overflow attacks.

pub const MAX_STORAGE_VALUE_LENGTH: usize = 8192; // 8KB limit for secrets
pub const REPEATED_CHAR_LENGTH: usize = 256; // Limit for potentially abusive repeated chars
pub const LARGE_TEST_DATA_SIZE: usize = 1024 * 1024; // 1MB test data

/// Validate user input to prevent excessive length or invalid characters
///
/// # Arguments
/// * `input` - The string input to validate
/// * `field_name` - Name of the field for error reporting
/// * `max_length` - Maximum allowed length in bytes
///
/// # Returns
/// * `Ok(())` if valid
/// * `Err(String)` if invalid
pub fn validate_user_input(input: &str, field_name: &str, max_length: usize) -> Result<(), String> {
    if input.len() > max_length {
        return Err(format!(
            "{} exceeds maximum length of {} bytes",
            field_name, max_length
        ));
    }
    
    // Basic sanity check - ensure it's not full of null bytes
    if input.contains('\0') {
         return Err(format!("{} contains null bytes", field_name));
    }

    Ok(())
}
