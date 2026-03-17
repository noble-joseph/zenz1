
Test Case 1

Project Name: Unified Creator Portfolio Platform
Project Management Test
Test Case ID: Test_1
Test Designed By: Noble Joseph
Test Priority: High
Test Designed Date: 17-03-2026
Module Name: Project Management
Test Executed By : Mr. Jinson Devis
Test Title : Project Creation Flow

Test Execution Date: 17-03-2026
Description: This test verifies the end-to-end flow of creating a new project, including metadata and AI-assisted fields.

Pre-Condition : User is logged in and on the dashboard.

| Step | Test Step | Test Data | Expected Result | Actual Result | Status(Pass/Fail) |
|------|-----------|-----------|-----------------|---------------|-------------------|
| 1 | Login first | test@example.com / password123 | User logged in successfully | Message: 
 | Fail |
| 2 | Navigate to New Project Page | N/A | New Project page loads | Successfully navigated to New Project page | Pass |
| 3 | Fill Project Details | N/A | Details entered successfully | Message: 
Stacktrace:
Symbols not available. Dumping unresolved backtrace:
	0x3b7dd3
	0x3b7e14
	0x1c1db0
	0x20c20a
	0x20c4ab
	0x24de32
	0x22ea84
	0x24b621
	0x22e7d6
	0x200049
	0x200e04
	0x616924
	0x611bf7
	0x62f5a0
	0x3d0f58
	0x3d891d
	0x3c0648
	0x3c0812
	0x3aa21a
	0x758d5d49
	0x773bd81b
	0x773bd7a1
 | Fail |
| 4 | Add Project Tag | Tag: automated | Tag added to list | Tag input or button not found | Fail |
| 5 | Test AI Metadata Generation | N/A | AI generation triggered | Auto button not found | Fail |

Post-Condition: User verifies form integrity and ability to initiate project creation.
