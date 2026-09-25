#[test]
fn contract_version_is_stable() {
    assert_eq!(orin_platform_contracts::PLATFORM_CONTRACT_VERSION, "1.0.0");
}
