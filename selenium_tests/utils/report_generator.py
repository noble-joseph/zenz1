import datetime

class ReportGenerator:
    def __init__(self, project_name="Unified Creator Portfolio Platform"):
        self.project_name = project_name
        self.designed_by = "Noble Joseph"
        self.executed_by = "Mr. Jinson Devis"
        self.date = datetime.datetime.now().strftime("%d-%m-%Y")

    def generate_report(self, test_case_id, module_name, test_title, description, pre_condition, steps, post_condition, output_path):
        report = f"""
Test Case {test_case_id.split('_')[-1]}

Project Name: {self.project_name}
{module_name} Test
Test Case ID: {test_case_id}
Test Designed By: {self.designed_by}
Test Priority: High
Test Designed Date: {self.date}
Module Name: {module_name}
Test Executed By : {self.executed_by}
Test Title : {test_title}

Test Execution Date: {self.date}
Description: {description}

Pre-Condition : {pre_condition}

| Step | Test Step | Test Data | Expected Result | Actual Result | Status(Pass/Fail) |
|------|-----------|-----------|-----------------|---------------|-------------------|
"""
        for step in steps:
            report += f"| {step['id']} | {step['step']} | {step['data']} | {step['expected']} | {step['actual']} | {step['status']} |\n"
        
        report += f"\nPost-Condition: {post_condition}\n"
        
        with open(output_path, "w") as f:
            f.write(report)
        print(f"Report generated at {output_path}")
