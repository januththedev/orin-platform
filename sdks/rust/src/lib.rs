use serde::{Deserialize, Serialize};

pub const PLATFORM_CONTRACT_VERSION: &str = "1.0.0";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SearchRequest {
    pub query: String,
    pub n: u8,
    pub locale: Option<String>,
    pub safe_search: Option<String>,
}
