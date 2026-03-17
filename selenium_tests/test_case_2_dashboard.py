import os
import sys
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

# Add the utils directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))
from base_test import BaseTest
from report_generator import ReportGenerator

def test_dashboard_functionality():
    test = BaseTest()
    report_gen = ReportGenerator()
    steps = []
    
    try:
        # Step 1: Login
        try:
            test.login("test@example.com", "password123")
            steps.append({"id": 1, "step": "Login first", "data": "test@example.com / password123", "expected": "User logged in successfully", "actual": "Login successful", "status": "Pass"})
        except Exception as e:
            steps.append({"id": 1, "step": "Login first", "data": "test@example.com / password123", "expected": "User logged in successfully", "actual": "Login successful", "status": "Fail"}) # actual should be error message but user example used pass/fail status
            steps[-1]["actual"] = str(e)

        # Step 2: Verify dashboard access
        if "/dashboard" in test.driver.current_url:
            steps.append({"id": 2, "step": "Verify dashboard access", "data": "N/A", "expected": "User redirected to dashboard", "actual": "Successfully landed on dashboard", "status": "Pass"})
        else:
            steps.append({"id": 2, "step": "Verify dashboard access", "data": "N/A", "expected": "User redirected to dashboard", "actual": f"Landed on {test.driver.current_url}", "status": "Fail"})

        # Step 3: Verify dashboard elements
        widgets = test.driver.find_elements(By.TAG_NAME, "article")
        if len(widgets) > 0:
            steps.append({"id": 3, "step": "Verify dashboard elements", "data": "N/A", "expected": "Dashboard header and widgets visible", "actual": f"Found {len(widgets)} dashboard widgets", "status": "Pass"})
        else:
            steps.append({"id": 3, "step": "Verify dashboard elements", "data": "N/A", "expected": "Dashboard header and widgets visible", "actual": "No widgets found", "status": "Fail"})

        # Step 4: Test navigation - Portfolio
        try:
            portfolio_link = test.wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Portfolio")))
            portfolio_link.click()
            test.wait.until(EC.url_contains("/dashboard/profile"))
            steps.append({"id": 4, "step": "Test navigation from dashboard - Portfolio", "data": "N/A", "expected": "Portfolio page loads", "actual": "Successfully navigated to portfolio", "status": "Pass"})
            test.driver.back()
        except Exception:
            steps.append({"id": 4, "step": "Test navigation from dashboard - Portfolio", "data": "N/A", "expected": "Portfolio page loads", "actual": "Portfolio link not found or navigation failed", "status": "Fail"})

        # Step 5: Test navigation - Connections (Network)
        try:
            network_link = test.wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Network")))
            network_link.click()
            test.wait.until(EC.url_contains("/dashboard/network"))
            steps.append({"id": 5, "step": "Test navigation from dashboard - Connections", "data": "N/A", "expected": "Connections page loads", "actual": "Successfully navigated to connections", "status": "Pass"})
            test.driver.back()
        except Exception:
            steps.append({"id": 5, "step": "Test navigation from dashboard - Connections", "data": "N/A", "expected": "Connections page loads", "actual": "Network link not found or navigation failed", "status": "Fail"})

        # Step 6: Test dashboard analytics
        try:
            analytics_link = test.wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Analytics")))
            analytics_link.click()
            test.wait.until(EC.url_contains("/dashboard/analytics"))
            steps.append({"id": 6, "step": "Test dashboard analytics/widgets", "data": "N/A", "expected": "Analytics/stats displayed", "actual": "Successfully navigated to analytics", "status": "Pass"})
            test.driver.back()
        except Exception:
            steps.append({"id": 6, "step": "Test dashboard analytics/widgets", "data": "N/A", "expected": "Analytics/stats displayed", "actual": "Analytics link not found", "status": "Fail"})

        # Step 7: Test profile access (Settings)
        try:
            settings_link = test.wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Settings")))
            settings_link.click()
            test.wait.until(EC.url_contains("/dashboard/settings"))
            steps.append({"id": 7, "step": "Test profile access", "data": "N/A", "expected": "Profile page loads", "actual": "Successfully navigated to settings", "status": "Pass"})
        except Exception:
            steps.append({"id": 7, "step": "Test profile access", "data": "N/A", "expected": "Profile page loads", "actual": "Settings link not found", "status": "Fail"})

    finally:
        report_path = os.path.join(os.path.dirname(__file__), "reports", "dashboard_test_report.md")
        report_gen.generate_report(
            test_case_id="Test_2",
            module_name="Dashboard",
            test_title="Dashboard Widgets and Navigation",
            description="This test verifies that users land on the dashboard after login and that widgets and navigation links function correctly.",
            pre_condition="User has a valid account (test@example.com / password123) and is logged out.",
            steps=steps,
            post_condition="User remains on the dashboard, having confirmed that key data and navigation links are present and/or missing.",
            output_path=report_path
        )
        test.teardown()

if __name__ == "__main__":
    test_dashboard_functionality()
