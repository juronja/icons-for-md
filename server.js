import express from 'express'
import ViteExpress from "vite-express"
import * as cheerio from 'cheerio'


// Start express server
const app = express() // Initialize the express server


const max_icons_in_row = 15
const icon_display_size = 48 // This will be the viewBox size for each icon in the combined SVG
const icon_content_size = 36 // This is the actual size you want the icon SVG to be within its container
const gap = 8 // Gap between icons


// Global variables to store icon metadata fetched from GitHub
let globalIconNameList = []

// Caching for fetched SVG content
const svgContentCache = new Map() // This will store iconName -> svgContent
// Define TTL: 3 days in milliseconds
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds


// Middleware
app.use(express.json()) // needed to parse the JSON to JS first, otherwise you gat an error!
// CORS Middleware: Enables cross-origin requests from your frontend to this backend. This is essential if your frontend is served from a different domain/port than your backend.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*') // Allows requests from any origin
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS') // Allows GET and OPTIONS methods
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization') // Allows specific headers
  next() // Pass control to the next middleware/route handler
})


// Fetches the list of icon names and themed icon information from the GitHub repository.
async function fetchIconMetadata() {
  console.log("Fetching icon metadata from GitHub...")
  try {
    const response = await fetch("https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/tree.json")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const iconsData = await response.json()

    globalIconNameList = iconsData.svg.map(filename =>
      filename.endsWith('.svg') ? filename.slice(0, -4) : filename
    )

    console.log("Icon metadata fetched successfully.")
  } catch (error) {
    console.error("Error fetching icon metadata:", error)
  }
}

// Fetches SVG icon content directly from the GitHub repository, using a cache with TTL.
async function fetchIcons(iconName) {
  const cachedItem = svgContentCache.get(iconName)
  const currentTime = Date.now()

  // 1. Check if item is in cache and has not expired
  if (cachedItem && (currentTime - cachedItem.timestamp < CACHE_TTL)) {
    // console.log(`Serving SVG for ${iconName} from cache (TTL valid)`) // Uncomment for debugging
    return cachedItem.content
  }

  // If item is expired or not in cache, fetch it
  // console.log(`Fetching SVG for ${iconName} from source (cache miss or expired)`) // Uncomment for debugging
  const iconUrl = `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/${iconName}.svg`
  try {
    const response = await fetch(iconUrl)
    if (!response.ok) {
      console.warn(`Failed to fetch SVG for ${iconName}: ${response.status} ${response.statusText}`)
      // If fetch fails, we might still want to return a stale item if it exists,
      // rather than null. For now, we return null as per original logic.
      return null
    }
    const svgStringContent = await response.text()

    // Store the new content with a fresh timestamp
    svgContentCache.set(iconName, {
      content: svgStringContent,
      timestamp: currentTime
    })
    return svgStringContent
  } catch (error) {
    console.error(`Error fetching SVG for ${iconName}:`, error)
    return null
  }
}

// Cleanup the cache every 24 hours
function cleanupCache() {
  const currentTime = Date.now()
  let deletedCount = 0

  for (const [iconName, cachedItem] of svgContentCache) {
    if (currentTime - cachedItem.timestamp >= CACHE_TTL) {
      svgContentCache.delete(iconName)
      deletedCount++
    }
  }
  if (deletedCount > 0) {
    console.log(`cleanupCache: Removed ${deletedCount} expired icons from cache.`)
  }
}

async function generateCombinedSvg(iconNames, maxIconsInRow) {
  const validIconNames = iconNames.filter(name => globalIconNameList.includes(name))

  const backgroundColor = 'rgb(36, 41, 56)'
  const borderRadius = 10
  const effectivePadding = (icon_display_size - icon_content_size) / 2

  const individualIconSVGPromises = validIconNames.map(async name => {
    const svgContent = await fetchIcons(name)

    if (typeof svgContent !== 'string') {
      console.warn(`Skipping icon "${name}" because its SVG content is not a string.`)
      return null
    }

    const $ = cheerio.load(svgContent, { xmlMode: true })
    const $svg = $('svg')

    if ($svg.length === 0) {
      console.warn(`Invalid SVG structure for icon "${name}": Cannot find root <svg> tag.`)
      return null
    }

    // --- Start: Make IDs and CSS Classes unique to prevent clashes ---
    const uniqueSuffix = `_${name.replace(/[^a-zA-Z0-9_-]/g, '')}_${Math.random().toString(36).substring(2, 7)}`

    // 1. Process IDs
    const idMap = new Map()
    $svg.find('[id]').each((i, element) => {
      const $el = $(element)
      const oldId = $el.attr('id')
      const newId = oldId + uniqueSuffix
      $el.attr('id', newId)
      idMap.set(oldId, newId)
    })

    $svg.find('*').each((i, element) => {
      const $el = $(element)
      Object.keys(element.attribs).forEach(attrName => {
        let attrValue = $el.attr(attrName)
        const urlMatch = attrValue.match(/url\(#([^)]+)\)/)
        if (urlMatch) {
          const referencedId = urlMatch[1]
          if (idMap.has(referencedId)) {
            const newReferencedId = idMap.get(referencedId)
            attrValue = attrValue.replace(`#${referencedId}`, `#${newReferencedId}`)
            $el.attr(attrName, attrValue)
          }
        }
        if (attrName === 'xlink:href' && attrValue.startsWith('#')) {
          const referencedId = attrValue.substring(1)
          if (idMap.has(referencedId)) {
            const newReferencedId = idMap.get(referencedId)
            $el.attr(attrName, `#${newReferencedId}`)
          }
        }
      })
    })

    // 2. Process CSS Classes within <style> tags and element class attributes
    $svg.find('style').each((i, styleElement) => {
      let styleContent = $(styleElement).html()
      styleContent = styleContent.replace(/\.([a-zA-Z0-9_-]+)/g, (match, className) => {
        return `.${className}${uniqueSuffix}`
      })
      $(styleElement).html(styleContent)
    })

    // Update class attributes on elements
    $svg.find('[class]').each((i, element) => {
      const $el = $(element)
      const oldClasses = $el.attr('class').split(' ')
      const newClasses = oldClasses.map(cls => `${cls}${uniqueSuffix}`)
      $el.attr('class', newClasses.join(' '))
    })
    // --- End: Make IDs and CSS Classes unique ---

    let originalViewBox = null
    const viewBoxAttr = $svg.attr('viewBox')
    if (viewBoxAttr) {
      originalViewBox = viewBoxAttr
    } else {
      const widthAttr = $svg.attr('width')
      const heightAttr = $svg.attr('height')
      if (widthAttr && heightAttr) {
        const width = parseFloat(widthAttr)
        const height = parseFloat(heightAttr)
        originalViewBox = `0 0 ${width} ${height}`
        console.log(`Info: Icon "${name}" has no viewBox, but width/height found. Using inferred viewBox: "${originalViewBox}"`)
      } else {
        console.warn(`Skipping icon "${name}": Neither viewBox nor width/height attributes found in the SVG. Cannot determine dimensions.`)
        return null
      }
    }

    const svgInnerContent = $svg.html()

    return `
      <svg width="${icon_display_size}" height="${icon_display_size}" viewBox="0 0 ${icon_display_size} ${icon_display_size}">
        <rect x="0" y="0" width="${icon_display_size}" height="${icon_display_size}" rx="${borderRadius}" ry="${borderRadius}" fill="${backgroundColor}"/>
        <svg x="${effectivePadding}" y="${effectivePadding}" width="${icon_content_size}" height="${icon_content_size}" viewBox="${originalViewBox}" preserveAspectRatio="xMidYMid meet">
          ${svgInnerContent}
        </svg>
      </svg>
    `
  })

  const individualIconSVGs = await Promise.all(individualIconSVGPromises)
  const filteredIndividualSVGs = individualIconSVGs.filter(Boolean)

  const numRows = Math.ceil(filteredIndividualSVGs.length / maxIconsInRow)
  const actualMaxCols = Math.min(maxIconsInRow, filteredIndividualSVGs.length)

  const finalWidth = actualMaxCols * icon_display_size + (actualMaxCols > 0 ? (actualMaxCols - 1) * gap : 0)
  const finalHeight = numRows * icon_display_size + (numRows > 0 ? (numRows - 1) * gap : 0)

  let combinedSVGContent = ''
  for (let i = 0; i < filteredIndividualSVGs.length; i++) {
    const col = i % maxIconsInRow
    const row = Math.floor(i / maxIconsInRow)

    const x = col * (icon_display_size + gap)
    const y = row * (icon_display_size + gap)

    combinedSVGContent += `<g transform="translate(${x},${y})">${filteredIndividualSVGs[i]}</g>`
  }

  return `
    <svg width="${finalWidth}" height="${finalHeight}" viewBox="0 0 ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      ${combinedSVGContent}
    </svg>
  `
}


// API ROUTES

// Route for generating and serving combined SVG images. This route is asynchronous because it calls `generateSvg` which performs fetches.
app.get('/icons', async (req, res) => {
  const i = req.query.i // Get icon names from 'i' query parameter
  if (!i) {
    // If no icons are specified, return a 400 Bad Request error
    return res.status(400).send("You didn't specify any icons! Use '?i=icon1,icon2'")
  }

  if (max_icons_in_row < 1 || max_icons_in_row > 50) {
    // Validate perLine parameter
    return res.status(400).send('Icons per line must be a number between 1 and 50')
  }
  // Split the comma-separated icon names to array
  const iSplit = i.split(',').map(name => name)

  try {
    const svgString = await generateCombinedSvg(iSplit, max_icons_in_row)
    res.setHeader('Content-Type', 'image/svg+xml')
    res.send(svgString)
  } catch (error) {
    console.error("Error generating combined SVG:", error)
    res.status(500).send("Error generating image. Please try again later.")
  }
})

// Route for serving the list of all available icon names (API endpoint)
app.get('/api/icons', (req, res) => {
  // Return the global list of icon names as JSON
  res.json(globalIconNameList)
})

// Server Initialization

// app.listen(3000, () => { console.log('Server is listening on port 3000') }) // replaced by ViteExpress
ViteExpress.listen(app, 3000, async () => {
  await fetchIconMetadata()
  console.log("Server is listening on:\n\nhttp://localhost:3000\n\n")

  // Cleanup the cache every 24 hours (adjust as needed)
  setInterval(cleanupCache, 24 * 60 * 60 * 1000) // 24 hours in milliseconds
})
