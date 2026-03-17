import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class BaseTest:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        chrome_options = Options()
        # chrome_options.add_argument("--headless") # For server environments
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)

    def login(self, email, password):
        self.driver.get(f"{self.base_url}/login")
        
        # Wait for Supabase Auth UI - Try multiple selectors
        try:
            email_input = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
            password_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")
            
            email_input.send_keys(email)
            password_input.send_keys(password)
            
            # Find the submit button specifically for the sign-in form
            submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_btn.click()
            
            # Wait for redirection to dashboard or error
            self.wait.until(lambda d: "/dashboard" in d.current_url or d.find_elements(By.CLASS_NAME, "supabase-account-ui_ui-message"))
            
            if "/dashboard" not in self.driver.current_url:
                error_msg = self.driver.find_element(By.CLASS_NAME, "supabase-account-ui_ui-message").text
                raise Exception(f"Login failed: {error_msg}")
        except Exception as e:
            # Capture screenshot on failure if needed
            self.driver.save_screenshot("login_failure.png")
            raise e

    def teardown(self):
        self.driver.quit()
