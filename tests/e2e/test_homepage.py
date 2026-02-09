import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait


def test_homepage_loads():
    base_url = os.getenv("BASE_URL", "http://localhost:3000")

    options = Options()
    options.add_argument("--window-size=1400,900")
    options.add_argument("--start-maximized")

    # Keep these since you likely have proxy/DNS weirdness
    options.add_argument("--no-proxy-server")
    options.add_argument("--proxy-server=direct://")
    options.add_argument("--proxy-bypass-list=*")

    driver = webdriver.Chrome(options=options)

    try:
        driver.get(base_url)

        # Wait until the document is fully loaded
        WebDriverWait(driver, 10).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )

        assert "error" not in driver.title.lower()
    finally:
        driver.quit()