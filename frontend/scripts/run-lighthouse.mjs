import fs from "fs"
import path from "path"
import puppeteer from "puppeteer-core"
import lighthouse from "lighthouse"

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const BASE_URL = "http://localhost:3000"
const API_URL = "http://localhost:8009/api"
const OUTPUT_DIR = path.resolve(process.cwd(), "reports/lighthouse")

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

async function getAuthToken(identifier, password) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password })
    })
    const json = await res.json()
    if (json.success && json.data && json.data.access_token) {
      return {
        token: json.data.access_token,
        refreshToken: json.data.refresh_token,
        user: json.data.user
      }
    }
    console.error("Login failed for:", identifier, json)
    return null
  } catch (err) {
    console.error("Failed to connect to backend:", err.message)
    return null
  }
}

async function runAudit() {
  console.log("🚀 Starting System-Wide Lighthouse Audit...")

  console.log("🔑 Authenticating test accounts...")
  const studentAuth = await getAuthToken("28926", "password")
  const teacherAuth = await getAuthToken("somchai@tunorth.ac.th", "password")
  const adminAuth = await getAuthToken("admin@tunorth.ac.th", "admin1234")

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--remote-debugging-port=9222",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ],
    defaultViewport: { width: 1280, height: 800 }
  })

  const endpointUrl = new URL(browser.wsEndpoint())
  const port = endpointUrl.port

  const routes = [
    { name: "home", path: "/", auth: null, label: "Landing / Home Page" },
    { name: "login", path: "/login", auth: null, label: "Login Page" },
    { name: "student", path: "/student", auth: studentAuth, label: "Student Portal" },
    { name: "teacher", path: "/teacher", auth: teacherAuth, label: "Teacher Portal" },
    { name: "admin", path: "/admin", auth: adminAuth, label: "Admin Control Panel" }
  ]

  const results = []

  for (const route of routes) {
    console.log(`\n🔍 Auditing [${route.name.toUpperCase()}] ${route.label} (${BASE_URL}${route.path})...`)
    const page = await browser.newPage()

    try {
      // First go to origin to set or clear localStorage
      await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })

      if (route.auth) {
        await page.evaluate((auth) => {
          localStorage.setItem("cpms_token", auth.token)
          if (auth.refreshToken) localStorage.setItem("cpms_refresh_token", auth.refreshToken)
          if (auth.user) localStorage.setItem("cpms_user", JSON.stringify(auth.user))
        }, route.auth)
      } else {
        await page.evaluate(() => {
          localStorage.clear()
        })
      }

      const targetUrl = `${BASE_URL}${route.path}`
      await page.goto(targetUrl, { waitUntil: "networkidle0" })
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const runnerResult = await lighthouse(targetUrl, {
        port: Number(port),
        output: ["html", "json"],
        logLevel: "error",
        disableStorageReset: true,
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false
        },
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        }
      }, undefined, page)

      const reportHtml = runnerResult.report[0]
      const reportJson = runnerResult.report[1]
      const lhr = runnerResult.lhr

      const htmlPath = path.join(OUTPUT_DIR, `${route.name}-report.html`)
      const jsonPath = path.join(OUTPUT_DIR, `${route.name}-report.json`)
      fs.writeFileSync(htmlPath, reportHtml)
      fs.writeFileSync(jsonPath, reportJson)

      const scores = {
        name: route.name,
        label: route.label,
        path: route.path,
        performance: Math.round((lhr.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhr.categories["best-practices"]?.score || 0) * 100),
        seo: Math.round((lhr.categories.seo?.score || 0) * 100),
        fcp: lhr.audits["first-contentful-paint"]?.displayValue || "N/A",
        lcp: lhr.audits["largest-contentful-paint"]?.displayValue || "N/A",
        cls: lhr.audits["cumulative-layout-shift"]?.displayValue || "N/A",
        tbt: lhr.audits["total-blocking-time"]?.displayValue || "N/A",
        htmlReport: htmlPath
      }

      results.push(scores)
      console.log(`✅ [${route.name.toUpperCase()}] Results:`)
      console.log(`   - Performance: ${scores.performance}% (FCP: ${scores.fcp}, LCP: ${scores.lcp}, TBT: ${scores.tbt})`)
      console.log(`   - Accessibility: ${scores.accessibility}%`)
      console.log(`   - Best Practices: ${scores.bestPractices}%`)
      console.log(`   - SEO: ${scores.seo}%`)
    } catch (err) {
      console.error(`❌ Error auditing ${route.name}:`, err.message)
    } finally {
      await page.close()
    }
  }

  await browser.close()

  console.log("\n=======================================================")
  console.log("📊 LIGHTHOUSE AUDIT SUMMARY")
  console.log("=======================================================")
  console.table(
    results.map((r) => ({
      Route: r.label,
      Performance: `${r.performance}%`,
      Accessibility: `${r.accessibility}%`,
      "Best Practices": `${r.bestPractices}%`,
      SEO: `${r.seo}%`,
      LCP: r.lcp,
      CLS: r.cls
    }))
  )

  const summaryJsonPath = path.join(OUTPUT_DIR, "summary.json")
  fs.writeFileSync(summaryJsonPath, JSON.stringify(results, null, 2))
  console.log(`\n📁 Reports saved to ${OUTPUT_DIR}`)
}

runAudit().catch(console.error)
