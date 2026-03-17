import os
import sys
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

# Add the utils directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))
from base_test import BaseTest
from report_generator import ReportGenerator

def test_settings_customization():
    test = BaseTest()
    report_gen = ReportGenerator()
    steps = []
    
    try:
        # Step 1: Login
        try:
            test.login("test@example.com", "password123")
            steps.append({"id": 1, "step": "Login first", "data": "test@example.com / password123", "expected": "User logged in successfully", "actual": "Login successful", "status": "Pass"})
        except Exception as e:
            steps.append({"id": 1, "step": "Login first", "data": "test@example.com / password123", "expected": "User logged in successfully", "actual": str(e), "status": "Fail"})

        # Step 2: Navigate to Settings
        test.driver.get(f"{test.base_url}/dashboard/settings")
        if "/dashboard/settings" in test.driver.current_url:
            steps.append({"id": 2, "step": "Navigate to Settings", "data": "N/A", "expected": "Settings page loads", "actual": "Successfully navigated to Settings", "status": "Pass"})
        else:
            steps.append({"id": 2, "step": "Navigate to Settings", "data": "N/A", "expected": "Settings page loads", "actual": f"Landed on {test.driver.current_url}", "status": "Fail"})

        # Step 3: Verify Profile Tabs
        try:
            identity_tab = test.wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Identity')]")))
            experience_tab = test.driver.find_element(By.XPATH, "//button[contains(., 'Experience')]")
            steps.append({"id": 3, "step": "Verify Profile Tabs", "data": "Identity, Experience", "expected": "Tabs are visible", "actual": "Found Identity and Experience tabs", "status": "Pass"})
        except Exception:
            steps.append({"id": 3, "step": "Verify Profile Tabs", "data": "N/A", "expected": "Tabs are visible", "actual": "Settings tabs not found", "status": "Fail"})

        # Step 4: Test AI Bio Rewrite Button
        try:
            identity_tab.click()
            ai_rewrite_btn = test.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'AI Rewrite')]")))
            steps.append({"id": 4, "step": "Test AI Bio Rewrite Button", "data": "N/A", "expected": "AI Rewrite button is functional", "actual": "AI Rewrite button found and clickable", "status": "Pass"})
        except Exception:
            steps.append({"id": 4, "step": "Test AI Bio Rewrite Button", "data": "N/A", "expected": "AI Rewrite button visible", "actual": "AI Rewrite button not found on Identity tab", "status": "Fail"})

    finally:
        report_path = os.path.join(os.path.dirname(__file__), "reports", "settings_test_report.md")
        report_gen.generate_report(
            test_case_id="Test_4",
            module_name="Settings",
            test_title="Settings & Identity Management",
            description="This test verifies that users can manage their profile identity and experience settings, including AI-powered bio optimization.",
            pre_condition="User is logged in and has access to the dashboard settings.",
            steps=steps,
            post_condition="User verifies that profile settings are modifiable and AI tools are accessible.",
            output_path=report_path
        )
        test.teardown()

if __name__ == "__main__":
    test_settings_customization()
