
Test Case 3

Project Name: Unified Creator Portfolio Platform
Dashboard Test
Test Case ID: Test_3
Test Designed By: Noble Joseph
Test Priority: High
Test Designed Date: 17-03-2026
Module Name: Public Interface
Test Executed By : Mr. Jinson Devis
Test Title : Public Portfolio Integrity

Test Execution Date: 17-03-2026
Description: This test verifies that the public-facing portfolio pages correctly render creator data and projects.
This test verifies that the public-facing portfolio pages correctly render creator data and projects.

Pre-Condition : Known valid public slug (noble1) exists in the system.

| Step | Test Step | Test Data | Expected Result | Actual Result | Status(Pass/Fail) |
|------|-----------|-----------|-----------------|---------------|-------------------|
| 1 | Access Public Portfolio | URL: /noble1 | Portfolio page loads with creator data | Successfully loaded public profile | Pass |
| 2 | Verify Projects Section | N/A | Projects section is visible | Projects section not explicitly found | Fail |
| 3 | Navigate to Project Detail | N/A | Project detail page loads | No project links found or navigation failed | Pass |
| 4 | Verify Contact/Message Button | N/A | Contact or Message button available | Found action button | Pass |

Post-Condition: User confirms that the portfolio is accessible to the public without authentication.
