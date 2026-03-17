
Test Case 2

Project Name: Unified Creator Portfolio Platform
Dashboard Test
Test Case ID: Test_2
Test Designed By: Noble Joseph
Test Priority: High
Test Designed Date: 17-03-2026
Module Name: Dashboard
Test Executed By : Mr. Jinson Devis
Test Title : Dashboard Widgets and Navigation

Test Execution Date: 17-03-2026
Description: This test verifies that users land on the dashboard after login and that widgets and navigation links function correctly.
This test verifies that users land on the dashboard after login and that widgets and navigation links function correctly.

Pre-Condition : User has a valid account (test@example.com / password123) and is logged out.

| Step | Test Step | Test Data | Expected Result | Actual Result | Status(Pass/Fail) |
|------|-----------|-----------|-----------------|---------------|-------------------|
| 1 | Login first | test@example.com / password123 | User logged in successfully | Message: 
 | Fail |
| 2 | Verify dashboard access | N/A | User redirected to dashboard | Landed on http://localhost:3000/login | Fail |
| 3 | Verify dashboard elements | N/A | Dashboard header and widgets visible | No widgets found | Fail |
| 4 | Test navigation from dashboard - Portfolio | N/A | Portfolio page loads | Portfolio link not found or navigation failed | Fail |
| 5 | Test navigation from dashboard - Connections | N/A | Connections page loads | Network link not found or navigation failed | Fail |
| 6 | Test dashboard analytics/widgets | N/A | Analytics/stats displayed | Analytics link not found | Fail |
| 7 | Test profile access | N/A | Profile page loads | Settings link not found | Fail |

Post-Condition: User remains on the dashboard, having confirmed that key data and navigation links are present and/or missing.
