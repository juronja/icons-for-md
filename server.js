import express from 'express'
import ViteExpress from "vite-express"
import * as cheerio from 'cheerio'
import { optimize } from 'svgo'
import client from 'prom-client'

// Initialize metrics exporter
const collectDefaultMetrics = client.collectDefaultMetrics
collectDefaultMetrics({timeout: 5000})

const httpRequestsTotal = new client.Counter({
  name: 'http_request_operations_total',
  help: 'Total number of http requests'
})

// Initialize the express server
const app = express()

// Global variables
const ICON_DISPLAY_SIZE = 48 // viewBox size for each icon in the combined SVG
const ICON_CONTENT_SIZE = 36 // actual size of icon SVG to be within its container
const ICON_GAP = 8 // Gap between icons
let GLOBAL_ICON_NAME_LIST = [] // Global list to store all icon names fetched from GitHub
const HOMARR_BASE_URL = "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main"

// Caching fetched SVG content and defining time to live in cache
const svgContentCache = new Map() // Define empty Map object. Storing key:value pairs (iconName:svgContent)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // Define cache TTL in milliseconds | 7 days in milliseconds

// Custom SVGO configuration | I had to add additional parameters to clean out some of the icons
const svgoConfig = {
  plugins: [
    {
      name: "removeEditorsNSData",
      params: {
        additionalNamespaces: [
          "https://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd",
          "https://www.inkscape.org/namespaces/inkscape",
        ]
      }
    }
  ],
}

// Middleware
app.use(express.json()) // Parse the JSON to JS first, otherwise you gat an error!

// Middleware to track HTTP requests for Prometheus
app.use((req, res, next) => {
  httpRequestsTotal.inc() // Increment the counter for each incoming request
  next()
})


// FUNCTIONS

// Fetches the icon tree json information from the GitHub repository and generates a global icon name list for found svg files
async function fetchIconTree() {
  try {
    const response = await fetch(`${HOMARR_BASE_URL}/tree.json`)
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }
    const iconsData = await response.json()

    // checks the svg array for files ending .svg and removes .svg to get the icon name
    GLOBAL_ICON_NAME_LIST = iconsData.svg.map(filename =>
      filename.endsWith('.svg') ? filename.slice(0, -4) : filename
    )

    console.log("Icon tree fetched successfully.")
  } catch (err) {
    console.error("Error fetching icon tree:", err)
  }
}

// Fetches SVG icon content from the cache or GitHub repository
async function fetchIcons(iconName) {
  const cachedItem = svgContentCache.get(iconName)
  const currentTime = Date.now()

  // Return from cache if valid and within TTL
  if (cachedItem && (currentTime - cachedItem.timestamp < CACHE_TTL)) {
    // console.log(`Serving SVG for ${iconName} from cache (TTL valid)`) // Uncomment for debugging
    return cachedItem.content
  }

  // If item is expired or not in cache, fetch it
  const iconUrl = `${HOMARR_BASE_URL}/svg/${iconName}.svg`
  try {
    const response = await fetch(iconUrl)
    if (!response.ok) {
      console.warn(`Failed to fetch SVG for ${iconName}: ${response.status} ${response.statusText}`)
      return null
    }
    
    const rawSvg = await response.text()
    const { data: optimizedSvg } = optimize(rawSvg, svgoConfig) // SANITIZE AND OPTIMIZE WITH SVGO

    // Store the icon content with a fresh timestamp in cache
    svgContentCache.set(iconName, {
      content: optimizedSvg,
      timestamp: currentTime
    })
    return optimizedSvg
  } catch (err) {
    console.error(`Error fetching SVG for ${iconName}:`, err)
    return null
  }
}

// Takes a list of icon names, fetches their raw code, sanitizes them to prevent visual bugs, and arranges them into a grid
async function generateCombinedSvg(iconNamesArray) {

  const validIconsArray = iconNamesArray.filter(name => GLOBAL_ICON_NAME_LIST.includes(name)) // Filter out icons that are not in the GLOBAL_ICON_NAME_LIST to avoid 404s
  const rectBackgroundColor = 'rgb(36, 41, 56)'
  const rectBorderRadius = 10
  const rectPadding = (ICON_DISPLAY_SIZE - ICON_CONTENT_SIZE) / 2 // Dynamic padding

  // Optimize each grabbed icon
  const optimizeIndividualIconSVG = validIconsArray.map(async name => {

    // 1. Fetch Icons
    const svgOptimized = await fetchIcons(name)

    if (typeof svgOptimized !== 'string') {
      console.warn(`Skipping icon "${name}" because its SVG content is not a string.`)
      return null
    }

    // 2. Read data as xml, since SVGs are xml data. Using cheerio instead of regex for simple manipulation of svg raw data
    const svgXml = cheerio.load(svgOptimized, { xmlMode: true })
    const svgXmlSvgTag = svgXml('svg')

    if (svgXmlSvgTag.length === 0) {
      console.warn(`Invalid SVG structure for icon "${name}": Cannot find root <svg> tag.`)
      return null
    }

    // 2. START: Make IDs and CSS Classes unique. Prevent SVG conflicts when multiple SVGs are merged into one large file ---

    // A: Generate a unique suffix. Add name with unwanted characters filter, add random suffix
    const uniqueSuffix = `_${name.replace(/[^a-zA-Z0-9_-]/g, '')}_${Math.random().toString(36).substring(2, 7)}`

    // B: Rename svg IDs
    const idMap = new Map() // Store old IDs as keys and new IDs as values to keep track for the next steps
    
    svgXmlSvgTag.find('[id]').each((i, element) => {
      const svgXmlElement = svgXml(element)
      const oldId = svgXmlElement.attr('id')
      const newId = oldId + uniqueSuffix
      svgXmlElement.attr('id', newId)
      idMap.set(oldId, newId)
    })

    // C: Update internal references to those IDs. Check every single tag (*) in this file to see if it’s using one of the IDs I just renamed
    svgXmlSvgTag.find('*').each((i, element) => {
      const svgXmlElement = svgXml(element)

      // Loop through every attribute
      for (const attrName in element.attribs) {
        let attrValue = svgXmlElement.attr(attrName)

        // Check if the attribute value contains a URL reference like url(#some-id)
        const urlMatch = attrValue.match(/url\(#([^)]+)\)/)
        if (urlMatch) {
          const referencedId = urlMatch[1]
          if (idMap.has(referencedId)) {
            const newReferencedId = idMap.get(referencedId)
            attrValue = attrValue.replace(`#${referencedId}`, `#${newReferencedId}`)
            svgXmlElement.attr(attrName, attrValue)
          }
        }
        
        // Legacy support: Rename SVG xlink:href attributes
        if (attrName === 'xlink:href' && attrValue.startsWith('#')) {
          const referencedId = attrValue.substring(1)
          if (idMap.has(referencedId)) {
            const newReferencedId = idMap.get(referencedId)
            svgXmlElement.attr(attrName, `#${newReferencedId}`)
          }
        }
      }
    })

    // D: Scope CSS classes inside <style> tags. This prevents a style affecting other SVGs when merged. .icon_abc12 { ... }
    svgXmlSvgTag.find('style').each((i, styleElement) => {
      let styleContent = svgXml(styleElement).html()

      // Look for class selectors (starting with dot) and appends the suffix
      styleContent = styleContent.replace(/\.([a-zA-Z0-9_-]+)/g, (match, className) => {
        return `.${className}${uniqueSuffix}`
      })
      svgXml(styleElement).html(styleContent)
    })

    // E: Update class attributes on the HTML elements to follow updated CSS. class="icon_abc12"
    svgXmlSvgTag.find('[class]').each((i, element) => {
      const svgXmlElement = svgXml(element)
      const oldClasses = svgXmlElement.attr('class').split(' ') // splits multiple classes to array
      const newClasses = oldClasses.map(cls => `${cls}${uniqueSuffix}`) // Adds suffix to each array item
      svgXmlElement.attr('class', newClasses.join(' ')) // Takes the array and turns it back into a single string with spaces
    })
    // --- END: Make IDs and CSS Classes unique ---

    // 3. Standardize icon viewBox
    let originalViewBox = svgXmlSvgTag.attr('viewBox')
    if (!originalViewBox) { // if no viewBox check for width and height
      const width = parseFloat(svgXmlSvgTag.attr('width'))
      const height = parseFloat(svgXmlSvgTag.attr('height'))
      if (width && height) {
        originalViewBox = `0 0 ${width} ${height}` // use width and height
        console.log(`Icon "${name}" has no viewBox, but width/height found.`)
      } else {
        console.warn(`Skipping icon "${name}": No viewBox or width/height attributes found. Cannot determine dimensions of SVG.`)
        return null
      }
    }

    const svgInnerHtml = svgXmlSvgTag.html()

    // 4. Generate rectangle and svg inside it
    return `
      <svg width="${ICON_DISPLAY_SIZE}" height="${ICON_DISPLAY_SIZE}" viewBox="0 0 ${ICON_DISPLAY_SIZE} ${ICON_DISPLAY_SIZE}">
        <rect x="0" y="0" width="${ICON_DISPLAY_SIZE}" height="${ICON_DISPLAY_SIZE}" rx="${rectBorderRadius}" ry="${rectBorderRadius}" fill="${rectBackgroundColor}"/>
        <svg x="${rectPadding}" y="${rectPadding}" width="${ICON_CONTENT_SIZE}" height="${ICON_CONTENT_SIZE}" viewBox="${originalViewBox}" preserveAspectRatio="xMidYMid meet">
          ${svgInnerHtml}
        </svg>
      </svg>
    `
  })

  // Merge SVGs into larger combo image

  // Wait for all icons to finish processing and filter out any returned boolean values
  const filteredIndividualSVGs = (await Promise.all(optimizeIndividualIconSVG)).filter(Boolean)
  
  // Set merged image shape 
  const numberIcons = filteredIndividualSVGs.length
  const finalWidth = numberIcons * ICON_DISPLAY_SIZE + (numberIcons > 0 ? (numberIcons - 1) * ICON_GAP : 0) // nr of icons sizes + nr of gaps between 
  const finalHeight = ICON_DISPLAY_SIZE

  // Loop through number of optimized icons and generate that many final icons in a row
  let mergedSVGContent = ''
  for (let i = 0; i < numberIcons; i++) {
    const x = i * (ICON_DISPLAY_SIZE + ICON_GAP)
    mergedSVGContent += `<g transform="translate(${x},0)">${filteredIndividualSVGs[i]}</g>`
  }

  // Return a merged image shape with individual icons
  return `
    <svg width="${finalWidth}" height="${finalHeight}" viewBox="0 0 ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      ${mergedSVGContent}
    </svg>
  `
}


// API ROUTES

// Route for generating and serving combined SVG images. This route is asynchronous because it calls `generateCombinedSvg` which performs fetches
app.get('/icons', async (req, res) => {
  const iNames = req.query.i // Get icon names from 'i' query parameter in the URL
  if (!iNames) {
    // If no icons are specified, return a 400 Bad Request error
    return res.status(400).send("API can not return results. You didn't specify any icons! You must use '?i=icon1,icon2' in the URL.")
  }

  // Split the comma-separated icon names to array
  const iNamesSplit = iNames.split(',')

  try {
    const svgCombo = await generateCombinedSvg(iNamesSplit)
    res.setHeader('Content-Type', 'image/svg+xml')
    res.send(svgCombo)
  } catch (err) {
    console.error("Error generating combined SVG:", err)
    res.status(500).send("Error generating image. Please try again later.")
  }
})

// Route for serving the list of all available icon names (API endpoint)
app.get('/api/icons', (req, res) => {
  // Return the global list of icon names as JSON
  res.json(GLOBAL_ICON_NAME_LIST)
})


// SERVER INITIALIZATION

ViteExpress.listen(app, 3000, async () => {
  await fetchIconTree()
  console.log("Server is listening on:\n\nhttps://node.lan\n\n")

  // Cleanup the icon cache
  setInterval(() => {
    const currentTime = Date.now()
    let deletedCount = 0

    for (const [iconName, cachedItem] of svgContentCache) {
      if (currentTime - cachedItem.timestamp >= CACHE_TTL) {
        svgContentCache.delete(iconName)
        deletedCount++
      }
    }
    if (deletedCount > 0) {
      console.log(`cleanupCache: Removed ${deletedCount} icons from cache.`)
    }
  }, 24 * 60 * 60 * 1000) // every 24 hours in milliseconds
})
