import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_login_smoke():
    base_url = os.getenv("BASE_URL", "http://localhost:3000")
    email = os.getenv("TEST_EMAIL")
    password = os.getenv("TEST_PASSWORD")

    assert email, "TEST_EMAIL is not set"
    assert password, "TEST_PASSWORD is not set"

    options = Options()
    options.add_argument("--window-size=1400,900")
    options.add_argument("--start-maximized")

    # keep these since your environment had DNS/proxy weirdness
    options.add_argument("--no-proxy-server")
    options.add_argument("--proxy-server=direct://")
    options.add_argument("--proxy-bypass-list=*")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 15)

    try:
        driver.get(f"{base_url}/login")

        wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid='login-email']"))).send_keys(email)
        driver.find_element(By.CSS_SELECTOR, "[data-testid='login-password']").send_keys(password)
        driver.find_element(By.CSS_SELECTOR, "[data-testid='login-submit']").click()

        # TEMP assert: URL contains dashboard (we'll make this better next)
        wait.until(lambda d: "/dashboard" in d.current_url)
    finally:
        driver.quit()